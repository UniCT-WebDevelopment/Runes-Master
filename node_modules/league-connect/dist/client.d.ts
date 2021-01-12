/// <reference types="node" />
import { EventEmitter } from 'events';
import { Credentials } from './authentication';
export declare interface LeagueClient {
    on(event: 'connect', callback: (credentials: Credentials) => void): this;
    on(event: 'disconnect', callback: () => void): this;
}
export interface LeagueClientOptions {
    /**
     * The time duration in milliseconds between each check for a client
     * disconnect
     *
     * Default: 2500
     */
    pollInterval: number;
}
export declare class LeagueClient extends EventEmitter {
    options?: LeagueClientOptions | undefined;
    private isListening;
    credentials?: Credentials;
    constructor(credentials: Credentials, options?: LeagueClientOptions | undefined);
    /**
     * Start listening for League Client processes
     */
    start(): void;
    /**
     * Stop listening for client stop/start
     */
    stop(): void;
    private onTick;
}
