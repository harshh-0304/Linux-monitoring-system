"""
Unit tests for the metric collector functions and rate calculations.
"""

from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
import pytest

from app.collector import collect_metrics, save_metrics
from app.database import init_db, SessionLocal, MetricSnapshot


@pytest.fixture(autouse=True)
def setup_in_memory_db():
    init_db()


def test_collect_metrics_structure():
    metrics = collect_metrics()
    required_keys = [
        "timestamp",
        "cpu_percent",
        "cpu_count",
        "ram_total_mb",
        "ram_used_mb",
        "ram_percent",
        "swap_total_mb",
        "swap_used_mb",
        "swap_percent",
        "disk_total_gb",
        "disk_used_gb",
        "disk_percent",
        "net_bytes_sent",
        "net_bytes_recv",
        "load_avg_1",
        "load_avg_5",
        "load_avg_15",
    ]
    for key in required_keys:
        assert key in metrics, f"Missing key: {key}"


def test_collect_metrics_value_ranges():
    metrics = collect_metrics()
    assert 0.0 <= metrics["cpu_percent"] <= 100.0
    assert 0.0 <= metrics["ram_percent"] <= 100.0
    assert 0.0 <= metrics["disk_percent"] <= 100.0
    assert metrics["cpu_count"] >= 1
    assert metrics["ram_total_mb"] > 0
    assert metrics["disk_total_gb"] > 0


def test_save_metrics_persistence():
    metrics = {
        "timestamp": datetime.now(timezone.utc),
        "cpu_percent": 33.3,
        "cpu_count": 4,
        "ram_total_mb": 8192.0,
        "ram_used_mb": 4096.0,
        "ram_percent": 50.0,
        "swap_total_mb": 2048.0,
        "swap_used_mb": 100.0,
        "swap_percent": 4.88,
        "disk_total_gb": 128.0,
        "disk_used_gb": 64.0,
        "disk_percent": 50.0,
        "net_bytes_sent": 500.0,
        "net_bytes_recv": 1500.0,
        "load_avg_1": 0.5,
        "load_avg_5": 0.4,
        "load_avg_15": 0.3,
    }
    snapshot = save_metrics(metrics)
    assert snapshot.id is not None
    assert snapshot.cpu_percent == 33.3
    assert snapshot.swap_total_mb == 2048.0
