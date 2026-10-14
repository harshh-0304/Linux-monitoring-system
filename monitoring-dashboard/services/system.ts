import apiClient, { apiCall } from "./api";
import type {
  SystemInfo,
  ProcessInfo,
  DiskPartition,
  NetworkStats,
} from "@/types/system";

// ── GET /system/info — Host environment specs ──
export async function fetchSystemInfo(): Promise<SystemInfo> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<SystemInfo>("/system/info");
      return data;
    },
    () => ({
      hostname: "linux-server-prod",
      os_name: "Linux",
      os_version: "6.8.0-generic",
      kernel: "6.8.0-generic",
      architecture: "x86_64",
      python_version: "3.11.9",
      cpu_count_logical: 8,
      cpu_count_physical: 4,
      total_ram_mb: 16384,
      boot_time: new Date(Date.now() - 86400000).toISOString(),
      uptime_seconds: 86400,
    })
  );
}

// ── GET /system/processes — Top processes by CPU or memory ──
export async function fetchTopProcesses(
  sortBy: "cpu" | "memory" = "cpu",
  limit = 10
): Promise<ProcessInfo[]> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<ProcessInfo[]>("/system/processes", {
        params: { sort_by: sortBy, limit },
      });
      return data;
    },
    () => [
      {
        pid: 1234,
        name: "node",
        username: "root",
        cpu_percent: 18.5,
        memory_percent: 6.2,
        status: "running",
        create_time: "2026-10-14 00:00:00",
        cmdline: "node server.js",
      },
      {
        pid: 5678,
        name: "python3",
        username: "root",
        cpu_percent: 12.0,
        memory_percent: 4.8,
        status: "running",
        create_time: "2026-10-14 00:00:00",
        cmdline: "python3 -m app.main",
      },
    ]
  );
}

// ── GET /system/disks — Multi-partition disk breakdown ──
export async function fetchDiskPartitions(): Promise<DiskPartition[]> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<DiskPartition[]>("/system/disks");
      return data;
    },
    () => [
      {
        device: "/dev/nvme0n1p3",
        mountpoint: "/",
        fstype: "ext4",
        total_gb: 250.0,
        used_gb: 120.0,
        free_gb: 130.0,
        percent: 48.0,
      },
    ]
  );
}

// ── GET /system/network — Per-interface network stats ──
export async function fetchNetworkStats(): Promise<NetworkStats> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<NetworkStats>("/system/network");
      return data;
    },
    () => ({
      interfaces: [
        {
          interface: "eth0",
          bytes_sent_mb: 1500.0,
          bytes_recv_mb: 4800.0,
          packets_sent: 120000,
          packets_recv: 340000,
          errin: 0,
          errout: 0,
          dropin: 0,
          dropout: 0,
          addresses: ["192.168.1.100"],
        },
      ],
      total_connections: 45,
      connection_states: { ESTABLISHED: 32, LISTEN: 10, TIME_WAIT: 3 },
    })
  );
}
