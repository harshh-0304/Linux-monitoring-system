"""
Edge-case and error-path tests for FastAPI endpoints.

Covers branches not exercised by test_api.py:
  - /readyz readiness probe (ready + not-ready)
  - 404s on empty data / missing resources
  - query-param validation (422)
  - /alerts severity and resolved filters
"""

from datetime import datetime, timezone, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db, MetricSnapshot, Alert
from app.main import app, _resolve_allowed_origins, _DEFAULT_ORIGINS


def _make_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


def _client_for(engine):
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestingSession


@pytest.fixture
def empty_client():
    """TestClient backed by an empty database (no seeded rows)."""
    engine = _make_engine()
    _client_for(engine)
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def seeded_client():
    """TestClient with one recent snapshot and a mix of alerts."""
    engine = _make_engine()
    TestingSession = _client_for(engine)

    db = TestingSession()
    db.add(
        MetricSnapshot(
            timestamp=datetime.now(timezone.utc),
            cpu_percent=40.0, cpu_count=4,
            ram_total_mb=8000.0, ram_used_mb=4000.0, ram_percent=50.0,
            swap_total_mb=2000.0, swap_used_mb=200.0, swap_percent=10.0,
            disk_total_gb=100.0, disk_used_gb=50.0, disk_percent=50.0,
            net_bytes_sent=100.0, net_bytes_recv=200.0,
            load_avg_1=1.0, load_avg_5=0.8, load_avg_15=0.5,
        )
    )
    now = datetime.now(timezone.utc)
    db.add_all([
        Alert(timestamp=now, alert_type="cpu_high", severity="warning",
              message="CPU 82%", telegram_sent="sent", is_resolved=False),
        Alert(timestamp=now, alert_type="disk_full", severity="critical",
              message="Disk 95%", telegram_sent="sent", is_resolved=True,
              resolved_at=now),
    ])
    db.commit()
    db.close()

    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


# --- CORS allowed-origins resolution ---

def test_allowed_origins_defaults_only():
    assert _resolve_allowed_origins("") == _DEFAULT_ORIGINS
    assert _resolve_allowed_origins(None) == _DEFAULT_ORIGINS


def test_allowed_origins_appends_and_trims_extras():
    result = _resolve_allowed_origins(" https://a.com , https://b.com ,")
    assert result == _DEFAULT_ORIGINS + ["https://a.com", "https://b.com"]


# --- /readyz ---

def test_readyz_ready(seeded_client):
    # Lifespan starts the scheduler and a fresh metric is seeded → ready.
    res = seeded_client.get("/readyz")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ready"
    assert body["scheduler_running"] is True


def test_readyz_not_ready_when_scheduler_down(monkeypatch, seeded_client):
    monkeypatch.setattr("app.main.is_scheduler_healthy", lambda: False)
    res = seeded_client.get("/readyz")
    assert res.status_code == 503
    assert "scheduler is not running" in res.json()["issues"]


def test_readyz_not_ready_when_metric_stale(monkeypatch, seeded_client):
    # Force the only snapshot to look old by freezing "now" far in the future
    # via the age check: patch the interval to 0 so any age > 0 is stale.
    monkeypatch.setenv("COLLECT_INTERVAL_SECONDS", "0")
    res = seeded_client.get("/readyz")
    assert res.status_code == 503
    assert any("old" in issue for issue in res.json()["issues"])


# --- /metrics/current (live OS read, no DB) ---

def test_metrics_current_live_read(empty_client):
    # Reads live from psutil, so it works even with an empty database.
    res = empty_client.get("/metrics/current")
    assert res.status_code == 200
    data = res.json()
    for key in ("cpu_percent", "ram_percent", "disk_percent", "cpu_count"):
        assert key in data
    assert 0.0 <= data["cpu_percent"] <= 100.0


# --- /metrics/latest ---

def test_latest_metric_returns_newest(seeded_client):
    res = seeded_client.get("/metrics/latest")
    assert res.status_code == 200
    assert res.json()["cpu_percent"] == 40.0


def test_latest_metric_404_when_empty(empty_client):
    res = empty_client.get("/metrics/latest")
    assert res.status_code == 404


# --- 404 / empty-data paths ---

def test_stats_404_when_no_data(empty_client):
    res = empty_client.get("/metrics/stats?hours=1")
    assert res.status_code == 404


def test_resolve_missing_alert_404(empty_client):
    res = empty_client.patch("/alerts/999999/resolve")
    assert res.status_code == 404


def test_metrics_empty_returns_empty_list(empty_client):
    res = empty_client.get("/metrics?hours=1")
    assert res.status_code == 200
    assert res.json() == []


# --- /metrics/stats network volume uses configured interval ---

def test_stats_net_volume_scales_with_interval(monkeypatch, seeded_client):
    # Seeded snapshot has net_bytes_sent rate = 100.0 bytes/s.
    # Total volume must scale with COLLECT_INTERVAL_SECONDS, not a hardcoded 60.
    monkeypatch.setenv("COLLECT_INTERVAL_SECONDS", "3600")
    res = seeded_client.get("/metrics/stats?hours=1")
    assert res.status_code == 200
    expected = round(100.0 * 3600 / (1024 ** 2), 2)  # 0.34
    assert res.json()["total_net_sent_mb"] == expected


# --- query-param validation ---

def test_export_invalid_format_422(seeded_client):
    res = seeded_client.get("/metrics/export?format=xml")
    assert res.status_code == 422


def test_processes_invalid_sort_422(seeded_client):
    res = seeded_client.get("/system/processes?sort_by=disk")
    assert res.status_code == 422


def test_metrics_hours_out_of_range_422(seeded_client):
    assert seeded_client.get("/metrics?hours=0").status_code == 422
    assert seeded_client.get("/metrics?hours=999").status_code == 422


# --- pagination (offset) ---

def test_metrics_offset_pagination(seeded_client):
    # Only one snapshot seeded: offset past it yields an empty page.
    first = seeded_client.get("/metrics?hours=1&limit=1&offset=0")
    assert first.status_code == 200
    assert len(first.json()) == 1
    assert seeded_client.get("/metrics?hours=1&offset=1").json() == []


def test_alerts_offset_pagination(seeded_client):
    # Two alerts seeded: limit=1 returns one, offset walks to the next, offset=2 empties.
    page1 = seeded_client.get("/alerts?hours=24&limit=1&offset=0").json()
    page2 = seeded_client.get("/alerts?hours=24&limit=1&offset=1").json()
    assert len(page1) == 1 and len(page2) == 1
    assert page1[0]["id"] != page2[0]["id"]
    assert seeded_client.get("/alerts?hours=24&offset=2").json() == []


def test_negative_offset_422(seeded_client):
    assert seeded_client.get("/metrics?offset=-1").status_code == 422
    assert seeded_client.get("/alerts?offset=-1").status_code == 422


# --- /alerts filters ---

def test_alerts_severity_filter(seeded_client):
    res = seeded_client.get("/alerts?hours=24&severity=critical")
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) == 1
    assert alerts[0]["severity"] == "critical"


def test_alerts_resolved_filter(seeded_client):
    open_res = seeded_client.get("/alerts?hours=24&resolved=false")
    assert open_res.status_code == 200
    assert all(a["is_resolved"] is False for a in open_res.json())

    resolved_res = seeded_client.get("/alerts?hours=24&resolved=true")
    assert resolved_res.status_code == 200
    assert all(a["is_resolved"] is True for a in resolved_res.json())
