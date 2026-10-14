"""
Integration tests for FastAPI endpoints, authentication middleware, and data export.
"""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db, MetricSnapshot, Alert
from app.main import app, _API_KEY


@pytest.fixture
def test_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed data
    db = TestingSession()
    s = MetricSnapshot(
        timestamp=datetime.now(timezone.utc),
        cpu_percent=40.0,
        cpu_count=4,
        ram_total_mb=8000.0,
        ram_used_mb=4000.0,
        ram_percent=50.0,
        swap_total_mb=2000.0,
        swap_used_mb=200.0,
        swap_percent=10.0,
        disk_total_gb=100.0,
        disk_used_gb=50.0,
        disk_percent=50.0,
        net_bytes_sent=100.0,
        net_bytes_recv=200.0,
        load_avg_1=1.0,
        load_avg_5=0.8,
        load_avg_15=0.5,
    )
    a = Alert(
        timestamp=datetime.now(timezone.utc),
        alert_type="cpu_high",
        severity="warning",
        message="CPU reached 82%",
        telegram_sent="sent",
        is_resolved=False,
    )
    db.add_all([s, a])
    db.commit()
    db.close()

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_root_endpoint(test_client):
    res = test_client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_system_info_endpoint(test_client):
    res = test_client.get("/system/info")
    assert res.status_code == 200
    data = res.json()
    assert "hostname" in data
    assert "os_name" in data
    assert "cpu_count_logical" in data
    assert "uptime_seconds" in data


def test_system_processes_endpoint(test_client):
    res = test_client.get("/system/processes?limit=3&sort_by=cpu")
    assert res.status_code == 200
    procs = res.json()
    assert isinstance(procs, list)
    if procs:
        assert "pid" in procs[0]
        assert "cpu_percent" in procs[0]


def test_system_disks_endpoint(test_client):
    res = test_client.get("/system/disks")
    assert res.status_code == 200
    disks = res.json()
    assert isinstance(disks, list)
    if disks:
        assert "mountpoint" in disks[0]
        assert "total_gb" in disks[0]


def test_system_network_endpoint(test_client):
    res = test_client.get("/system/network")
    assert res.status_code == 200
    data = res.json()
    assert "interfaces" in data
    assert "connection_states" in data


def test_metrics_endpoints(test_client):
    res = test_client.get("/metrics?hours=1")
    assert res.status_code == 200
    metrics = res.json()
    assert len(metrics) >= 1
    assert metrics[0]["cpu_percent"] == 40.0

    stats_res = test_client.get("/metrics/stats?hours=1")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["snapshot_count"] >= 1
    assert "min_cpu_percent" in stats
    assert "total_net_sent_mb" in stats


def test_metrics_export(test_client):
    csv_res = test_client.get("/metrics/export?format=csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "timestamp,cpu_percent" in csv_res.text

    json_res = test_client.get("/metrics/export?format=json")
    assert json_res.status_code == 200
    assert isinstance(json_res.json(), list)


def test_alerts_and_resolution(test_client):
    stats_res = test_client.get("/alerts/stats?hours=1")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_alerts"] >= 1
    assert stats["open_alerts"] >= 1

    alerts_res = test_client.get("/alerts?hours=1")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) >= 1
    alert_id = alerts[0]["id"]

    # Resolve alert
    resolve_res = test_client.patch(f"/alerts/{alert_id}/resolve")
    assert resolve_res.status_code == 200
    assert resolve_res.json()["is_resolved"] is True
    assert resolve_res.json()["resolved_at"] is not None


def test_api_key_auth(monkeypatch, test_client):
    monkeypatch.setattr("app.main._API_KEY", "secret-test-token")

    # Open paths should still pass
    assert test_client.get("/").status_code == 200
    assert test_client.get("/docs").status_code == 200

    # OPTIONS request (CORS preflight) should pass
    options_res = test_client.options("/metrics")
    assert options_res.status_code in (200, 405)

    # Missing API key should return 403
    unauth = test_client.get("/metrics")
    assert unauth.status_code == 403

    # Valid API key should pass
    auth = test_client.get("/metrics", headers={"X-API-Key": "secret-test-token"})
    assert auth.status_code == 200
