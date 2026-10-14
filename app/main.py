"""
main.py — FastAPI application: routes, startup/shutdown, and API documentation.

FastAPI is a modern Python web framework built on top of Starlette (async web
toolkit) and Pydantic (data validation). Key features we use:

  - @app.get("/path") — decorator that registers a URL route
  - Depends(get_db) — dependency injection for the database session
  - Response models — Pydantic classes that define the JSON shape returned
  - lifespan — async context manager for startup/shutdown logic

When you run this app, FastAPI auto-generates interactive API docs at:
  http://localhost:8000/docs   (Swagger UI)
  http://localhost:8000/redoc  (ReDoc)
"""

import csv
import io
import logging
import os
import platform
import socket
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

import psutil
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from .database import get_db, init_db, MetricSnapshot, Alert
from .collector import collect_and_save, collect_metrics
from .ai_analyzer import analyze_metrics
from .alerting import send_telegram_alert
from .scheduler import start_scheduler, stop_scheduler, is_scheduler_healthy

# Configure logging to show timestamps and levels
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# --- Pydantic response models ---
# These define the exact JSON structure returned by each endpoint.
# FastAPI validates that our data matches these models before sending responses.

class MetricResponse(BaseModel):
    id: int
    timestamp: datetime
    cpu_percent: float
    cpu_count: int
    ram_total_mb: float
    ram_used_mb: float
    ram_percent: float
    swap_total_mb: Optional[float] = 0.0
    swap_used_mb: Optional[float] = 0.0
    swap_percent: Optional[float] = 0.0
    disk_total_gb: float
    disk_used_gb: float
    disk_percent: float
    net_bytes_sent: float
    net_bytes_recv: float
    load_avg_1: Optional[float]
    load_avg_5: Optional[float]
    load_avg_15: Optional[float]

    # Pydantic v2 config: allow reading from SQLAlchemy ORM objects
    # (not just plain dicts). Without this, Pydantic can't read ORM attributes.
    model_config = {"from_attributes": True}


class AlertResponse(BaseModel):
    id: int
    timestamp: datetime
    alert_type: str
    severity: str
    message: str
    ai_analysis: Optional[str]
    telegram_sent: str
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AlertStatsResponse(BaseModel):
    total_alerts: int
    open_alerts: int
    resolved_alerts: int
    critical_alerts: int
    warning_alerts: int
    alert_types_breakdown: dict[str, int]
    period_hours: int


class StatsResponse(BaseModel):
    avg_cpu_percent: float
    min_cpu_percent: float
    max_cpu_percent: float
    avg_ram_percent: float
    min_ram_percent: float
    max_ram_percent: float
    avg_disk_percent: float
    min_disk_percent: float
    max_disk_percent: float
    total_net_sent_mb: float
    total_net_recv_mb: float
    snapshot_count: int
    period_hours: int


class SystemInfoResponse(BaseModel):
    hostname: str
    os_name: str
    os_version: str
    kernel: str
    architecture: str
    python_version: str
    cpu_count_logical: int
    cpu_count_physical: int
    total_ram_mb: float
    boot_time: str
    uptime_seconds: float


class ProcessInfo(BaseModel):
    pid: int
    name: str
    username: Optional[str] = None
    cpu_percent: float
    memory_percent: float
    status: str
    create_time: Optional[str] = None
    cmdline: Optional[str] = None


class DiskPartitionInfo(BaseModel):
    device: str
    mountpoint: str
    fstype: str
    total_gb: float
    used_gb: float
    free_gb: float
    percent: float


class NetworkInterfaceInfo(BaseModel):
    interface: str
    bytes_sent_mb: float
    bytes_recv_mb: float
    packets_sent: int
    packets_recv: int
    errin: int
    errout: int
    dropin: int
    dropout: int
    addresses: list[str]


class NetworkStatsResponse(BaseModel):
    interfaces: list[NetworkInterfaceInfo]
    total_connections: int
    connection_states: dict[str, int]


