"""
scheduler.py — Background job scheduler for metric collection, AI analysis, and data retention.

Three scheduled jobs:
  1. Metric collection   — every COLLECT_INTERVAL_SECONDS (default: 60s)
  2. AI analysis         — every AI_INTERVAL_SECONDS (default: 300s)
  3. Data retention      — daily at midnight, deletes rows older than RETENTION_DAYS

The scheduler runs on a background thread separate from FastAPI's thread pool.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from .collector import collect_and_save
from .alerting import check_thresholds, send_telegram_alert
from .ai_analyzer import analyze_metrics
from .database import MetricSnapshot, SessionLocal

logger = logging.getLogger(__name__)

COLLECT_INTERVAL = int(os.getenv("COLLECT_INTERVAL_SECONDS", "60"))
AI_INTERVAL = int(os.getenv("AI_INTERVAL_SECONDS", "300"))
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "30"))

_scheduler = BackgroundScheduler()


def is_scheduler_healthy() -> bool:
    """Return True if the scheduler is running. Used by the /readyz endpoint."""
    return _scheduler.running


def _run_collection_job():
    """
    Collect metrics, save to DB, and fire threshold alerts if needed.
    Runs every COLLECT_INTERVAL seconds.
    """
    try:
        snapshot = collect_and_save()

        metrics = {
            "cpu_percent": snapshot.cpu_percent,
            "cpu_count": snapshot.cpu_count,
            "ram_total_mb": snapshot.ram_total_mb,
            "ram_used_mb": snapshot.ram_used_mb,
            "ram_percent": snapshot.ram_percent,
            "disk_total_gb": snapshot.disk_total_gb,
            "disk_used_gb": snapshot.disk_used_gb,
            "disk_percent": snapshot.disk_percent,
        }

        triggered = check_thresholds(metrics)
        for alert in triggered:
            logger.warning(f"Threshold alert: {alert['alert_type']} [{alert['severity']}]")
            asyncio.run(
                send_telegram_alert(
                    alert_type=alert["alert_type"],
                    severity=alert["severity"],
                    message=alert["message"],
                )
            )

    except Exception as e:
        logger.error(f"Collection job failed: {e}")


def _run_ai_analysis_job():
    """
    Ask the AI to analyze recent metric trends and alert if an anomaly is found.
    Runs every AI_INTERVAL seconds.
    """
    try:
        logger.info("Running AI analysis...")
        result = analyze_metrics()

        if result["anomaly_detected"] and result["severity"] != "none":
            logger.warning(
                f"AI anomaly detected [{result['severity']}]: {result['summary']}"
            )
            asyncio.run(
                send_telegram_alert(
                    alert_type="ai_anomaly",
                    severity=result["severity"],
                    message=result["summary"],
                    ai_analysis=(
                        f"{result['analysis']}\n\nRecommended: {result['recommended_action']}"
                    ),
                )
            )
        else:
            logger.info(f"AI analysis: no anomaly — {result['summary']}")

    except Exception as e:
        logger.error(f"AI analysis job failed: {e}")


def _run_retention_job():
    """
    Delete metric snapshots older than RETENTION_DAYS to keep the database bounded.
    Runs daily at midnight.

    Without this, at 60s intervals the DB grows by ~525,000 rows/year.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    db = SessionLocal()
    try:
        deleted = (
            db.query(MetricSnapshot)
            .filter(MetricSnapshot.timestamp < cutoff)
            .delete()
        )
        db.commit()
        logger.info(
            f"Retention: removed {deleted} snapshots older than {RETENTION_DAYS} days"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Retention job failed: {e}")
    finally:
        db.close()


def start_scheduler():
    """Register all jobs and start the scheduler. Called once at FastAPI startup."""
    _scheduler.add_job(
        _run_collection_job,
        trigger=IntervalTrigger(seconds=COLLECT_INTERVAL),
        id="metric_collection",
        name="Collect system metrics",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=30,
    )

    _scheduler.add_job(
        _run_ai_analysis_job,
        trigger=IntervalTrigger(seconds=AI_INTERVAL),
        id="ai_analysis",
        name="AI metric analysis",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=60,
    )

    _scheduler.add_job(
        _run_retention_job,
        trigger=CronTrigger(hour=0, minute=0),  # daily at midnight UTC
        id="retention",
        name="Delete old metrics",
        replace_existing=True,
        max_instances=1,
    )

    _scheduler.start()
    logger.info(
        f"Scheduler started — collecting every {COLLECT_INTERVAL}s, "
        f"AI analysis every {AI_INTERVAL}s, "
        f"retention policy: {RETENTION_DAYS} days"
    )


def stop_scheduler():
    """Gracefully stop the scheduler, waiting for in-flight jobs to finish."""
    if _scheduler.running:
        _scheduler.shutdown(wait=True)  # wait=True prevents mid-write DB corruption
        logger.info("Scheduler stopped")
