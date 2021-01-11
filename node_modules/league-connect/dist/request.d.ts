import { Response as FetchResponse } from 'node-fetch';
import { Credentials } from './authentication';
export interface RequestOptions<T = any> {
    /**
     * Relative URL (relative to LCU API base url) to send api request to
     */
    url: string;
    /**
     * Http verb to use for request
     */
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /**
     * Optionally a body to pass to PUT/PATCH/POST/DELETE. This is typically
     * an object type as the library will parse this into JSON and send along
     * with the request
     */
    body?: T;
}
/**
 * Wrapper around Node-fetch Response which will deserialize JSON into the
 * proper type
 */
export declare class Response<T> extends FetchResponse {
    constructor(parent: FetchResponse);
    /**
     * Deserialize the response body into T
     */
    json(): Promise<T>;
}
export declare function request<T = any, R = any>(options: RequestOptions<T>, credentials?: Credentials): Promise<Response<R>>;
