// let's make an event bus with a typed event emitter and a static instance
import { TypedEventEmitter } from '../core/typed-event-emitter';
import { DashboardSSEMessage } from '../models/sse-status-update-message-types';
import { LogChangeMessage } from '../models/log-change-message-types';

class EventBus {
  public static instance: EventBus = new EventBus();

  public serviceStatusEvents: TypedEventEmitter<DashboardSSEMessage>;
  public logChangeEvents: TypedEventEmitter<LogChangeMessage>;

  private constructor() {
    this.serviceStatusEvents = new TypedEventEmitter<DashboardSSEMessage>();
    this.logChangeEvents = new TypedEventEmitter<LogChangeMessage>();
  }

  public emitServiceStatusUpdate(message: DashboardSSEMessage) {
    this.serviceStatusEvents.emit(message);
  }
}

export const eventBus = EventBus.instance;
