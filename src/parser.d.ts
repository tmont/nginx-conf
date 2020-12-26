/// <reference types="node" />


export declare class NginxParser {
	source: string;
	index: number;
	tree: NginxParseTreeNode | null;
	context: NginxParseTreeNode | null;
	error: ParseError | null;

	parse(source: string, callback: ParseCallback): void;
	parseNext(): void;
	readString(): string;
	setError(message: string): void;
	readWord(): string;
	readComment(): string;
	readVerbatimBlock(): string;
	parseFile(file: string, encoding: BufferEncoding | null, callback: ParseFileCallback): void;
}

export declare type ParseCallback = (err: ParseError | null, tree: NginxParseTreeNode) => void;

export declare type ParseFileCallback = (err: ParseError | Error | null, tree?: NginxParseTreeNode) => void;

export interface NginxParseTreeNode {
	name: string;
	value: string;
	parent: NginxParseTreeNode | null;
	children: NginxParseTreeNode[];
	comments: string[];
	isVerbatim: boolean;
}

export interface ParseError {
	message: string;
	index: number;
	line: number;
}

export declare const parse: typeof NginxParser.prototype.parse;

export declare const parseFile: typeof NginxParser.prototype.parseFile;

export {};