# --- Lifespan: startup and shutdown logic ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.

    Code before 'yield' runs at startup.
    Code after 'yield' runs at shutdown.

    This is the modern replacement for @app.on_event("startup").
    """
    logger.info("Starting up Linux Monitoring System...")
    init_db()           # Create database tables if they don't exist
    start_scheduler()   # Start background metric collection
    logger.info("Startup complete")

    yield  # Application runs here — handles requests

    logger.info("Shutting down...")
    stop_scheduler()    # Gracefully stop background jobs
    logger.info("Shutdown complete")


# --- FastAPI app instance ---

app = FastAPI(
    title="Linux Server Monitor",
    description=(
        "AI-powered Linux server monitoring system. "
        "Collects CPU, RAM, Disk, and Network metrics. "
        "Uses Gemini AI for anomaly detection. "
        "Sends Telegram alerts."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS middleware ──
# Allow the Next.js frontend (localhost:3000) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://monitoring-dashboard-production-eb4c.up.railway.app",
        "https://resilient-perfection-production-3d3e.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Key authentication ────────────────────────────────────────────────────
# Set API_KEY in .env to require authentication on all endpoints.
# Requests must include the header:  X-API-Key: <your-key>
# Health check paths are always open (no key needed).
_API_KEY = os.getenv("API_KEY", "")
_OPEN_PATHS = {"/", "/readyz", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    # Allow CORS preflight requests and open paths without API key
    if request.method == "OPTIONS" or not _API_KEY or request.url.path in _OPEN_PATHS:
        return await call_next(request)
    key = request.headers.get("X-API-Key", "")
    if key != _API_KEY:
        return JSONResponse(
            status_code=403,
            content={"detail": "Invalid or missing API key. Add header: X-API-Key: <key>"},
        )
    return await call_next(request)


# ============================================================
# Routes
# ============================================================

@app.get("/", summary="Health check")
def root():
    """Simple health check — confirms the server is running."""
    return {"status": "ok", "service": "Linux Server Monitor"}


@app.get("/readyz", summary="Readiness check — confirms scheduler is healthy")
def readyz(db: Session = Depends(get_db)):
    """
    Readiness probe for orchestrators (Docker healthcheck, Kubernetes).

    Returns 200 if the scheduler is running and metrics are being collected.
    Returns 503 with a list of issues if anything is wrong.

    Unlike the root '/' which only checks if the process is alive, this
    endpoint checks that the system is actually doing useful work.
    """
    issues = []
    age_seconds = None
    collect_interval = int(os.getenv("COLLECT_INTERVAL_SECONDS", "60"))

    if not is_scheduler_healthy():
        issues.append("scheduler is not running")

    recent = db.query(MetricSnapshot).order_by(desc(MetricSnapshot.timestamp)).first()
    if recent:
        ts = recent.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        age_seconds = (datetime.now(timezone.utc) - ts).total_seconds()
        if age_seconds > collect_interval * 3:
            issues.append(
                f"last metric is {age_seconds:.0f}s old "
                f"(expected < {collect_interval * 3}s)"
            )

    if issues:
        return JSONResponse(status_code=503, content={"status": "not ready", "issues": issues})

    return {
        "status": "ready",
        "scheduler_running": True,
        "last_metric_age_seconds": round(age_seconds, 1) if age_seconds is not None else None,
    }


@app.get("/metrics/current", summary="Get current live metrics")
def get_current_metrics():
    """
    Read live metrics directly from the OS right now (not from DB).
    Useful for dashboards that need real-time data.
    """
    metrics = collect_metrics()
    return metrics


@app.get(
    "/metrics",
    response_model=list[MetricResponse],
    summary="Get historical metrics",
)
def get_metrics(
    hours: int = Query(default=1, ge=1, le=168, description="How many hours of history to return"),
    limit: int = Query(default=100, ge=1, le=1000, description="Max number of records"),
    db: Session = Depends(get_db),
):
    """
    Return the last N hours of metric snapshots from the database.

    Query parameters:
    - **hours**: How far back to look (1–168 hours = up to 1 week)
    - **limit**: Maximum rows to return (1–1000)
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    snapshots = (
        db.query(MetricSnapshot)
        .filter(MetricSnapshot.timestamp >= since)
        .order_by(desc(MetricSnapshot.timestamp))
        .limit(limit)
        .all()
    )
    return snapshots


