"""
database.py — Sets up SQLite and defines our data models.

SQLAlchemy uses two concepts:
  - Engine: the actual connection to the database file
  - Session: a "unit of work" — you open one, do reads/writes, then close it

The models (MetricSnapshot, Alert) map directly to database tables.
When you create an instance of MetricSnapshot and add it to a session,
SQLAlchemy generates the correct INSERT SQL automatically.
"""

import os
from datetime import datetime, timezone

from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Text, Index, Boolean
from sqlalchemy.orm import DeclarativeBase, sessionmaker


from sqlalchemy import event

# --- Database connection setup ---

# Read DATABASE_URL from env; default to local SQLite if unspecified
DB_PATH = os.getenv("DATABASE_URL") or "sqlite:///./metrics.db"

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if DB_PATH.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30}
    engine_kwargs["connect_args"] = connect_args
else:
    # Connection pooling configurations for PostgreSQL
    engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
    engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))

engine = create_engine(DB_PATH, **engine_kwargs)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable Write-Ahead Logging (WAL) and synchronous mode on SQLite connections."""
    if DB_PATH.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


# SessionLocal is a factory. Each call to SessionLocal() creates a new session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# --- Base class all models inherit from ---

class Base(DeclarativeBase):
    pass


# --- Table: metric_snapshots ---
# Every time the collector runs (e.g., every 60s), it writes one row here.

class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # CPU
    cpu_percent = Column(Float, nullable=False)       # 0.0 – 100.0
    cpu_count = Column(Integer, nullable=False)        # number of logical cores

    # Memory
    ram_total_mb = Column(Float, nullable=False)
    ram_used_mb = Column(Float, nullable=False)
    ram_percent = Column(Float, nullable=False)        # 0.0 – 100.0

    # Swap
    swap_total_mb = Column(Float, nullable=True, default=0.0)
    swap_used_mb = Column(Float, nullable=True, default=0.0)
    swap_percent = Column(Float, nullable=True, default=0.0)

    # Disk (root partition)
    disk_total_gb = Column(Float, nullable=False)
    disk_used_gb = Column(Float, nullable=False)
    disk_percent = Column(Float, nullable=False)       # 0.0 – 100.0

    # Network (cumulative bytes since boot — we compute rate in collector.py)
    net_bytes_sent = Column(Float, nullable=False)
    net_bytes_recv = Column(Float, nullable=False)

    # Load average (Linux only) — 1-min, 5-min, 15-min averages
    load_avg_1 = Column(Float, nullable=True)
    load_avg_5 = Column(Float, nullable=True)
    load_avg_15 = Column(Float, nullable=True)

    # Index on timestamp so time-range queries are fast
    __table_args__ = (
        Index("ix_metric_snapshots_timestamp", "timestamp"),
    )


# --- Table: alerts ---
# Every AI-generated alert or threshold breach gets recorded here.

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # "cpu_high", "ram_high", "disk_high", "ai_anomaly", etc.
    alert_type = Column(String(64), nullable=False)

    # "warning" or "critical"
    severity = Column(String(16), nullable=False)

    # Human-readable description of what happened
    message = Column(Text, nullable=False)

    # The AI's analysis text (if this was an AI-generated alert)
    ai_analysis = Column(Text, nullable=True)

    # Whether we successfully sent the Telegram notification
    telegram_sent = Column(String(8), default="pending")

    # Resolution tracking
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_alerts_timestamp", "timestamp"),
        Index("ix_alerts_resolved", "is_resolved"),
    )


def init_db():
    """Create all tables if they don't exist yet. Called once at startup."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    FastAPI dependency that provides a database session per request.

    Usage in a route:
        @app.get("/metrics")
        def read_metrics(db: Session = Depends(get_db)):
            ...

    The 'yield' makes this a generator — FastAPI calls next() to get the
    session before the route runs, and resumes after to run the finally block.
    This guarantees the session is always closed, even if an error occurs.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
