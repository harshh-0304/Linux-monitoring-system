export interface SystemInfo {
  hostname: string;
  os_name: string;
  os_version: string;
  kernel: string;
  architecture: string;
  python_version: string;
  cpu_count_logical: number;
  cpu_count_physical: number;
  total_ram_mb: number;
  boot_time: string;
  uptime_seconds: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  username: string | null;
  cpu_percent: number;
  memory_percent: number;
  status: string;
  create_time: string | null;
  cmdline: string | null;
}

export interface DiskPartition {
  device: string;
  mountpoint: string;
  fstype: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent: number;
}

export interface NetworkInterface {
  interface: string;
  bytes_sent_mb: number;
  bytes_recv_mb: number;
  packets_sent: number;
  packets_recv: number;
  errin: number;
  errout: number;
  dropin: number;
  dropout: number;
  addresses: string[];
}

export interface NetworkStats {
  interfaces: NetworkInterface[];
  total_connections: number;
  connection_states: Record<string, number>;
}
