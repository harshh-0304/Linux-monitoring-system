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

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
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

    model_config = {"from_attributes": True}


class StatsResponse(BaseModel):
    avg_cpu_percent: float
    max_cpu_percent: float
    avg_ram_percent: float
    max_ram_percent: float
    avg_disk_percent: float
    snapshot_count: int
    period_hours: int


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

# ── API Key authentication ────────────────────────────────────────────────────
# Set API_KEY in .env to require authentication on all endpoints.
# Requests must include the header:  X-API-Key: <your-key>
# Health check paths are always open (no key needed).
_API_KEY = os.getenv("API_KEY", "")
_OPEN_PATHS = {"/", "/readyz", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if not _API_KEY or request.url.path in _OPEN_PATHS:
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
        func.max(MetricSnapshot.cpu_percent).label("max_cpu"),
        func.avg(MetricSnapshot.ram_percent).label("avg_ram"),
        func.max(MetricSnapshot.ram_percent).label("max_ram"),
        func.avg(MetricSnapshot.disk_percent).label("avg_disk"),
        func.count(MetricSnapshot.id).label("count"),
    ).filter(MetricSnapshot.timestamp >= since).first()

    if not result or result.count == 0:
        raise HTTPException(status_code=404, detail="No data found for the specified period")

    return StatsResponse(
        avg_cpu_percent=round(result.avg_cpu or 0, 2),
        max_cpu_percent=round(result.max_cpu or 0, 2),
        avg_ram_percent=round(result.avg_ram or 0, 2),
        max_ram_percent=round(result.max_ram or 0, 2),
        avg_disk_percent=round(result.avg_disk or 0, 2),
        snapshot_count=result.count,
        period_hours=hours,
    )


@app.get(
    "/alerts",
    response_model=list[AlertResponse],
    summary="Get alert history",
)
def get_alerts(
    hours: int = Query(default=24, ge=1, le=168),
    severity: Optional[str] = Query(default=None, description="Filter by severity: warning or critical"),
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
    return query.limit(100).all()


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
