"""
Unit tests for alert rule evaluation, message formatting, and cooldown deduplication.
"""

from datetime import datetime, timezone, timedelta
import pytest

from app.alerting import (
    check_thresholds,
    _format_message,
    _is_on_cooldown,
    _mark_sent,
    _alert_cooldowns,
    CPU_WARN_THRESHOLD,
    CPU_CRIT_THRESHOLD,
)


@pytest.fixture(autouse=True)
def clear_cooldowns():
    _alert_cooldowns.clear()
    yield
    _alert_cooldowns.clear()


def test_check_thresholds_healthy():
    metrics = {
        "cpu_percent": 25.0,
        "ram_percent": 40.0,
        "ram_used_mb": 4000.0,
        "disk_percent": 50.0,
        "disk_used_gb": 100.0,
        "disk_total_gb": 200.0,
    }
    alerts = check_thresholds(metrics)
    assert len(alerts) == 0


def test_check_thresholds_warning():
    metrics = {
        "cpu_percent": CPU_WARN_THRESHOLD + 1,
        "ram_percent": 30.0,
        "ram_used_mb": 3000.0,
        "disk_percent": 20.0,
        "disk_used_gb": 20.0,
        "disk_total_gb": 100.0,
    }
    alerts = check_thresholds(metrics)
    assert len(alerts) == 1
    assert alerts[0]["alert_type"] == "cpu_high"
    assert alerts[0]["severity"] == "warning"


def test_check_thresholds_critical():
    metrics = {
        "cpu_percent": CPU_CRIT_THRESHOLD + 1,
        "ram_percent": 96.0,
        "ram_used_mb": 9600.0,
        "disk_percent": 97.0,
        "disk_used_gb": 97.0,
        "disk_total_gb": 100.0,
    }
    alerts = check_thresholds(metrics)
    assert len(alerts) == 3
    types = {a["alert_type"] for a in alerts}
    assert types == {"cpu_critical", "ram_critical", "disk_critical"}
    for a in alerts:
        assert a["severity"] == "critical"


def test_check_thresholds_empty_dict_no_crash():
    # A missing/partial metrics dict must not raise KeyError.
    assert check_thresholds({}) == []


def test_check_thresholds_partial_dict():
    # Only CPU present and critical; missing ram/disk keys default to safe values.
    alerts = check_thresholds({"cpu_percent": CPU_CRIT_THRESHOLD + 1})
    assert len(alerts) == 1
    assert alerts[0]["alert_type"] == "cpu_critical"


def test_format_message():
    msg = _format_message(
        alert_type="cpu_critical",
        severity="critical",
        message="CPU is at 99%",
        ai_analysis="Process runaway detected.",
    )
    assert "[CRITICAL] Linux Server Alert" in msg
    assert "Type: cpu_critical" in msg
    assert "CPU is at 99%" in msg
    assert "AI Analysis:" in msg
    assert "Process runaway detected." in msg


def test_cooldown_deduplication():
    alert_type = "cpu_high"
    assert _is_on_cooldown(alert_type) is False

    _mark_sent(alert_type)
    assert _is_on_cooldown(alert_type) is True

    # Simulate expired cooldown
    _alert_cooldowns[alert_type] = datetime.now(timezone.utc) - timedelta(seconds=1000)
    assert _is_on_cooldown(alert_type) is False
