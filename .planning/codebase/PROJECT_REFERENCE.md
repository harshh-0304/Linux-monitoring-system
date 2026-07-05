# AI-Powered Linux Server Monitor — Project Reference

**Analysis Date:** 2026-07-05  
**Version:** 1.0.0  
**Python:** 3.12  
**Framework:** FastAPI

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture & Data Flow](#system-architecture--data-flow)
3. [Technology Stack](#technology-stack)
4. [Module Breakdown](#module-breakdown)
5. [Directory Structure](#directory-structure)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [External Integrations](#external-integrations)
9. [Configuration Reference](#configuration-reference)
10. [Alert System](#alert-system)
11. [Key Design Decisions](#key-design-decisions)
12. [Concerns & Limitations](#concerns--limitations)

---

## Project Overview

A production-ready Linux server monitoring system that:

- Collects CPU, RAM, Disk, and Network metrics every 60s via `psutil`
- Stores metrics in PostgreSQL (Neon cloud)
- Runs AI-powered anomaly detection using Google Gemini every 5 minutes
- Sends real-time Telegram alerts for both rule-based threshold breaches and AI-detected trends
- Exposes a FastAPI REST API on port 8000
- Runs as a Docker container with `--pid=host` for host-level metrics

---

## System Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     Docker Container                             │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                   FastAPI (uvicorn)                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────────┐   │   │
│  │  │  Routes    │  │  API Key   │  │  Lifespan:        │   │   │
│  │  │  main.py   │  │  Middleware│  │  init_db()         │   │   │
│  │  │            │  │  main.py   │  │  start_scheduler() │   │   │
│  │  └────────────┘  └────────────┘  └───────────────────┘   │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │           APScheduler (background thread)          │   │   │
│  │  │  ┌─────────────────┐  ┌──────────────────┐         │   │   │
│  │  │  │ collect_job     │  │ ai_analysis_job  │         │   │   │
│  │  │  │ (every 60s)     │  │ (every 300s)     │         │   │   │
│  │  │  │ collector.py    │  │ ai_analyzer.py   │         │   │   │
│  │  │  └────────┬────────┘  └────────┬─────────┘         │   │   │
│  │  │           │                    │                    │   │   │
│  │  │           ▼                    ▼                    │   │   │
│  │  │  ┌──────────────────────────────────────────┐       │   │   │
│  │  │  │           alerting.py                    │       │   │   │
│  │  │  │  - check_thresholds() (rule-based)       │       │   │   │
│  │  │  │  - send_telegram_alert() (cooldown 15m)  │       │   │   │
│  │  │  │  - _save_alert() (DB logging)            │       │   │   │
│  │  │  └────────────────────┬─────────────────────┘       │   │   │
│  │  │                       │                              │   │   │
│  │  │                       ▼                              │   │   │
│  │  │              Telegram API                            │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │           database.py (SQLAlchemy)                 │   │   │
│  │  │  - MetricSnapshot table                            │   │   │
│  │  │  - Alert table                                     │   │   │
│  │  │  - PostgreSQL via Neon                              │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────┐                                             │
│  │  psutil (/proc)  │ ◄── --pid=host gives access to host /proc   │
│  └──────────────────┘                                             │
└──────────────────────────────────────────────────────────────────┘
```

**Collection flow (every 60s):**
1. `_run_collection_job()` in `app/scheduler.py`
2. Calls `collect_and_save()` in `app/collector.py`
3. `collect_metrics()` reads from `psutil` → returns dict
4. `save_metrics()` writes `MetricSnapshot` row to PostgreSQL
5. `check_thresholds()` evaluates CPU/RAM/Disk vs thresholds
6. If threshold breached → `send_telegram_alert()` fires

**AI analysis flow (every 300s):**
1. `_run_ai_analysis_job()` in `app/scheduler.py`
2. Calls `analyze_metrics()` in `app/ai_analyzer.py`
3. Fetches last N snapshots from DB (default: 10)
4. Builds a structured text prompt with metric table
5. Sends to Google Gemini API
6. Parses structured response (`ANOMALY_DETECTED`, `SEVERITY`, etc.)
7. If anomaly → `send_telegram_alert()` fires with AI analysis text

**Retention job (daily at midnight):**
1. `_run_retention_job()` deletes rows older than `RETENTION_DAYS`
2. Prevents unbounded database growth (~525k rows/year at 60s intervals)

---

## Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Web framework | FastAPI | 0.115.0 | Async Python web framework, auto-generates OpenAPI docs |
| ASGI server | uvicorn | 0.30.6 | Runs the FastAPI app |
| Metrics collection | psutil | 6.0.0 | Reads /proc for CPU/RAM/Disk/Network metrics |
| ORM | SQLAlchemy | 2.0.35 | Typed database access with model definitions |
| Migrations | Alembic | 1.13.2 | Schema versioning and auto-migration generation |
| DB adapter | psycopg2-binary | 2.9.9 | PostgreSQL driver |
| AI / LLM | google-generativeai | 0.8.3 | Google Gemini API client for anomaly detection |
| HTTP client | httpx | 0.27.2 | Async HTTP for Telegram bot API calls |
| Scheduler | APScheduler | 3.10.4 | In-process background job scheduling |
| Validation | Pydantic | 2.9.2 | Request/response model validation (bundled with FastAPI) |
| Env config | python-dotenv | 1.0.1 | Loads `.env` file for local development |
| Container | Docker | — | Python 3.12-slim base image |
| Database | PostgreSQL (Neon) | — | Cloud-hosted PostgreSQL via Neon |

---

## Module Breakdown

### `app/main.py` (342 lines) — FastAPI Application

**Role:** Entry point. Defines routes, middleware, startup/shutdown lifecycle.

**Key components:**
- `lifespan(app)` — async context manager; `init_db()` + `start_scheduler()` on startup, `stop_scheduler()` on shutdown
- `api_key_middleware()` — HTTP middleware checking `X-API-Key` header on all paths except `{/, /readyz, /docs, /openapi.json, /redoc}`
- Pydantic response models: `MetricResponse`, `AlertResponse`, `StatsResponse` — all use `model_config = {"from_attributes": True}` for ORM compatibility

**Routes:**
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/readyz` | No | Readiness probe (scheduler + DB age check) |
| GET | `/metrics/current` | Yes | Live OS metrics (not saved) |
| GET | `/metrics` | Yes | Historical snapshots from DB |
| GET | `/metrics/stats` | Yes | Aggregated stats (avg/max) |
| GET | `/alerts` | Yes | Alert history |
| POST | `/metrics/collect` | Yes | Manual collection trigger |
| POST | `/ai/analyze` | Yes | Manual AI analysis trigger |
| POST | `/alerts/test` | Yes | Test Telegram message |

### `app/database.py` (132 lines) — SQLAlchemy Models & DB Setup

**Role:** Defines database engine, session factory, ORM models, and the `get_db()` FastAPI dependency.

**Key components:**
- Reads `DATABASE_URL` from env var
- `engine = create_engine(DB_PATH, pool_pre_ping=True)` — auto-reconnects dropped connections
- `SessionLocal = sessionmaker()` — factory for creating DB sessions
- `init_db()` — calls `Base.metadata.create_all(bind=engine)` to create tables
- `get_db()` — generator-based FastAPI dependency (yields session, closes in `finally`)

**Models:**
- `MetricSnapshot` — table `metric_snapshots`, indexes on `id` and `timestamp`
- `Alert` — table `alerts`, indexes on `id` and `timestamp`

### `app/collector.py` (137 lines) — psutil Metrics Collection

**Role:** Reads system metrics from the OS via `psutil`, saves to DB.

**Key components:**
- `collect_metrics()` → dict — reads CPU (interval=1s), RAM, Disk (root `/`), Network (rate derived from cumulative counters), Load Average
- `save_metrics(metrics)` → `MetricSnapshot` — opens its own `SessionLocal()` (not the FastAPI dependency) since it runs from the scheduler
- `collect_and_save()` — convenience: collect + save in one call
- Module-level globals `_prev_net_*` track previous network counters for rate calculation

**Note:** `collect_metrics()` calls `psutil.cpu_percent(interval=1)` which blocks for 1 second. This is intentional — without the interval, the reading is unreliable.

### `app/ai_analyzer.py` (209 lines) — Google Gemini Anomaly Detection

**Role:** Fetches recent snapshots, sends to Gemini, parses structured response.

**Key components:**
- `_fetch_recent_snapshots(db, n)` — gets last N snapshots ordered by timestamp DESC
- `_build_prompt(snapshots)` — formats snapshots as a text table with server specs, asks Gemini for structured analysis
- `analyze_metrics(db)` — main entry: fetches snapshots, builds prompt, calls Gemini, parses response
- `_parse_ai_response(text)` — parses `ANOMALY_DETECTED:`, `SEVERITY:`, `SUMMARY:`, `ANALYSIS:`, `RECOMMENDED_ACTION:` lines

**Prompt structure:**
- Table of snapshots (oldest → newest) with CPU%, RAM%, Disk%, Load1m
- Current server specs (cores, RAM, disk)
- Strict output format instructions
- Rules about when to flag anomalies (prefers trend over single spikes)

**Model:** Defaults to `gemini-2.0-flash`, configurable via `AI_MODEL` env var.

### `app/alerting.py` (204 lines) — Telegram Alerts & Threshold Checks

**Role:** Sends Telegram messages, manages deduplication cooldowns, checks rule-based thresholds.

**Key components:**
- `send_telegram_alert(alert_type, severity, message, ai_analysis)` — async function using `httpx.AsyncClient` to POST to Telegram Bot API
- `_is_on_cooldown(alert_type)` — in-memory dedup: same alert type suppressed for `ALERT_COOLDOWN_SECONDS` (default 900s/15min)
- `_save_alert()` — writes to Alert table with `telegram_sent` status: `"sent"`, `"suppressed"`, `"failed"`, or `"pending"`
- `check_thresholds(metrics)` → list[dict] — evaluates CPU (80%/95%), RAM (85%/95%), Disk (85%/95%)
- `_format_message()` — builds Telegram message text with severity label, timestamp, details, optional AI analysis

**Cooldown note:** In-memory dict resets on container restart. This is acceptable — fresh start should re-alert.

### `app/scheduler.py` (173 lines) — Background Job Scheduler

**Role:** Registers and manages APScheduler background jobs.

**Jobs:**
1. `_run_collection_job()` — every `COLLECT_INTERVAL_SECONDS` (default 60s): collect, save, check thresholds, send alerts
2. `_run_ai_analysis_job()` — every `AI_INTERVAL_SECONDS` (default 300s): analyze, send anomaly alerts
3. `_run_retention_job()` — daily at midnight UTC: delete old snapshots

**Key details:**
- Uses APScheduler `BackgroundScheduler` — runs on a separate thread
- `max_instances=1` — prevents overlapping job runs
- `misfire_grace_time=30`/`60` — allows late execution if scheduler was busy
- `asyncio.run(send_telegram_alert(...))` — required because scheduler runs in sync context
- `stop_scheduler(wait=True)` — prevents mid-write DB corruption on shutdown

---

## Directory Structure

```
linux-monitoring/
├── app/                           # Python application package
│   ├── __init__.py                # Package marker
│   ├── main.py                    # FastAPI routes, middleware, lifecycle
│   ├── database.py                # SQLAlchemy engine, session, models
│   ├── collector.py               # psutil metric collection
│   ├── ai_analyzer.py             # Google Gemini anomaly detection
│   ├── alerting.py                # Telegram alerts + threshold checks
│   └── scheduler.py               # APScheduler background jobs
├── alembic/                       # Database migration framework
│   ├── env.py                     # Alembic environment config
│   ├── script.py.mako             # Migration template
│   ├── README                     # Alembic README
│   └── versions/                  # Migration files
│       └── 3bf23cb33549_initial_schema.py
├── alembic.ini                    # Alembic configuration
├── Dockerfile                     # Container build (python:3.12-slim)
├── docker-compose.yml             # Docker Compose orchestration
├── requirements.txt               # Python dependencies
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
├── README.md                      # Documentation
├── .claude/                       # Claude AI local settings
│   └── settings.local.json
├── .env                           # Actual secrets (git-ignored)
└── venv/                          # Python virtual environment (git-ignored)
```

---

## Database Schema

### `metric_snapshots` table

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | Integer (PK) | No | Auto-increment |
| `timestamp` | DateTime(tz) | No | UTC timestamp of collection |
| `cpu_percent` | Float | No | 0.0–100.0 |
| `cpu_count` | Integer | No | Logical CPU cores |
| `ram_total_mb` | Float | No | Total RAM in MB |
| `ram_used_mb` | Float | No | Used RAM in MB |
| `ram_percent` | Float | No | 0.0–100.0 |
| `disk_total_gb` | Float | No | Root partition total in GB |
| `disk_used_gb` | Float | No | Root partition used in GB |
| `disk_percent` | Float | No | 0.0–100.0 |
| `net_bytes_sent` | Float | No | Bytes/sec sent (rate) |
| `net_bytes_recv` | Float | No | Bytes/sec received (rate) |
| `load_avg_1` | Float | Yes | 1-min load average |
| `load_avg_5` | Float | Yes | 5-min load average |
| `load_avg_15` | Float | Yes | 15-min load average |

**Indexes:** `ix_metric_snapshots_timestamp` on `timestamp`

### `alerts` table

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | Integer (PK) | No | Auto-increment |
| `timestamp` | DateTime(tz) | No | UTC timestamp |
| `alert_type` | String(64) | No | e.g. `cpu_high`, `ai_anomaly` |
| `severity` | String(16) | No | `warning` or `critical` |
| `message` | Text | No | Human-readable description |
| `ai_analysis` | Text | Yes | Full AI analysis text (if AI-generated) |
| `telegram_sent` | String(8) | Yes | `sent`, `suppressed`, `failed`, `pending` |

**Indexes:** `ix_alerts_timestamp` on `timestamp`

---

## API Reference

All endpoints except `/`, `/readyz`, `/docs`, `/openapi.json`, `/redoc` require `X-API-Key` header.

| Method | Path | Query Params | Description |
|---|---|---|---|
| GET | `/` | — | Health check → `{"status": "ok", "service": "Linux Server Monitor"}` |
| GET | `/readyz` | — | Readiness check → `{"status": "ready", "scheduler_running": true, "last_metric_age_seconds": 45.2}`  |
| GET | `/metrics/current` | — | Live OS metrics (not saved) |
| GET | `/metrics` | `hours` (1-168, default 1), `limit` (1-1000, default 100) | Historical snapshots from DB |
| GET | `/metrics/stats` | `hours` (1-168, default 24) | Aggregated avg/max stats |
| GET | `/alerts` | `hours` (1-168, default 24), `severity` (optional: `warning`/`critical`) | Alert history |
| POST | `/metrics/collect` | — | Trigger manual collection |
| POST | `/ai/analyze` | — | Trigger manual AI analysis |
| POST | `/alerts/test` | — | Send test Telegram message |

**Error responses:**
- `403` — Invalid/missing API key (except on open paths)
- `404` — No data found for stats period
- `503` — Readiness check failed or alert send failed

---

## External Integrations

### Telegram Bot API
- **Purpose:** Send alert notifications
- **Endpoint:** `https://api.telegram.org/bot{TOKEN}/sendMessage`
- **Auth:** Bot token in URL path + chat ID in JSON body
- **Required env vars:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- **SDK:** Direct `httpx` calls (no wrapper library)
- **Failure behavior:** Logs error, saves alert with `telegram_sent = "failed"`

### Google Gemini API
- **Purpose:** AI-powered anomaly detection on metric trends
- **SDK:** `google-generativeai` (v0.8.3)
- **Auth:** API key via `genai.configure(api_key=...)`
- **Model:** Configurable via `AI_MODEL` env var (default `gemini-2.0-flash`)
- **Required env var:** `GOOGLE_API_KEY`
- **Failure behavior:** Returns safe default `{"anomaly_detected": false, "severity": "none", ...}`, logs specific error type (API key, quota, etc.)

### Neon PostgreSQL
- **Purpose:** Persistent metric and alert storage
- **Connection:** `DATABASE_URL` env var (PostgreSQL connection string)
- **ORM:** SQLAlchemy 2.0 with `pool_pre_ping=True`
- **Migrations:** Alembic with `load_dotenv()` support for local migration commands

---

## Configuration Reference

| Variable | Default | Required | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | — | Yes | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | — | Yes | Your Telegram chat ID |
| `GOOGLE_API_KEY` | — | Yes | Google AI Studio API key |
| `DATABASE_URL` | — | Yes | PostgreSQL connection string |
| `API_KEY` | — | Yes | Secret key for API auth (generate with `openssl rand -hex 32`) |
| `AI_MODEL` | `gemini-2.0-flash` | No | Gemini model name |
| `COLLECT_INTERVAL_SECONDS` | `60` | No | Metric collection interval |
| `AI_INTERVAL_SECONDS` | `300` | No | AI analysis interval |
| `AI_ANALYSIS_WINDOW` | `10` | No | Number of snapshots in AI prompt |
| `ALERT_COOLDOWN_SECONDS` | `900` | No | Duplicate alert suppression (0 = disabled) |
| `RETENTION_DAYS` | `30` | No | Auto-delete snapshots older than N days |

---

## Alert System

### Dual Alert Model

The system combines two complementary alert strategies:

**1. Rule-based (instant, deterministic):**
- CPU ≥ 80% → warning, ≥ 95% → critical
- RAM ≥ 85% → warning, ≥ 95% → critical
- Disk ≥ 85% → warning, ≥ 95% → critical
- Fires immediately on every collection cycle (subject to cooldown)

**2. AI-based (trend-aware, contextual):**
- Analyzes last N snapshots for patterns
- Detects sustained trends (e.g., "CPU climbing steadily for 10 minutes")
- Understands context (e.g., temporary spikes during compilation)
- Correlates multiple metrics (e.g., "CPU + RAM rising = possible memory leak")
- Provides actionable recommendations (specific Linux commands)

### Deduplication
- Each `alert_type` has a cooldown timer (default 15 minutes)
- Suppressed alerts are still logged to DB with `telegram_sent = "suppressed"`
- Cooldown is in-memory (resets on container restart)

---

## Key Design Decisions

1. **Single worker process** (`--workers 1`): Multiple workers would each run their own scheduler instance, causing duplicate metric collections. The scheduler runs on a background thread within the single worker.

2. **`--pid=host` required**: Without this Docker flag, `psutil` reads container-level cgroup metrics instead of real host metrics. This is the most common deployment mistake.

3. **Scheduler creates its own DB sessions**: Background jobs use `SessionLocal()` directly instead of the FastAPI `Depends(get_db)` dependency, because they don't run in a request context.

4. **`asyncio.run()` in scheduler jobs**: APScheduler runs in sync context. Telegram alerts use async `httpx`, so `asyncio.run()` bridges the gap. Simple and works for single-alert scenarios.

5. **`psutil.cpu_percent(interval=1)`**: Blocks for 1 second per call. This gives accurate readings. The 1-second delay is factored into collection timing.

6. **In-memory cooldown instead of DB**: Simpler, faster, no DB query overhead. Acceptable trade-off since cooldown resets on restart (and a fresh start should alert).

7. **Plain-text prompt parsing for AI**: Instead of JSON mode or function calling, uses simple `KEY: VALUE` line parsing. More resilient to model output variations than regex, and the prompt explicitly enforces the format.

---

## Concerns & Limitations

### Technical Debt
- **No test files exist** — Zero test coverage across all modules. The project has no `test/` directory, no test config files (`pytest.ini`, `vitest.config.*`, etc.), and no test dependencies in `requirements.txt`.
- **No type checking configured** — No `pyproject.toml` or `mypy.ini` for static type checking despite using type hints throughout.

### Fragile Areas
- **Network rate calculation** (`app/collector.py` lines 75-87): Uses module-level globals for previous counter values. If `collect_metrics()` is called from multiple places unexpectedly, or if the process restarts, the first reading always shows 0 bytes/sec.
- **AI prompt parsing** (`app/ai_analyzer.py` lines 178-209): Simple line-by-line parsing. If Gemini changes output format or adds extra lines, parsing silently returns defaults. No retry logic.
- **Cooldown state is in-memory** (`app/alerting.py` lines 38, 41-51): Resets on container restart. Acceptable but could cause alert storms after redeployment if persistent issues exist.

### Security Considerations
- **API key in header**: `X-API-Key` is transmitted in plaintext. No HTTPS enforcement at the app level (relies on reverse proxy/ingress).
- **Telegram token in URL**: `https://api.telegram.org/bot{TOKEN}/sendMessage` — token is part of the URL path. `httpx` logs are sanitized in code (no URL logging), but network-level interception would expose it.
- **No rate limiting**: POST endpoints have no request throttling. `POST /alerts/test` could be abused to spam Telegram.

### Missing Features
- No health check endpoint for the AI service (Gemini connectivity)
- No metrics export format (Prometheus, etc.)
- No web dashboard (API-only)
- No authentication for `/docs` endpoint (Swagger UI is publicly accessible if exposed)

---

*Document generated from codebase analysis on 2026-07-05*
