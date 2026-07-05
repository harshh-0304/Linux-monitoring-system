# Linux Server Monitor — API Contract

**Generated from:** `app/main.py`, `app/collector.py`, `app/ai_analyzer.py`, `app/alerting.py`  
**Backend Base URL:** `http://localhost:8000`  
**Auth Scheme:** `X-API-Key` header on all protected endpoints.

---

## Authentication

```
Header: X-API-Key: <your-api-key>
```

**Open (no auth):** `/`, `/readyz`, `/docs`, `/openapi.json`, `/redoc`  
**Protected (auth required):** All other endpoints.

---

## Endpoints

### 1. Health Check

```
GET /
```

**Response `200`:**
```json
{
  "status": "ok",
  "service": "Linux Server Monitor"
}
```

---

### 2. Readiness Check

```
GET /readyz
```

**Response `200` (ready):**
```json
{
  "status": "ready",
  "scheduler_running": true,
  "last_metric_age_seconds": 45.2
}
```

**Response `503` (not ready):**
```json
{
  "status": "not ready",
  "issues": ["scheduler is not running"]
}
```

---

### 3. Get Current Live Metrics

```
GET /metrics/current
```

**Auth:** Required  
**Response `200`:**
```json
{
  "timestamp": "2026-07-05T12:00:00Z",
  "cpu_percent": 23.5,
  "cpu_count": 8,
  "ram_total_mb": 32000.0,
  "ram_used_mb": 19520.0,
  "ram_percent": 61.2,
  "disk_total_gb": 480.0,
  "disk_used_gb": 240.0,
  "disk_percent": 50.0,
  "net_bytes_sent": 1250000.5,
  "net_bytes_recv": 3400000.2,
  "load_avg_1": 1.25,
  "load_avg_5": 1.10,
  "load_avg_15": 0.95
}
```

**Field notes:**
- `net_bytes_sent`/`net_bytes_recv`: bytes/sec rate (not cumulative)
- `load_avg_*`: nullable (None on Windows)
- `cpu_percent`: 0.0–100.0 scale
- `disk_*`: reads root partition `/` only

---

### 4. Get Historical Metrics

```
GET /metrics?hours=1&limit=100
```

**Auth:** Required  
**Query Params:**
| Param | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `hours` | int | 1 | 1–168 | How far back to look |
| `limit` | int | 100 | 1–1000 | Max rows to return |

**Response `200`:** `MetricSnapshot[]`
```json
[
  {
    "id": 1,
    "timestamp": "2026-07-05T11:00:00Z",
    "cpu_percent": 23.5,
    "cpu_count": 8,
    "ram_total_mb": 32000.0,
    "ram_used_mb": 19520.0,
    "ram_percent": 61.2,
    "disk_total_gb": 480.0,
    "disk_used_gb": 240.0,
    "disk_percent": 50.0,
    "net_bytes_sent": 1250000.5,
    "net_bytes_recv": 3400000.2,
    "load_avg_1": 1.25,
    "load_avg_5": 1.10,
    "load_avg_15": 0.95
  }
]
```

---

### 5. Get Aggregated Stats

```
GET /metrics/stats?hours=24
```

**Auth:** Required  
**Query Params:**
| Param | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `hours` | int | 24 | 1–168 | Statistics period |

**Response `200`:**
```json
{
  "avg_cpu_percent": 35.2,
  "max_cpu_percent": 92.1,
  "avg_ram_percent": 58.7,
  "max_ram_percent": 82.3,
  "avg_disk_percent": 49.5,
  "snapshot_count": 1440,
  "period_hours": 24
}
```

**Response `404`:**
```json
{
  "detail": "No data found for the specified period"
}
```

---

### 6. Get Alert History

```
GET /alerts?hours=24&severity=warning
```

**Auth:** Required  
**Query Params:**
| Param | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `hours` | int | 24 | 1–168 | Lookback period |
| `severity` | str | null | `warning` or `critical` | Optional filter |

**Response `200`:** `Alert[]`
```json
[
  {
    "id": 1,
    "timestamp": "2026-07-05T10:30:00Z",
    "alert_type": "cpu_high",
    "severity": "warning",
    "message": "CPU usage is at 85.2% (threshold: 80%)",
    "ai_analysis": null,
    "telegram_sent": "sent"
  }
]
```

