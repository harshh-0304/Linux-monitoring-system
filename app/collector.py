"""
collector.py — Reads system metrics using psutil and writes them to the database.

psutil (Process and System Utilities) is a cross-platform library that reads
CPU, memory, disk, network, and process info directly from the OS kernel.
On Linux it reads from /proc and /sys — the virtual filesystems that expose
kernel data to user-space programs.
"""

import time
import logging
from datetime import datetime, timezone

import psutil
from sqlalchemy.orm import Session

from .database import MetricSnapshot, SessionLocal

logger = logging.getLogger(__name__)

# We keep track of the previous network snapshot so we can compute
# bytes-per-second rates. These are module-level variables (simple globals).
_prev_net_bytes_sent: float = 0.0
_prev_net_bytes_recv: float = 0.0
_prev_net_time: float = 0.0


def collect_metrics() -> dict:
    """
    Read current system metrics and return them as a plain dict.

    Returns a dict like:
        {
            "cpu_percent": 23.5,
            "ram_percent": 61.2,
            ...
        }
    """
    global _prev_net_bytes_sent, _prev_net_bytes_recv, _prev_net_time

    # --- CPU ---
    # interval=1 means psutil measures CPU usage over 1 second.
    # Without an interval, it returns usage since the last call (unreliable).
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count(logical=True)

    # Load average: how many processes are waiting for CPU over 1/5/15 minutes.
    # A load of 1.0 per core is "fully loaded". E.g., on a 4-core machine,
    # load_avg_1 > 4.0 means the system is overloaded.
    try:
        load_avg = psutil.getloadavg()  # returns (1min, 5min, 15min)
    except AttributeError:
        # Windows doesn't support getloadavg
        load_avg = (None, None, None)

    # --- Memory ---
    ram = psutil.virtual_memory()
    # psutil gives bytes, we convert to MB for readability
    ram_total_mb = ram.total / (1024 ** 2)
    ram_used_mb = ram.used / (1024 ** 2)
    ram_percent = ram.percent

    # --- Disk (root partition) ---
    disk = psutil.disk_usage("/")
    disk_total_gb = disk.total / (1024 ** 3)
    disk_used_gb = disk.used / (1024 ** 3)
    disk_percent = disk.percent

    # --- Network ---
    # net_io_counters() returns cumulative bytes since the system booted.
    # To get bytes/sec, we compare with the previous reading.
    net = psutil.net_io_counters()
    now = time.time()

    if _prev_net_time > 0:
        elapsed = now - _prev_net_time
        net_bytes_sent_rate = (net.bytes_sent - _prev_net_bytes_sent) / elapsed
        net_bytes_recv_rate = (net.bytes_recv - _prev_net_bytes_recv) / elapsed
    else:
        # First call — no previous snapshot, rate is 0
        net_bytes_sent_rate = 0.0
        net_bytes_recv_rate = 0.0

    # Save current snapshot for next call
    _prev_net_bytes_sent = net.bytes_sent
    _prev_net_bytes_recv = net.bytes_recv
    _prev_net_time = now

    return {
        "timestamp": datetime.now(timezone.utc),
        "cpu_percent": round(cpu_percent, 2),
        "cpu_count": cpu_count,
        "ram_total_mb": round(ram_total_mb, 2),
        "ram_used_mb": round(ram_used_mb, 2),
        "ram_percent": round(ram_percent, 2),
        "disk_total_gb": round(disk_total_gb, 2),
        "disk_used_gb": round(disk_used_gb, 2),
        "disk_percent": round(disk_percent, 2),
        "net_bytes_sent": round(net_bytes_sent_rate, 2),
        "net_bytes_recv": round(net_bytes_recv_rate, 2),
        "load_avg_1": load_avg[0],
        "load_avg_5": load_avg[1],
        "load_avg_15": load_avg[2],
    }


def save_metrics(metrics: dict) -> MetricSnapshot:
    """
    Write a metrics dict to the database and return the saved ORM object.

    We open a new session here (not using the FastAPI dependency) because
    this function is called by the background scheduler, not by a web request.
    """
    db: Session = SessionLocal()
    try:
        snapshot = MetricSnapshot(**metrics)  # unpack dict into model fields
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)  # reload from DB so snapshot.id is populated
        logger.info(
            f"Saved metrics: CPU={metrics['cpu_percent']}% "
            f"RAM={metrics['ram_percent']}% "
            f"Disk={metrics['disk_percent']}%"
        )
        return snapshot
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save metrics: {e}")
        raise
    finally:
        db.close()


def collect_and_save() -> MetricSnapshot:
    """Convenience function: collect + save in one call. Used by scheduler."""
    metrics = collect_metrics()
    return save_metrics(metrics)
