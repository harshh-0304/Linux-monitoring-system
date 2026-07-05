import type { MetricSnapshot } from "@/types/metrics";
import type { Alert } from "@/types/alerts";
import type { AIAnalysis } from "@/types/ai";
import type { StatsResponse } from "@/types/metrics";
import type { HealthCheck, ReadinessCheck } from "@/types/api";

// ── Generate a realistic random metric snapshot ──
function randomMetric(overrides?: Partial<MetricSnapshot>): MetricSnapshot {
  const now = new Date();
  const cpu = 20 + Math.random() * 60;
  const ram = 40 + Math.random() * 40;
  const disk = 30 + Math.random() * 30;

  return {
    id: Math.floor(Math.random() * 10000),
    timestamp: now.toISOString(),
    cpu_percent: parseFloat(cpu.toFixed(2)),
    cpu_count: 8,
    ram_total_mb: 32000,
    ram_used_mb: parseFloat(((ram / 100) * 32000).toFixed(2)),
    ram_percent: parseFloat(ram.toFixed(2)),
    disk_total_gb: 480,
    disk_used_gb: parseFloat(((disk / 100) * 480).toFixed(2)),
    disk_percent: parseFloat(disk.toFixed(2)),
    net_bytes_sent: parseFloat((500000 + Math.random() * 2000000).toFixed(2)),
    net_bytes_recv: parseFloat((1000000 + Math.random() * 4000000).toFixed(2)),
    load_avg_1: parseFloat((0.5 + Math.random() * 2).toFixed(2)),
    load_avg_5: parseFloat((0.3 + Math.random() * 1.5).toFixed(2)),
    load_avg_15: parseFloat((0.2 + Math.random() * 1).toFixed(2)),
    ...overrides,
  };
}

// ── Generate historical metric snapshots ──
function generateMetricHistory(hours: number, limit: number): MetricSnapshot[] {
  const snapshots: MetricSnapshot[] = [];
  const now = Date.now();
  const intervalMs = (hours * 3600 * 1000) / limit;

  for (let i = limit - 1; i >= 0; i--) {
    const ts = new Date(now - i * intervalMs);
    snapshots.push(
      randomMetric({
        id: i + 1,
        timestamp: ts.toISOString(),
        cpu_percent: parseFloat((20 + Math.sin(i * 0.3) * 25 + Math.random() * 10).toFixed(2)),
        ram_percent: parseFloat((50 + Math.sin(i * 0.1) * 15 + Math.random() * 5).toFixed(2)),
        disk_percent: parseFloat((45 + Math.sin(i * 0.05) * 5 + Math.random() * 2).toFixed(2)),
      })
    );
  }
  return snapshots;
}

// ── Mock live metrics ──
export function mockLiveMetrics(): Omit<MetricSnapshot, "id"> {
  const m = randomMetric();
  const { id, ...rest } = m;
  return rest;
}

// ── Mock metric history ──
export function mockMetricHistory(hours = 1, limit = 100): MetricSnapshot[] {
  return generateMetricHistory(hours, limit);
}

// ── Mock stats ──
export function mockStats(hours = 24): StatsResponse {
  const history = generateMetricHistory(hours, Math.min(hours * 60, 1440));
  const cpuVals = history.map((m) => m.cpu_percent);
  const ramVals = history.map((m) => m.ram_percent);
  const diskVals = history.map((m) => m.disk_percent);

  return {
    avg_cpu_percent: parseFloat(
      (cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length).toFixed(2)
    ),
    max_cpu_percent: parseFloat(Math.max(...cpuVals).toFixed(2)),
    avg_ram_percent: parseFloat(
      (ramVals.reduce((a, b) => a + b, 0) / ramVals.length).toFixed(2)
    ),
    max_ram_percent: parseFloat(Math.max(...ramVals).toFixed(2)),
    avg_disk_percent: parseFloat(
      (diskVals.reduce((a, b) => a + b, 0) / diskVals.length).toFixed(2)
    ),
    snapshot_count: history.length,
    period_hours: hours,
  };
}

// ── Mock alerts ──
const mockAlertData: Alert[] = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    alert_type: "cpu_high",
    severity: "warning",
    message: "CPU usage is at 85.2% (threshold: 80%)",
    ai_analysis: null,
    telegram_sent: "sent",
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    alert_type: "ai_anomaly",
    severity: "warning",
    message: "CPU has been climbing steadily for 10 minutes — possible runaway process",
    ai_analysis:
      "Observed CPU increasing from 45% to 82% over 10 minutes. RAM stable at 60%. This pattern is consistent with a process accumulating work or a memory leak beginning to impact CPU.",
    telegram_sent: "sent",
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    alert_type: "disk_high",
    severity: "critical",
    message: "Disk usage is at 96.1% (190.2 GB / 198.0 GB)",
    ai_analysis: null,
    telegram_sent: "sent",
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    alert_type: "ram_high",
    severity: "warning",
    message: "RAM usage is at 88.4% (28288 MB used)",
    ai_analysis: null,
    telegram_sent: "suppressed",
  },
  {
    id: 5,
    timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
    alert_type: "cpu_critical",
    severity: "critical",
    message: "CPU usage is at 97.3% (threshold: 95%)",
    ai_analysis: null,
    telegram_sent: "sent",
  },
];

export function mockAlerts(hours = 24, severity?: string): Alert[] {
  return severity
    ? mockAlertData.filter((a) => a.severity === severity)
    : mockAlertData;
}

// ── Mock AI analysis ──
export function mockAIAnalysis(): AIAnalysis {
  const anomaly = Math.random() > 0.6;
  return {
    anomaly_detected: anomaly,
    severity: anomaly ? (Math.random() > 0.5 ? "warning" : "critical") : "none",
    summary: anomaly
      ? "Unusual CPU pattern detected — sustained high load"
      : "System metrics are within normal range",
    analysis: anomaly
      ? "CPU has been running at 75-85% for the last 15 minutes. RAM is at 62% and stable. Disk I/O shows elevated read operations. This pattern suggests a background job or scheduled task consuming CPU resources."
      : "All metrics show stable patterns. CPU averaging 35%, RAM at 55%, Disk at 48%. No concerning trends detected across any monitored metric.",
    recommended_action: anomaly
      ? "Run `top` or `htop` to identify the top CPU-consuming process. Check system logs with `journalctl -xe` for recent cron jobs or scheduled tasks."
      : "No action required. System is operating within normal parameters.",
    raw_response: "",
  };
}

// ── Mock health check ──
export function mockHealthCheck(): HealthCheck {
  return {
    status: "ok",
    service: "Linux Server Monitor",
  };
}

// ── Mock readiness ──
export function mockReadiness(): ReadinessCheck {
  return {
    status: "ready",
    scheduler_running: true,
    last_metric_age_seconds: parseFloat((Math.random() * 60).toFixed(1)),
  };
}

// ── Mock collection result ──
export function mockCollectionResult() {
  const cpu = parseFloat((20 + Math.random() * 60).toFixed(2));
  const ram = parseFloat((40 + Math.random() * 40).toFixed(2));
  const disk = parseFloat((30 + Math.random() * 30).toFixed(2));
  return {
    message: "Metrics collected",
    snapshot_id: Math.floor(Math.random() * 1000),
    cpu_percent: cpu,
    ram_percent: ram,
    disk_percent: disk,
  };
}
