"""
Unit tests for database models, constraints, and session lifecycles.
"""

import os
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, MetricSnapshot, Alert, get_db


@pytest.fixture
def db_session():
    """Create a temporary in-memory SQLite database session for testing."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_insert_metric_snapshot(db_session):
    snapshot = MetricSnapshot(
        timestamp=datetime.now(timezone.utc),
        cpu_percent=45.5,
        cpu_count=8,
        ram_total_mb=16384.0,
        ram_used_mb=8192.0,
        ram_percent=50.0,
        swap_total_mb=4096.0,
        swap_used_mb=512.0,
        swap_percent=12.5,
        disk_total_gb=500.0,
        disk_used_gb=250.0,
        disk_percent=50.0,
        net_bytes_sent=1024.0,
        net_bytes_recv=2048.0,
        load_avg_1=1.2,
        load_avg_5=1.0,
        load_avg_15=0.8,
    )
    db_session.add(snapshot)
    db_session.commit()

    retrieved = db_session.query(MetricSnapshot).filter_by(id=snapshot.id).first()
    assert retrieved is not None
    assert retrieved.cpu_percent == 45.5
    assert retrieved.swap_total_mb == 4096.0
    assert retrieved.disk_percent == 50.0


def test_insert_alert_and_resolution(db_session):
    alert = Alert(
        timestamp=datetime.now(timezone.utc),
        alert_type="cpu_critical",
        severity="critical",
        message="CPU usage exceeded 95%",
        ai_analysis="Sustained compilation workload detected.",
        telegram_sent="sent",
    )
    db_session.add(alert)
    db_session.commit()

    saved = db_session.query(Alert).filter_by(id=alert.id).first()
    assert saved is not None
    assert saved.is_resolved is False
    assert saved.resolved_at is None

    # Test resolution update
    now = datetime.now(timezone.utc)
    saved.is_resolved = True
    saved.resolved_at = now
    db_session.commit()

    updated = db_session.query(Alert).filter_by(id=alert.id).first()
    assert updated.is_resolved is True
    assert updated.resolved_at is not None


def test_metric_snapshot_time_ordering(db_session):
    now = datetime.now(timezone.utc)
    s1 = MetricSnapshot(
        timestamp=now - timedelta(minutes=5),
        cpu_percent=20.0,
        cpu_count=4,
        ram_total_mb=8000.0,
        ram_used_mb=4000.0,
        ram_percent=50.0,
        disk_total_gb=100.0,
        disk_used_gb=50.0,
        disk_percent=50.0,
        net_bytes_sent=0.0,
        net_bytes_recv=0.0,
    )
    s2 = MetricSnapshot(
        timestamp=now,
        cpu_percent=90.0,
        cpu_count=4,
        ram_total_mb=8000.0,
        ram_used_mb=4000.0,
        ram_percent=50.0,
        disk_total_gb=100.0,
        disk_used_gb=50.0,
        disk_percent=50.0,
        net_bytes_sent=0.0,
        net_bytes_recv=0.0,
    )
    db_session.add_all([s1, s2])
    db_session.commit()

    snapshots = db_session.query(MetricSnapshot).order_by(MetricSnapshot.timestamp.desc()).all()
    assert len(snapshots) == 2
    assert snapshots[0].cpu_percent == 90.0
    assert snapshots[1].cpu_percent == 20.0
