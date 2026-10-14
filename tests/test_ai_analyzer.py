"""
Unit tests for the AI analyzer prompt construction and response parsing.
"""

from datetime import datetime, timezone
import pytest

from app.ai_analyzer import _parse_ai_response, _build_prompt
from app.database import MetricSnapshot


def test_parse_ai_response_valid():
    text = """
    ANOMALY_DETECTED: YES
    SEVERITY: warning
    RISK_LEVEL: medium
    CONFIDENCE_SCORE: 88
    SUMMARY: CPU and memory show an upward trend over the last 10 minutes.
    ANALYSIS: Memory usage climbed from 40% to 75% alongside steady CPU load. Likely a memory leak in background worker.
    RECOMMENDED_ACTION: Inspect process memory with htop and restart worker if growth continues.
    """
    res = _parse_ai_response(text)
    assert res["anomaly_detected"] is True
    assert res["severity"] == "warning"
    assert res["risk_level"] == "medium"
    assert res["confidence_score"] == 88
    assert "CPU and memory" in res["summary"]
    assert "htop" in res["recommended_action"]


def test_parse_ai_response_markdown_bold():
    text = """
    **ANOMALY_DETECTED:** YES
    **SEVERITY:** critical
    **RISK_LEVEL:** critical
    **CONFIDENCE_SCORE:** 95%
    **SUMMARY:** Disk space exhausted on root partition.
    **ANALYSIS:** Root partition crossed 95% capacity.
    **RECOMMENDED_ACTION:** Run ncdu / to find large logs.
    """
    res = _parse_ai_response(text)
    assert res["anomaly_detected"] is True
    assert res["severity"] == "critical"
    assert res["risk_level"] == "critical"
    assert res["confidence_score"] == 95
    assert "Disk space exhausted" in res["summary"]


def test_parse_ai_response_fallback():
    text = "Sorry, I am unable to process this request right now."
    res = _parse_ai_response(text)
    assert res["anomaly_detected"] is False
    assert res["severity"] == "none"
    assert res["risk_level"] == "low"
    assert res["confidence_score"] == 90
    assert res["summary"] == ""


def test_build_prompt():
    snapshots = [
        MetricSnapshot(
            timestamp=datetime.now(timezone.utc),
            cpu_percent=55.0,
            cpu_count=8,
            ram_total_mb=16384.0,
            ram_used_mb=8192.0,
            ram_percent=50.0,
            disk_total_gb=256.0,
            disk_used_gb=128.0,
            disk_percent=50.0,
            load_avg_1=1.5,
        )
    ]
    prompt = _build_prompt(snapshots)
    assert "You are an expert Linux system administrator" in prompt
    assert "CPU:  55.0%" in prompt
    assert "CPU cores: 8" in prompt
    assert "ANOMALY_DETECTED:" in prompt
