import WebSocket, { ClientOptions } from 'ws';
import { Credentials } from './authentication';
export interface EventResponse<T = any> {
    /**
     * The uri this event was dispatched at
     */
    uri: string;
    /**
     * The data, if any
     */
    data: T;
}
/**
 * Callback function for an subscription listener
 *
 * @param data The data payload (deserialized json)
 */
export declare type EventCallback<T = any> = (data: T | null, event: EventResponse<T>) => void;
/**
 * WebSocket extension
 */
export declare class LeagueWebSocket extends WebSocket {
    subscriptions: Map<string, EventCallback[]>;
    constructor(address: string, options: ClientOptions);
    subscribe<T extends any = any>(path: string, effect: EventCallback<T>): void;
    unsubscribe(path: string): void;
}
export declare function connect(credentials: Credentials): Promise<LeagueWebSocket>;