**`alert_type` values:** `cpu_high`, `cpu_critical`, `ram_high`, `ram_critical`, `disk_high`, `disk_critical`, `ai_anomaly`, `test`  
**`telegram_sent` values:** `sent`, `suppressed`, `failed`, `pending`

---

### 7. Trigger Manual Collection

```
POST /metrics/collect
```

**Auth:** Required  
**Response `200`:**
```json
{
  "message": "Metrics collected",
  "snapshot_id": 42,
  "cpu_percent": 23.5,
  "ram_percent": 61.2,
  "disk_percent": 50.0
}
```

---

### 8. Trigger AI Analysis

```
POST /ai/analyze
```

**Auth:** Required  
**Response `200`:**
```json
{
  "anomaly_detected": false,
  "severity": "none",
  "summary": "System metrics are within normal range",
  "analysis": "CPU has been steady at 25-30% for the last 10 minutes. RAM at 60%...",
  "recommended_action": "No action needed",
  "raw_response": "ANOMALY_DETECTED: NO\nSEVERITY: NONE\n..."
}
```

**When AI is not configured:**
```json
{
  "anomaly_detected": false,
  "severity": "none",
  "summary": "AI analysis unavailable",
  "analysis": "",
  "recommended_action": "",
  "raw_response": ""
}
```

**`severity` values:** `none`, `warning`, `critical`

---

### 9. Send Test Alert

```
POST /alerts/test
```

**Auth:** Required  
**Response `200` (success):**
```json
{
  "status": "sent",
  "message": "Test alert delivered to Telegram"
}
```

**Response `503` (failure):**
```json
{
  "status": "failed",
  "message": "Could not send alert — check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your .env file"
}
```

---

## Error Responses

All endpoints may return:

**`403` — Invalid or missing API key:**
```json
{
  "detail": "Invalid or missing API key. Add header: X-API-Key: <key>"
}
```

**`422` — Validation error (bad query params):**
```json
{
  "detail": [
    {
      "type": "greater_than_equal",
      "loc": ["query", "hours"],
      "msg": "Input should be greater than or equal to 1",
      "input": 0
    }
  ]
}
```

---

## Data Models (TypeScript)

```typescript
// MetricSnapshot — returned by GET /metrics and GET /metrics/current
interface MetricSnapshot {
  id: number;
  timestamp: string;           // ISO 8601
  cpu_percent: number;         // 0–100
  cpu_count: number;
  ram_total_mb: number;
  ram_used_mb: number;
  ram_percent: number;         // 0–100
  disk_total_gb: number;
  disk_used_gb: number;
  disk_percent: number;        // 0–100
  net_bytes_sent: number;      // bytes/sec
  net_bytes_recv: number;      // bytes/sec
  load_avg_1: number | null;
  load_avg_5: number | null;
  load_avg_15: number | null;
}

// StatsResponse — returned by GET /metrics/stats
interface StatsResponse {
  avg_cpu_percent: number;
  max_cpu_percent: number;
  avg_ram_percent: number;
  max_ram_percent: number;
  avg_disk_percent: number;
  snapshot_count: number;
  period_hours: number;
}

// Alert — returned by GET /alerts
interface Alert {
  id: number;
  timestamp: string;           // ISO 8601
  alert_type: string;          // cpu_high, ai_anomaly, etc.
  severity: string;            // warning | critical
  message: string;
  ai_analysis: string | null;
  telegram_sent: string;       // sent | suppressed | failed | pending
}

// AIAnalysis — returned by POST /ai/analyze
interface AIAnalysis {
  anomaly_detected: boolean;
  severity: string;            // none | warning | critical
  summary: string;
  analysis: string;
  recommended_action: string;
  raw_response: string;
}

// HealthCheck — returned by GET /
interface HealthCheck {
  status: string;
  service: string;
}

// ReadinessCheck — returned by GET /readyz
interface ReadinessCheck {
  status: string;              // ready | not ready
  scheduler_running?: boolean;
  last_metric_age_seconds?: number;
  issues?: string[];
}

// CollectionResult — returned by POST /metrics/collect
interface CollectionResult {
  message: string;
  snapshot_id: number;
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
}
```

---

*Contract generated from backend source code on 2026-07-05*
