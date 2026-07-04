"""
alerting.py — Sends alert messages to Telegram.

How Telegram bots work:
  1. You create a bot via @BotFather → you get a BOT_TOKEN
  2. You add the bot to a group, or start a DM with it → you get a CHAT_ID
  3. You POST to https://api.telegram.org/bot{TOKEN}/sendMessage with JSON body
  4. Telegram delivers the message

Alert deduplication:
  Each alert type has a cooldown period. If the same alert fires again within
  ALERT_COOLDOWN_SECONDS, the Telegram message is suppressed but the event is
  still logged to the database as 'suppressed'. This prevents flooding when a
  metric is sustained at a high level (e.g. CPU at 85% for 30 minutes would
  otherwise send 30 alerts — one per collection cycle).
"""

import os
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from .database import Alert, SessionLocal

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# How long to suppress duplicate alerts for the same alert_type (default: 15 min).
# Example: if CPU is high for 30 minutes, only 2 alerts fire instead of 30.
ALERT_COOLDOWN_SECONDS = int(os.getenv("ALERT_COOLDOWN_SECONDS", "900"))

# In-memory cooldown tracker: alert_type → last time an alert was successfully sent.
# This resets on container restart, which is acceptable — a fresh start should alert.
_alert_cooldowns: dict[str, datetime] = {}


def _is_on_cooldown(alert_type: str) -> bool:
    """Return True if this alert type was sent recently and should be suppressed."""
    last = _alert_cooldowns.get(alert_type)
    if last is None:
        return False
    return (datetime.now(timezone.utc) - last).total_seconds() < ALERT_COOLDOWN_SECONDS


def _mark_sent(alert_type: str) -> None:
    """Record that this alert type was just sent, starting its cooldown."""
    _alert_cooldowns[alert_type] = datetime.now(timezone.utc)


def _format_message(alert_type: str, severity: str, message: str, ai_analysis: str = "") -> str:
    """Build a readable Telegram message."""
    severity_label = {"warning": "WARNING", "critical": "CRITICAL"}.get(severity, severity.upper())

    lines = [
        f"[{severity_label}] Linux Server Alert",
        "",
        f"Type: {alert_type}",
        f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC",
        "",
        "Details:",
        message,
    ]

    if ai_analysis:
        lines += ["", "AI Analysis:", ai_analysis]

    return "\n".join(lines)


async def send_telegram_alert(
    alert_type: str,
    severity: str,
    message: str,
    ai_analysis: str = "",
) -> bool:
    """
    Send a Telegram message and record the alert in the database.

    Alerts on cooldown are logged to DB as 'suppressed' but not sent to Telegram.
    Returns True if a message was actually sent, False otherwise.
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("Telegram credentials not configured — skipping alert")
        return False

    # Deduplicate: suppress if same alert type fired recently
    if _is_on_cooldown(alert_type):
        last = _alert_cooldowns[alert_type]
        remaining = ALERT_COOLDOWN_SECONDS - (datetime.now(timezone.utc) - last).total_seconds()
        logger.info(
            f"Alert '{alert_type}' suppressed — cooldown active ({remaining:.0f}s remaining)"
        )
        _save_alert(alert_type, severity, message, ai_analysis, "suppressed")
        return False

    text = _format_message(alert_type, severity, message, ai_analysis)
    # Token in path is Telegram's API design — we avoid putting it in logs
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    telegram_sent = "failed"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            )
            if response.status_code == 200:
                telegram_sent = "sent"
                _mark_sent(alert_type)
                logger.info(f"Telegram alert sent: {alert_type} [{severity}]")
            else:
                logger.error(f"Telegram API error {response.status_code}: {response.text}")
    except httpx.TimeoutException:
        logger.error("Telegram request timed out")
    except Exception as e:
        logger.error(f"Failed to send Telegram alert: {e}")

    _save_alert(alert_type, severity, message, ai_analysis, telegram_sent)
    return telegram_sent == "sent"


def _save_alert(
    alert_type: str,
    severity: str,
    message: str,
    ai_analysis: str,
    telegram_sent: str,
) -> None:
    """Write the alert record to the database."""
    db: Session = SessionLocal()
    try:
        alert = Alert(
            alert_type=alert_type,
            severity=severity,
            message=message,
            ai_analysis=ai_analysis or None,
            telegram_sent=telegram_sent,
        )
        db.add(alert)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save alert to DB: {e}")
    finally:
        db.close()


def check_thresholds(metrics: dict) -> list[dict]:
    """
    Apply simple rule-based threshold checks to a metrics snapshot.

    Returns a list of triggered alerts (may be empty).
    These are 'dumb' rules — the AI analyzer does smarter pattern detection.
    Both complement each other: rules fire instantly, AI fires after trend analysis.
    """
    alerts = []

    # CPU thresholds
    if metrics["cpu_percent"] >= 95:
        alerts.append({
            "alert_type": "cpu_critical",
            "severity": "critical",
            "message": f"CPU usage is at {metrics['cpu_percent']}% (threshold: 95%)",
        })
    elif metrics["cpu_percent"] >= 80:
        alerts.append({
            "alert_type": "cpu_high",
            "severity": "warning",
            "message": f"CPU usage is at {metrics['cpu_percent']}% (threshold: 80%)",
        })

    # RAM thresholds
    if metrics["ram_percent"] >= 95:
        alerts.append({
            "alert_type": "ram_critical",
            "severity": "critical",
            "message": f"RAM usage is at {metrics['ram_percent']}% ({metrics['ram_used_mb']:.0f} MB used)",
        })
    elif metrics["ram_percent"] >= 85:
        alerts.append({
            "alert_type": "ram_high",
            "severity": "warning",
            "message": f"RAM usage is at {metrics['ram_percent']}% ({metrics['ram_used_mb']:.0f} MB used)",
        })

    # Disk thresholds
    if metrics["disk_percent"] >= 95:
        alerts.append({
            "alert_type": "disk_critical",
            "severity": "critical",
            "message": f"Disk usage is at {metrics['disk_percent']}% ({metrics['disk_used_gb']:.1f} GB / {metrics['disk_total_gb']:.1f} GB)",
        })
    elif metrics["disk_percent"] >= 85:
        alerts.append({
            "alert_type": "disk_high",
            "severity": "warning",
            "message": f"Disk usage is at {metrics['disk_percent']}% ({metrics['disk_used_gb']:.1f} GB / {metrics['disk_total_gb']:.1f} GB)",
        })

    return alerts
