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

export interface IService {
    id: string;
    name: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    status(): Promise<ServiceStatus>;
    logs(tail?: number): Promise<string>;
}

export interface IServiceGroup {
    name: string;
    services: Promise<IService[]>;
    start(): Promise<void>;
    stop(): Promise<void>;
    status(): Promise<Record<string, ServiceStatus>>;
    shutdown(): Promise<void>;
}
