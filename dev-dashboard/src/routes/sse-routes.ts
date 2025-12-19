import { IncomingMessage, ServerResponse } from 'http';
import { getAllServices } from '../service-agents';
import { LogChangeMessage, ServiceStatusMessage } from '../models';
import { eventBus } from '../services/event-bus';

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>,
) => Promise<void> | void;

const STATUS_INTERVAL = 30_000;

function writeEventStreamHeader(res: ServerResponse) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
}

export const sseRoutes: Record<string, RouteHandler> = {
  'GET /api/logChangeEvents': (req, res) => {
    writeEventStreamHeader(res);

    // On log change, send log-change message to client
    const sendEventToClient = (logChangeMessage: LogChangeMessage) =>
      res.write(`data: ${JSON.stringify(logChangeMessage)}\n\n`);

    // Subscribe to log change events
    eventBus.logChangeEvents.on('log-change', sendEventToClient);

    // Send initial wildcard subscription message
    sendEventToClient({ type: 'log-change', serviceId: '*', serviceGroup: '*' });

    // Handle client disconnect
    req.on('close', () => {
      eventBus.logChangeEvents.off('log-change', sendEventToClient);
      console.log('[SSE] Log Events Client disconnected');
    });
  },
  'GET /api/serviceStatusEvents': async (req, res) => {
    writeEventStreamHeader(res);

    // On status update, send status message to client
    const sendEventToClient = (statusUpdateMessage: ServiceStatusMessage) =>
      res.write(`data: ${JSON.stringify(statusUpdateMessage)}\n\n`);

    // Subscribe to status update events
    eventBus.serviceStatusEvents.on('service-status', sendEventToClient);

    const allServices = await getAllServices();

    // Interval: send all statuses every 30s
    const sendCurrentStatusOnInterval = async (force: boolean) => {
      await Promise.all(
        allServices.map(async (service) => service.service.checkForStateChange(force)),
      );
    };

    // Initial send
    await sendCurrentStatusOnInterval(true);

    // Set up interval
    const interval = setInterval(() => sendCurrentStatusOnInterval(false), STATUS_INTERVAL);

    req.on('close', () => {
      clearInterval(interval);
      eventBus.serviceStatusEvents.off('service-status', sendEventToClient);
      console.log('[SSE] Status Events Client disconnected');
    });
  },
};
