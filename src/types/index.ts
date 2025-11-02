export interface ServiceStatus {
  isRunning: boolean;
  pid?: number;
  uptime?: string;
  user?: string;
  extra?: Record<string, unknown>; // Pour les données supplémentaires (comme les services multiples)
}

export interface JellyfinConfig {
  port: number;
  dataDir: string;
  cacheDir: string;
  logDir: string;
  configDir: string;
}

export interface DockerConfig {
  containerName: string;
  imageName: string;
  volumes: Record<string, string>;
  ports: Record<string, string>;
  environment: Record<string, string>;
}

export interface SecurityAudit {
  score: number;
  maxScore: number;
  percentage: number;
  checks: SecurityCheck[];
}

export interface SecurityCheck {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  description: string;
  impact: 'critical' | 'important' | 'minor';
  solution?: string;
}

export interface Config {
  jellyfin: JellyfinConfig;
  docker: DockerConfig;
  security: {
    enableFirewall: boolean;
    enableFail2ban: boolean;
    enableHTTPS: boolean;
    autoUpdates: boolean;
  };
  network: {
    localIP: string;
    externalDomain: string;
    httpPort: number;
    httpsPort: number;
  };
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: Error;
}
