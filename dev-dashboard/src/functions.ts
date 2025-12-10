import { IncomingMessage } from "http";

export function getErrorString(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return String(e);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJsonBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch {
                resolve({});
            }
        });
    });
}

export class Lazy<T> {
    private _value: T | null = null;
    private factory: () => T;

    constructor(factory: () => T) {
        this.factory = factory;
    }

    public get value(): T {
        if (this._value === null) {
            this._value = this.factory();
        }
        return this._value;
    }
}