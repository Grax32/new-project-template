import { IncomingMessage, ServerResponse } from 'http';
import { getAllServices } from '../impl/service-groups-collection';
import EventEmitter from 'events';

type RouteHandler = (req: IncomingMessage, res: ServerResponse, params?: Record<string, string>) => Promise<void> | void;

export const serviceStatusEvents = new EventEmitter();
export const logChangeEvents = new EventEmitter();

let statusSentTime: Date = new Date(0);
const STATUS_INTERVAL = 30_000;
const MIN_STATUS_INTERVAL = STATUS_INTERVAL / 2;

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

        const onUpdate = (key: string) => {
            res.write(`data: ${JSON.stringify({ key })}\n\n`);
        };

        logChangeEvents.on('log-change', onUpdate);

        onUpdate('initial');

        req.on('close', () => {
            logChangeEvents.off('log-change', onUpdate);
            console.log('[SSE] Log Events Client disconnected');
        });
    },
    'GET /api/serviceStatusEvents': (req, res) => {
        writeEventStreamHeader(res);

        const fetchCurrentStatus = async () => {
            // get list of all statuses in the format of serviceGroupName, serviceId, status
            const allServices = await getAllServices();
            const allServicesWithStatus = await Promise.all(
                allServices.map(async ({ groupName: serviceGroup, service }) => {
                    const status = await service.status();
                    return {
                        serviceGroup,
                        serviceName: service.name,
                        serviceId: service.id,
                        status,
                    };
                })
            );

return allServicesWithStatus;
        };

const sendCurrentStatus = async () => {
    const statuses = await fetchCurrentStatus();
    res.write(`data: ${JSON.stringify({ statuses })}\n\n`);
    statusSentTime = new Date();
};

const sendCurrentStatusOnInterval = async () => {
    const now = new Date();
    if (now.getTime() - statusSentTime.getTime() >= MIN_STATUS_INTERVAL) {
        await sendCurrentStatus();
    }
};

sendCurrentStatus();

const interval = setInterval(sendCurrentStatusOnInterval, STATUS_INTERVAL);
const onUpdate = () => sendCurrentStatus();

serviceStatusEvents.on('on-demand', onUpdate);

req.on('close', () => {
    clearInterval(interval);
    serviceStatusEvents.off('on-demand', onUpdate);
    console.log('[SSE] Status Events Client disconnected');
});
    },
};

export function emitSSEUpdate() {
    serviceStatusEvents.emit('on-demand');
}

export function emitLogChange(key: string) {
    logChangeEvents.emit('log-change', key);
} 