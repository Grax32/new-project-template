import { ServiceState, ServiceHealth, ServiceStatus } from './service-state';
// SSE message types for dashboard

export type SSEMessageType = 'service-list' | 'service-status';

export interface DashboardSSEBaseMessage {
    type: SSEMessageType;
}

export interface ServiceStatusMessage extends DashboardSSEBaseMessage, ServiceState {
    type: 'service-status';
    serviceGroup: string;
}

export type DashboardSSEMessage = ServiceStatusMessage;
