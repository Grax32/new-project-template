export type ServiceStatus =
  | 'restarting'
  | 'killing'
  | 'killed'
  | 'starting'
  | 'stopping'
  | 'stopped'
  | 'running'
  | 'error'
  | 'paused'
  | 'unknown';

export type ServiceHealth = 'healthy' | 'unhealthy' | 'building' | '';

export interface ServiceState {
  serviceId: string;
  name: string;
  status: ServiceStatus;
  health: ServiceHealth;
  healthDetails?: string;
}