@app.get(
    "/metrics/stats",
    response_model=StatsResponse,
    summary="Get aggregated statistics",
)
def get_stats(
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    """
    Return min/max/avg statistics for a time period.
    Useful for dashboards and summary reports.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    # SQLAlchemy aggregate functions — these generate SQL like:
    # SELECT AVG(cpu_percent), MAX(cpu_percent) FROM metric_snapshots WHERE ...
    result = db.query(
        func.avg(MetricSnapshot.cpu_percent).label("avg_cpu"),
        func.min(MetricSnapshot.cpu_percent).label("min_cpu"),
        func.max(MetricSnapshot.cpu_percent).label("max_cpu"),
        func.avg(MetricSnapshot.ram_percent).label("avg_ram"),
        func.min(MetricSnapshot.ram_percent).label("min_ram"),
        func.max(MetricSnapshot.ram_percent).label("max_ram"),
        func.avg(MetricSnapshot.disk_percent).label("avg_disk"),
        func.min(MetricSnapshot.disk_percent).label("min_disk"),
        func.max(MetricSnapshot.disk_percent).label("max_disk"),
        func.sum(MetricSnapshot.net_bytes_sent).label("sum_net_sent"),
        func.sum(MetricSnapshot.net_bytes_recv).label("sum_net_recv"),
        func.count(MetricSnapshot.id).label("count"),
    ).filter(MetricSnapshot.timestamp >= since).first()

    if not result or result.count == 0:
        raise HTTPException(status_code=404, detail="No data found for the specified period")

    # Bytes per second summed across collection cycles to approximate total volume in MB
    total_net_sent_mb = round(((result.sum_net_sent or 0.0) * 60) / (1024 ** 2), 2)
    total_net_recv_mb = round(((result.sum_net_recv or 0.0) * 60) / (1024 ** 2), 2)

    return StatsResponse(
        avg_cpu_percent=round(result.avg_cpu or 0, 2),
        min_cpu_percent=round(result.min_cpu or 0, 2),
        max_cpu_percent=round(result.max_cpu or 0, 2),
        avg_ram_percent=round(result.avg_ram or 0, 2),
        min_ram_percent=round(result.min_ram or 0, 2),
        max_ram_percent=round(result.max_ram or 0, 2),
        avg_disk_percent=round(result.avg_disk or 0, 2),
        min_disk_percent=round(result.min_disk or 0, 2),
        max_disk_percent=round(result.max_disk or 0, 2),
        total_net_sent_mb=total_net_sent_mb,
        total_net_recv_mb=total_net_recv_mb,
        snapshot_count=result.count,
        period_hours=hours,
    )


@app.get("/metrics/export", summary="Export metrics snapshots to CSV or JSON")
def export_metrics(
    hours: int = Query(default=24, ge=1, le=168, description="Timeframe to export"),
    format: str = Query(default="csv", pattern="^(csv|json)$", description="Export format: 'csv' or 'json'"),
    db: Session = Depends(get_db),
):
    """
    Download historical system metrics formatted as CSV or JSON file
    for external spreadsheets, incident audits, or archiving.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    snapshots = (
        db.query(MetricSnapshot)
        .filter(MetricSnapshot.timestamp >= since)
        .order_by(MetricSnapshot.timestamp.asc())
        .all()
    )

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if format == "json":
        data = [
            {
                "id": s.id,
                "timestamp": s.timestamp.isoformat(),
                "cpu_percent": s.cpu_percent,
                "cpu_count": s.cpu_count,
                "ram_total_mb": s.ram_total_mb,
                "ram_used_mb": s.ram_used_mb,
                "ram_percent": s.ram_percent,
                "disk_total_gb": s.disk_total_gb,
                "disk_used_gb": s.disk_used_gb,
                "disk_percent": s.disk_percent,
                "net_bytes_sent": s.net_bytes_sent,
                "net_bytes_recv": s.net_bytes_recv,
                "load_avg_1": s.load_avg_1,
                "load_avg_5": s.load_avg_5,
                "load_avg_15": s.load_avg_15,
            }
            for s in snapshots
        ]
        return JSONResponse(
            content=data,
            headers={"Content-Disposition": f"attachment; filename=metrics_{timestamp_str}.json"},
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "timestamp", "cpu_percent", "cpu_count", "ram_total_mb", "ram_used_mb",
        "ram_percent", "disk_total_gb", "disk_used_gb", "disk_percent",
        "net_bytes_sent", "net_bytes_recv", "load_avg_1", "load_avg_5", "load_avg_15"
    ])

    for s in snapshots:
        writer.writerow([
            s.timestamp.isoformat(),
            s.cpu_percent,
            s.cpu_count,
            s.ram_total_mb,
            s.ram_used_mb,
            s.ram_percent,
            s.disk_total_gb,
            s.disk_used_gb,
            s.disk_percent,
            s.net_bytes_sent,
            s.net_bytes_recv,
            s.load_avg_1,
            s.load_avg_5,
            s.load_avg_15,
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=metrics_{timestamp_str}.csv"},
    )


@app.get(
    "/alerts",
    response_model=list[AlertResponse],
    summary="Get alert history",
)
def get_alerts(
    hours: int = Query(default=24, ge=1, le=168),
    severity: Optional[str] = Query(default=None, description="Filter by severity: warning or critical"),
    resolved: Optional[bool] = Query(default=None, description="Filter by resolution status"),
    db: Session = Depends(get_db),
):
    """Return the alert history for the specified time period."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    query = (
        db.query(Alert)
        .filter(Alert.timestamp >= since)
        .order_by(desc(Alert.timestamp))
    )
    if severity:
        query = query.filter(Alert.severity == severity)
    if resolved is not None:
        query = query.filter(Alert.is_resolved == resolved)
    return query.limit(100).all()


@app.patch(
    "/alerts/{alert_id}/resolve",
    response_model=AlertResponse,
    summary="Mark an alert as resolved",
)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """
    Mark an active or triggered alert as resolved, recording the timestamp.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return alert


@app.get(
    "/alerts/stats",
    response_model=AlertStatsResponse,
    summary="Get alert triage and distribution statistics",
)
def get_alert_stats(
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    """
    Return high-level summary of triggered alerts, resolution rate,
    and frequency breakdown by severity and alert category.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    alerts = db.query(Alert).filter(Alert.timestamp >= since).all()

    total = len(alerts)
    resolved = sum(1 for a in alerts if a.is_resolved)
    open_count = total - resolved
    critical = sum(1 for a in alerts if a.severity == "critical")
    warning = sum(1 for a in alerts if a.severity == "warning")

    breakdown: dict[str, int] = {}
    for a in alerts:
        breakdown[a.alert_type] = breakdown.get(a.alert_type, 0) + 1

    return AlertStatsResponse(
        total_alerts=total,
        open_alerts=open_count,
        resolved_alerts=resolved,
        critical_alerts=critical,
        warning_alerts=warning,
        alert_types_breakdown=breakdown,
        period_hours=hours,
    )


@app.post("/metrics/collect", summary="Manually trigger a metric collection")
def trigger_collection():
    """
    Force an immediate metric collection and save to the database.
    Useful for testing or getting an instant snapshot.
    """
    snapshot = collect_and_save()
    return {
        "message": "Metrics collected",
        "snapshot_id": snapshot.id,
        "cpu_percent": snapshot.cpu_percent,
        "ram_percent": snapshot.ram_percent,
        "disk_percent": snapshot.disk_percent,
    }


@app.post("/ai/analyze", summary="Manually trigger AI analysis")
def trigger_ai_analysis(db: Session = Depends(get_db)):
    """
    Force an immediate AI analysis of recent metrics.
    Returns the full analysis result including Claude's reasoning.
    """
    result = analyze_metrics(db)
    return result


@app.post("/alerts/test", summary="Send a test Telegram alert")
async def send_test_alert():
    """
    Send a test message to Telegram to verify your bot token and chat ID are correct.
    Use this after setting up your .env file.
    """
    success = await send_telegram_alert(
        alert_type="test",
        severity="warning",
        message="This is a test alert from your Linux Monitoring System. If you see this, Telegram alerts are working correctly!",
    )
    if success:
        return {"status": "sent", "message": "Test alert delivered to Telegram"}
    return JSONResponse(
        status_code=503,
        content={"status": "failed", "message": "Could not send alert — check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your .env file"},
    )


@app.get(
    "/system/info",
    response_model=SystemInfoResponse,
    summary="Get system hardware and host metadata",
)
def get_system_info():
    """
    Return static host environment details and hardware specs:
    OS distribution, kernel version, CPU cores, uptime, and total RAM.
    """
    boot_timestamp = psutil.boot_time()
    boot_dt = datetime.fromtimestamp(boot_timestamp, tz=timezone.utc)
    uptime = time.time() - boot_timestamp
    ram = psutil.virtual_memory()

    return SystemInfoResponse(
        hostname=socket.gethostname(),
        os_name=platform.system(),
        os_version=platform.version() or platform.platform(),
        kernel=platform.release(),
        architecture=platform.machine(),
        python_version=platform.python_version(),
        cpu_count_logical=psutil.cpu_count(logical=True) or 1,
        cpu_count_physical=psutil.cpu_count(logical=False) or psutil.cpu_count(logical=True) or 1,
        total_ram_mb=round(ram.total / (1024 ** 2), 2),
        boot_time=boot_dt.isoformat(),
        uptime_seconds=round(uptime, 1),
    )


@app.get(
    "/system/processes",
    response_model=list[ProcessInfo],
    summary="Get top running processes by CPU or memory usage",
)
def get_top_processes(
    sort_by: str = Query(default="cpu", pattern="^(cpu|memory)$", description="Sort by 'cpu' or 'memory'"),
    limit: int = Query(default=10, ge=1, le=50, description="Max number of processes to return"),
):
    """
    List top active system processes sorted by CPU or memory consumption.
    Useful for identifying resource bottlenecks and runaway workloads.
    """
    procs = []
    for p in psutil.process_iter(["pid", "name", "username", "cpu_percent", "memory_percent", "status", "create_time", "cmdline"]):
        try:
            info = p.info
            cmdline = " ".join(info.get("cmdline") or [])
            if len(cmdline) > 120:
                cmdline = cmdline[:117] + "..."
            created = ""
            if info.get("create_time"):
                created = datetime.fromtimestamp(info["create_time"], tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

            procs.append(
                ProcessInfo(
                    pid=info["pid"],
                    name=info.get("name") or "unknown",
                    username=info.get("username"),
                    cpu_percent=round(info.get("cpu_percent") or 0.0, 2),
                    memory_percent=round(info.get("memory_percent") or 0.0, 2),
                    status=info.get("status") or "running",
                    create_time=created or None,
                    cmdline=cmdline or None,
                )
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    sort_key = "cpu_percent" if sort_by == "cpu" else "memory_percent"
    procs.sort(key=lambda x: getattr(x, sort_key), reverse=True)
    return procs[:limit]


@app.get(
    "/system/disks",
    response_model=list[DiskPartitionInfo],
    summary="Get multi-partition filesystem storage breakdown",
)
def get_disk_partitions():
    """
    Scan mounted filesystems and report mountpoint, filesystem type,
    used, free, and total capacity in GB.
    """
    partitions = []
    seen_mounts = set()
    for part in psutil.disk_partitions(all=False):
        if part.mountpoint in seen_mounts:
            continue
        seen_mounts.add(part.mountpoint)
        try:
            usage = psutil.disk_usage(part.mountpoint)
            partitions.append(
                DiskPartitionInfo(
                    device=part.device,
                    mountpoint=part.mountpoint,
                    fstype=part.fstype,
                    total_gb=round(usage.total / (1024 ** 3), 2),
                    used_gb=round(usage.used / (1024 ** 3), 2),
                    free_gb=round(usage.free / (1024 ** 3), 2),
                    percent=usage.percent,
                )
            )
        except (PermissionError, OSError):
            continue
    return partitions


@app.get(
    "/system/network",
    response_model=NetworkStatsResponse,
    summary="Get network interfaces and socket connections breakdown",
)
def get_network_details():
    """
    Return per-interface cumulative traffic stats, IP addresses, packet drops,
    and socket connection state counters.
    """
    io_counters = psutil.net_io_counters(pernic=True)
    if_addrs = psutil.net_if_addrs()

    interfaces = []
    for iface, io in io_counters.items():
        addrs = []
        if iface in if_addrs:
            for snic in if_addrs[iface]:
                if snic.address:
                    addrs.append(snic.address)

        interfaces.append(
            NetworkInterfaceInfo(
                interface=iface,
                bytes_sent_mb=round(io.bytes_sent / (1024 ** 2), 2),
                bytes_recv_mb=round(io.bytes_recv / (1024 ** 2), 2),
                packets_sent=io.packets_sent,
                packets_recv=io.packets_recv,
                errin=io.errin,
                errout=io.errout,
                dropin=io.dropin,
                dropout=io.dropout,
                addresses=addrs,
            )
        )

    states: dict[str, int] = {}
    total_conns = 0
    try:
        conns = psutil.net_connections(kind="inet")
        total_conns = len(conns)
        for c in conns:
            status = c.status or "NONE"
            states[status] = states.get(status, 0) + 1
    except (psutil.AccessDenied, PermissionError):
        # Fall back if process doesn't have privileges to read all sockets
        states = {"RESTRICTED": 1}

    return NetworkStatsResponse(
        interfaces=interfaces,
        total_connections=total_conns,
        connection_states=states,
    )
