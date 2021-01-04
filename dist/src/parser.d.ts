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
export declare class NginxParser {
    private source;
    private index;
    private context;
    private tree;
    private error;
    constructor();
    parse(source: string, callback?: (err: Error | null, tree?: NginxParseTreeNode) => void): void;
    private setError;
    private parseNext;
    readString(): string;
    readWord(): string;
    readComment(): string;
    readVerbatimBlock(): string;
    parseFile(file: string, encoding?: string, callback?: (err: Error | null, tree?: NginxParseTreeNode) => void): void;
}
export declare const parse: (source: string, callback: (err: Error | null, tree?: NginxParseTreeNode | undefined) => void) => void;
export declare const parseFile: (file: string, encoding: string, callback: (err: Error | null, tree?: NginxParseTreeNode | undefined) => void) => void;
