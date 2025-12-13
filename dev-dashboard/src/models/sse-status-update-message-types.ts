// SSE message types for dashboard

export type SSEMessageType = 'service-list' | 'service-status';

export interface DashboardSSEBaseMessage {
    type: SSEMessageType;
}

export interface ServiceStatusMessage extends DashboardSSEBaseMessage {
    type: 'service-status';
    serviceId: string;
    serviceGroup: string;
    status: string;
    healthy: boolean;
    healthReason: string;
}

export type DashboardSSEMessage = ServiceStatusMessage;

