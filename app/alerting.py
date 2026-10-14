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
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

# How long to suppress duplicate alerts for the same alert_type (default: 15 min).
# Example: if CPU is high for 30 minutes, only 2 alerts fire instead of 30.
ALERT_COOLDOWN_SECONDS = int(os.getenv("ALERT_COOLDOWN_SECONDS", "900"))

# Threshold limits (configurable via environment variables)
CPU_WARN_THRESHOLD = float(os.getenv("CPU_WARN_THRESHOLD", "80.0"))
CPU_CRIT_THRESHOLD = float(os.getenv("CPU_CRIT_THRESHOLD", "95.0"))
RAM_WARN_THRESHOLD = float(os.getenv("RAM_WARN_THRESHOLD", "85.0"))
RAM_CRIT_THRESHOLD = float(os.getenv("RAM_CRIT_THRESHOLD", "95.0"))
DISK_WARN_THRESHOLD = float(os.getenv("DISK_WARN_THRESHOLD", "85.0"))
DISK_CRIT_THRESHOLD = float(os.getenv("DISK_CRIT_THRESHOLD", "95.0"))

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


async def _send_slack_webhook(text: str) -> bool:
    """Send alert notification payload to Slack webhook URL if configured."""
    if not SLACK_WEBHOOK_URL:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(SLACK_WEBHOOK_URL, json={"text": text})
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Slack webhook: {e}")
        return False


async def _send_discord_webhook(alert_type: str, severity: str, message: str, ai_analysis: str = "") -> bool:
    """Send formatted alert embed to Discord webhook URL if configured."""
    if not DISCORD_WEBHOOK_URL:
        return False
    color = 0xFF0000 if severity == "critical" else 0xFFA500
    embed = {
        "title": f"[{severity.upper()}] Linux Server Alert: {alert_type}",
        "description": message,
        "color": color,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fields": [],
    }
    if ai_analysis:
        embed["fields"].append({"name": "AI Analysis", "value": ai_analysis[:1024], "inline": False})
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(DISCORD_WEBHOOK_URL, json={"embeds": [embed]})
            return resp.status_code in (200, 204)
    except Exception as e:
        logger.error(f"Failed to send Discord webhook: {e}")
        return False


async def send_telegram_alert(
    alert_type: str,
    severity: str,
    message: str,
    ai_analysis: str = "",
) -> bool:
    """
    Send alert to configured channels (Telegram, Slack, Discord) and record in DB.
    Alerts on cooldown are logged to DB as 'suppressed' but not sent.
    """
    has_channels = bool((TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID) or SLACK_WEBHOOK_URL or DISCORD_WEBHOOK_URL)
    if not has_channels:
        logger.warning("No notification channels configured — recording alert in DB only")

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
    delivery_status = "failed" if has_channels else "pending"

    # 1. Telegram
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    url,
                    json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
                )
                if response.status_code == 200:
                    delivery_status = "sent"
                    logger.info(f"Telegram alert sent: {alert_type} [{severity}]")
                else:
                    logger.error(f"Telegram API error {response.status_code}: {response.text}")
        except httpx.TimeoutException:
            logger.error("Telegram request timed out")
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")

    # 2. Slack
    if SLACK_WEBHOOK_URL:
        slack_ok = await _send_slack_webhook(text)
        if slack_ok:
            delivery_status = "sent"
            logger.info(f"Slack webhook sent: {alert_type}")

    # 3. Discord
    if DISCORD_WEBHOOK_URL:
        discord_ok = await _send_discord_webhook(alert_type, severity, message, ai_analysis)
        if discord_ok:
            delivery_status = "sent"
            logger.info(f"Discord webhook sent: {alert_type}")

    if delivery_status == "sent":
        _mark_sent(alert_type)

    _save_alert(alert_type, severity, message, ai_analysis, delivery_status)
    return delivery_status == "sent"


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
    if metrics["cpu_percent"] >= CPU_CRIT_THRESHOLD:
        alerts.append({
            "alert_type": "cpu_critical",
            "severity": "critical",
            "message": f"CPU usage is at {metrics['cpu_percent']}% (threshold: {CPU_CRIT_THRESHOLD}%)",
        })
    elif metrics["cpu_percent"] >= CPU_WARN_THRESHOLD:
        alerts.append({
            "alert_type": "cpu_high",
            "severity": "warning",
            "message": f"CPU usage is at {metrics['cpu_percent']}% (threshold: {CPU_WARN_THRESHOLD}%)",
        })

    # RAM thresholds
    if metrics["ram_percent"] >= RAM_CRIT_THRESHOLD:
        alerts.append({
            "alert_type": "ram_critical",
            "severity": "critical",
            "message": f"RAM usage is at {metrics['ram_percent']}% ({metrics['ram_used_mb']:.0f} MB used, threshold: {RAM_CRIT_THRESHOLD}%)",
        })
    elif metrics["ram_percent"] >= RAM_WARN_THRESHOLD:
        alerts.append({
            "alert_type": "ram_high",
            "severity": "warning",
            "message": f"RAM usage is at {metrics['ram_percent']}% ({metrics['ram_used_mb']:.0f} MB used, threshold: {RAM_WARN_THRESHOLD}%)",
        })

    # Disk thresholds
    if metrics["disk_percent"] >= DISK_CRIT_THRESHOLD:
        alerts.append({
            "alert_type": "disk_critical",
            "severity": "critical",
            "message": f"Disk usage is at {metrics['disk_percent']}% ({metrics['disk_used_gb']:.1f} GB / {metrics['disk_total_gb']:.1f} GB, threshold: {DISK_CRIT_THRESHOLD}%)",
        })
    elif metrics["disk_percent"] >= DISK_WARN_THRESHOLD:
        alerts.append({
            "alert_type": "disk_high",
            "severity": "warning",
            "message": f"Disk usage is at {metrics['disk_percent']}% ({metrics['disk_used_gb']:.1f} GB / {metrics['disk_total_gb']:.1f} GB, threshold: {DISK_WARN_THRESHOLD}%)",
        })

    return alerts
