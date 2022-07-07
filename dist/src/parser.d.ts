/// <reference types="node" />
export declare class NginxParseTreeNode {
    name: string;
    value: string;
    parent: NginxParseTreeNode | null;
    readonly children: NginxParseTreeNode[] | null;
    readonly comments: string[];
    isVerbatim: boolean;
    isBlock: boolean;
    constructor(name: string, value: string | number | null, parent: NginxParseTreeNode | null, children?: NginxParseTreeNode[] | null);
}
export interface NginxParseError {
    message: string;
    index: number;
    line: number;
}
export interface NginxParseOptions {
    templateSyntax: boolean;
}
export declare class NginxParser {
    private source;
    private index;
    private context;
    private tree;
    private error;
    private options;
    constructor(options?: NginxParseOptions);
    parse(source: string, callback?: (err: Error | null, tree?: NginxParseTreeNode) => void): void;
    private setError;
    private parseNext;
    readString(): string;
    readWord(): string;
    readComment(): string;
    readVerbatimBlock(): string;
    readBlockPattern(): string;
    parseFile(file: string, encoding?: BufferEncoding, callback?: (err: Error | null, tree?: NginxParseTreeNode) => void): void;
}
export declare const parse: (source: string, callback: (err: Error | null, tree?: NginxParseTreeNode) => void, options?: NginxParseOptions) => void;
export declare const parseFile: (file: string, encoding: BufferEncoding, callback: (err: Error | null, tree?: NginxParseTreeNode) => void, options?: NginxParseOptions) => void;
