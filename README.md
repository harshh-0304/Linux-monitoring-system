# AI-Powered Linux Server Monitor

[![CI](https://github.com/harshh-0304/Linux-monitoring-system/actions/workflows/ci.yml/badge.svg)](https://github.com/harshh-0304/Linux-monitoring-system/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A production-ready Linux server monitoring system that collects CPU, RAM, Disk, and Network metrics, stores them in PostgreSQL, runs AI-powered anomaly detection using Google Gemini, and sends real-time alerts to Telegram.

---

## Project Overview

This system runs as a Docker container on your Linux server. Every 60 seconds it reads your system metrics, saves them to a cloud PostgreSQL database (Neon), and checks if anything looks wrong. Every 5 minutes it asks Gemini AI to analyze the trend and alert you if it detects a problem — not just a single spike, but patterns like "CPU has been climbing steadily for 10 minutes."

---

## How It Works — Full Flow

```
Your Linux Server
       |
       | psutil reads /proc/stat, /proc/meminfo, /sys/...
       v
  collector.py  ──────────────────────────────────────────────────────┐
  (every 60s)                                                         |
       |                                                              |
       | saves row to PostgreSQL                                      |
       v                                                              |
  Neon PostgreSQL DB                                                  |
  (metric_snapshots table)                                            |
       |                              ┌─────────────────────┐        |
       | (every 5 min)                |   alerting.py       |        |
       v                              |   - Cooldown: 15min |        |
  ai_analyzer.py                     |   - Saves to alerts  |        |
  - fetches last 10 snapshots         |     table in Neon   |        |
  - builds a text prompt              └─────────────────────┘        |
  - calls Gemini API                           ^                      |
  - parses: ANOMALY_DETECTED / SEVERITY        |                      |
       |                                       |                      |
       | if anomaly detected                   |                      |
       └───────────────────────────────────────┘                      |
                                               |                      |
                                   threshold check (cpu>80%, etc) ───┘
                                               |
                                               v
                                         Telegram Bot
                                    (sends alert message)


FastAPI (port 8000)
  |
  ├── GET   /                    health check (no auth)
  ├── GET   /readyz              readiness check (no auth)
  ├── GET   /system/info         host OS, CPU cores, uptime, specs
  ├── GET   /system/processes    live top processes (CPU / RAM sorted)
  ├── GET   /system/disks        mounted partitions & disk usage
  ├── GET   /system/network      per-interface metrics & socket states
  ├── GET   /metrics/current     live metrics from OS
  ├── GET   /metrics             historical snapshots from DB
  ├── GET   /metrics/stats       aggregated stats (avg/min/max/network)
  ├── GET   /metrics/export      export snapshot history (CSV / JSON)
  ├── GET   /alerts              alert history with resolved filter
  ├── GET   /alerts/stats        alert triage & category distribution
  ├── PATCH /alerts/{id}/resolve mark alert as resolved
  ├── POST  /metrics/collect     trigger manual collection
  ├── POST  /ai/analyze          trigger manual AI analysis
  └── POST  /alerts/test         send test notification (Telegram/Slack/Discord)
```

---

## Tech Stack

| Component | Technology | Why |
|---|---|---|
| Web framework | FastAPI | Fast, async, auto-generates API docs |
| Metrics collection | psutil | Reads /proc directly from Linux kernel |
| Database | PostgreSQL on Neon | Cloud-hosted, free tier, scales well |
| ORM & migrations | SQLAlchemy + Alembic | Typed DB access, schema versioning |
| AI analysis | Google Gemini API | Detects trends, not just threshold breaches |
| Alerts | Telegram Bot API | Free, instant, works on mobile |
| Scheduler | APScheduler | Background jobs inside the same process |
| Container | Docker | Consistent environment, easy deployment |

---

## Prerequisites

Before starting, make sure you have:

- **Docker** installed — `docker --version`
- A **Telegram account** to receive alerts
- A **Google AI Studio account** for the Gemini API key
- A **Neon account** for PostgreSQL — free at neon.tech
- **Git** (optional but recommended)

---

## Step-by-Step Setup

### Step 1 — Clone or download the project

```bash
git clone <your-repo-url> linux-monitoring
cd linux-monitoring
```

Or if you have the files already:

```bash
cd /path/to/linux/monitoring
```

---

### Step 2 — Create your Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts
3. You'll receive a **BOT_TOKEN** like: `7123456789:AAFxxxxxxxxxxxxxxxx`
4. Send any message to your new bot (just say "hi")
5. Open this URL in your browser (replace YOUR_TOKEN):
   ```
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```
6. Look for `"chat":{"id":123456789}` — that number is your **CHAT_ID**

---

### Step 3 — Get a Google AI Studio API Key

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **Create API key**
4. Copy the key (starts with `AQ.`)

---

### Step 4 — Create a Neon PostgreSQL Database

1. Go to **https://neon.tech** and sign up (free)
2. Create a new project
3. On the dashboard, click **Connect** → copy the connection string
4. It looks like:
   ```
   postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
   ```

---

### Step 5 — Configure your environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```bash
nano .env
```

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
GOOGLE_API_KEY=your_google_api_key_here
AI_MODEL=gemini-3.1-pro-preview
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
COLLECT_INTERVAL_SECONDS=60
AI_INTERVAL_SECONDS=300
AI_ANALYSIS_WINDOW=10
API_KEY=your_secure_api_key_here
ALERT_COOLDOWN_SECONDS=900
RETENTION_DAYS=30
```

Generate a secure API key with:

```bash
openssl rand -hex 32
```

Paste the result as your `API_KEY`.

---

### Step 6 — Apply database migrations

This creates the tables in your Neon database:

```bash
pip install alembic psycopg2-binary python-dotenv
alembic upgrade head
```

You should see:

```
INFO  [alembic.runtime.migration] Running upgrade  -> xxxx, initial schema
```

---

### Step 7 — Build the Docker image

```bash
docker build -t linux-monitor .
```

This downloads the Python base image and installs all dependencies. Takes ~2 minutes the first time.

---

### Step 8 — Run the container

```bash
docker run -d \
  --name linux-monitor \
  --pid=host \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  linux-monitor
```

**What these flags mean:**
- `-d` — run in background (detached)
- `--pid=host` — REQUIRED: gives the container access to host process info so psutil can read real CPU/RAM metrics
- `-p 8000:8000` — expose the API on port 8000
- `--env-file .env` — load your secrets from .env
- `--restart unless-stopped` — auto-restart if the server reboots

---

### Step 9 — Verify it's running

```bash
# Check the container started correctly
docker logs linux-monitor

# Health check
curl http://localhost:8000/

# Readiness check (confirms scheduler + DB are healthy)
curl http://localhost:8000/readyz
```

Expected output:
```json
{"status": "ready", "scheduler_running": true, "last_metric_age_seconds": 45.2}
```

---

### Step 10 — Test Telegram alerts

```bash
curl -s -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:8000/alerts/test
```

You should receive a message in Telegram immediately.

---

### Step 11 — Test the API

Replace `YOUR_API_KEY` with your actual key in all requests below.

```bash
# Live metrics (reads from OS right now)
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/metrics/current

# System info & hardware specs
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/system/info

# Top running processes (sorted by CPU or memory)
curl -H "X-API-Key: YOUR_API_KEY" "http://localhost:8000/system/processes?sort_by=cpu&limit=5"

# Multi-partition mounted filesystems
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/system/disks

# Network interfaces and socket states
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/system/network

# Historical metrics (last 1 hour, up to 10 rows)
curl -H "X-API-Key: YOUR_API_KEY" "http://localhost:8000/metrics?hours=1&limit=10"

# Aggregated stats (last 24 hours, includes min/max/averages and network total)
curl -H "X-API-Key: YOUR_API_KEY" "http://localhost:8000/metrics/stats?hours=24"

# Export metrics as CSV or JSON
curl -H "X-API-Key: YOUR_API_KEY" "http://localhost:8000/metrics/export?format=csv" -o metrics.csv
curl -H "X-API-Key: YOUR_API_KEY" "http://localhost:8000/metrics/export?format=json" -o metrics.json

# Alert history and alert triage statistics
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/alerts
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/alerts/stats

# Resolve an alert
curl -X PATCH -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/alerts/1/resolve

# Trigger AI analysis manually
curl -X POST -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/ai/analyze
```

Or use the **interactive Swagger UI** in your browser:

```
http://localhost:8000/docs
```

---

## Running the Automated Test Suite

The system includes 24 comprehensive unit and integration tests covering database lifecycles, collector rates, rule thresholds, alert deduplication, API endpoints, and AI parsers:

```bash
# Run all tests
pytest tests/ -v
```

---

## File Structure

```
linux-monitoring/
├── .github/
│   └── workflows/ci.yml    Automated GitHub Actions CI workflow
├── app/
│   ├── __init__.py         Package marker
│   ├── database.py         SQLAlchemy models + SQLite WAL / Postgres pooling
│   ├── collector.py        psutil metric collection (CPU, RAM, Swap, Disk, Net)
│   ├── alerting.py         Multi-channel alerts (Telegram, Slack, Discord)
│   ├── ai_analyzer.py      Gemini anomaly detection with confidence scoring
│   ├── scheduler.py        APScheduler background jobs
│   └── main.py             FastAPI routes + CORS + auth middleware
├── tests/
│   ├── test_database.py    Database models and session tests
│   ├── test_collector.py   psutil collection and network rate tests
│   ├── test_alerting.py    Threshold checks and cooldown tests
│   ├── test_api.py         FastAPI route integration tests
│   └── test_ai_analyzer.py AI prompt and parsing tests
├── monitoring-dashboard/   Next.js 15 React dashboard frontend
├── alembic/                Database migrations
├── Dockerfile              Container build instructions
├── docker-compose.yml      Docker Compose stack
├── requirements.txt        Python dependencies
└── README.md               Project documentation
```

---

## API Reference

All endpoints except `/` and `/readyz` require the `X-API-Key` header.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/readyz` | No | Readiness check — scheduler + DB health |
| GET | `/metrics/current` | Yes | Live metrics from OS (not saved to DB) |
| GET | `/metrics` | Yes | Historical snapshots (`?hours=1&limit=100`) |
| GET | `/metrics/stats` | Yes | Avg/max stats (`?hours=24`) |
| GET | `/alerts` | Yes | Alert history (`?hours=24&severity=warning`) |
| POST | `/metrics/collect` | Yes | Manually trigger metric collection |
| POST | `/ai/analyze` | Yes | Manually trigger Gemini AI analysis |
| POST | `/alerts/test` | Yes | Send test Telegram message |

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | — | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | — | Your Telegram chat ID |
| `GOOGLE_API_KEY` | — | Google AI Studio API key |
| `AI_MODEL` | `gemini-3.1-pro-preview` | Gemini model to use |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `API_KEY` | — | Secret key for API authentication |
| `COLLECT_INTERVAL_SECONDS` | `60` | How often to collect metrics |
| `AI_INTERVAL_SECONDS` | `300` | How often to run AI analysis |
| `AI_ANALYSIS_WINDOW` | `10` | Number of snapshots sent to AI |
| `ALERT_COOLDOWN_SECONDS` | `900` | Minimum time between same-type alerts |
| `RETENTION_DAYS` | `30` | Delete snapshots older than this |

---

## Alert Thresholds

Rule-based alerts fire immediately when thresholds are crossed:

| Metric | Warning | Critical |
|---|---|---|
| CPU | ≥ 80% | ≥ 95% |
| RAM | ≥ 85% | ≥ 95% |
| Disk | ≥ 85% | ≥ 95% |

AI alerts fire when Gemini detects a concerning trend across the last 10 snapshots — even if no single reading crossed a threshold.

**Alert deduplication:** The same alert type is suppressed for 15 minutes after it fires to prevent Telegram flooding.

---

## Useful Commands

```bash
# View live logs
docker logs -f linux-monitor

# Stop the monitor
docker stop linux-monitor

# Start it again
docker start linux-monitor

# Rebuild after code changes
docker build -t linux-monitor . && docker rm -f linux-monitor && docker run -d \
  --name linux-monitor --pid=host -p 8000:8000 \
  --env-file .env --restart unless-stopped linux-monitor

# Run a database migration after schema change
alembic revision --autogenerate -m "describe your change"
alembic upgrade head

# Check database migration status
alembic current
alembic history
```

---

## Troubleshooting

**Container exits immediately**
```bash
docker logs linux-monitor
# Look for errors — usually a missing DATABASE_URL or bad credentials
```

**psutil shows wrong metrics (container values instead of host)**
Make sure `--pid=host` is in your `docker run` command. Without it, psutil reads container-level metrics.

**Telegram alerts not arriving**
```bash
curl -X POST -H "X-API-Key: YOUR_KEY" http://localhost:8000/alerts/test
# If it returns "failed", check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env
```

**AI analysis returns "unavailable"**
Check the logs for the actual error:
```bash
docker logs linux-monitor | grep "ai_analyzer"
# 429 = quota exceeded (wait or enable billing)
# 403 = invalid API key
# 404 = model name not found
```

**API returns 403 on every request**
Make sure you're including the header:
```bash
curl -H "X-API-Key: YOUR_KEY" http://localhost:8000/metrics
# Note: / and /readyz never require the key
```
