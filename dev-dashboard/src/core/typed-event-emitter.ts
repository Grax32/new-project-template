import { EventEmitter } from 'events';

type EventType<E> = E extends { type: infer T; } ? T : never;
type EventOfType<E, T> = E extends { type: T; } ? E : never;

export class TypedEventEmitter<E extends { type: string; }> {
    private emitter = new EventEmitter();

    on<T extends EventType<E>>(
        type: T,
        listener: (event: EventOfType<E, T>) => void
    ): this {
        this.emitter.on(type, listener);
        return this;
    }

    once<T extends EventType<E>>(
        type: T,
        listener: (event: EventOfType<E, T>) => void
    ): this {
        this.emitter.once(type, listener);
        return this;
    }

    off<T extends EventType<E>>(
        type: T,
        listener: (event: EventOfType<E, T>) => void
    ): this {
        this.emitter.off(type, listener);
        return this;
    }

    emit(event: E): boolean {
        return this.emitter.emit(event.type, event);
    }
}
