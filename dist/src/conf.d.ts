/// <reference types="node" />
import * as events from 'events';
import { NginxParseTreeNode } from './parser';
export interface NginxConfOptions {
    tab?: string;
}
interface NginxConfItemApi {
    _remove(name: string, index?: number): this;
    _add(name: string, value?: string | number | null, children?: NginxParseTreeNode[] | null, comments?: string[], options?: AddOptions): this;
    _addVerbatimBlock(name: string, value: string, comments?: string[]): this;
    _getString(depth: number): string;
    toString(): string;
}
interface NginxConfItemProps {
    _name: string;
    _value: string | number;
    _root?: boolean;
    _comments: string[];
    _isVerbatim: boolean;
    __isBlock: boolean;
}
interface IndexableConfItem {
    [key: string]: NginxConfItem[] | undefined;
}
export declare type NginxConfItem = NginxConfItemApi & IndexableConfItem & NginxConfItemProps;
interface AddOptions {
    isVerbatim?: boolean;
}
export declare class NginxConfFile extends events.EventEmitter {
    readonly tab: string;
    readonly _name: string;
    readonly nginx: NginxConfItem;
    private readonly files;
    private readonly liveListener;
    private writeTimeout;
    constructor(tree: NginxParseTreeNode, options?: NginxConfOptions);
    live(file: string): this;
    die(file: string): this;
    /**
     * To handle potentially concurrent writes, use flush() instead.
     */
    write(callback?: (errors: Error[] | null, wrote: boolean) => void): void;
    flush(callback?: (errors?: Error[] | null) => void): void;
    toString(): string;
    static create(file: string, options?: NginxConfOptions | ((err: Error | null, conf?: NginxConfFile) => void) | null, callback?: (err: Error | null, conf?: NginxConfFile) => void): void;
    static createFromSource(source: string, options?: NginxConfOptions | ((err: Error | null, conf?: NginxConfFile) => void) | null, callback?: (err: Error | null, conf?: NginxConfFile) => void): void;
}
export {};
