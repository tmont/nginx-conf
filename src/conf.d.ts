import { TypedEmitter } from 'tiny-typed-emitter';

import { NginxParseTreeNode } from './parser';


export declare class NginxConfFile extends TypedEmitter<NginxConfFileEvents> {
	readonly files: string[];
	readonly tab: string;
	readonly nginx: ConfItem;

	constructor (tree: NginxParseTreeNode, options?: NginxConfFileOptions);

	static create(file: string, options: NginxConfFileOptions, callback: CreateCallback): void;
	static create(file: string, callback: CreateCallback): void;

	static createFromSource(source: string, options: NginxConfFileOptions, callback: CreateCallback): void;
	static createFromSource(source: string, callback: CreateCallback): void;

	live(file: string): this;

	die(file: string): this;

	write(callback: (err: Error[] | null, completed: boolean) => void): this;

	flush(callback: (err: Error[]) => void): this;

	toString(): string;
}

interface NginxConfFileEvents {
	added: (node: ConfItem) => void;
	removed: (node: ConfItem) => void;
	changed: (node: this, newValue: string) => void;
	flushed: () => void;
}

interface NginxConfFileOptions {
	tab?: string;
}

declare type CreateCallback = (err: any, conf: NginxConfFile) => void;


export declare type ConfItem = ConfItemContext & {
	[key: string]: ConfItem | undefined;
};

interface ConfItemContext {
	readonly _name: string;
	readonly _root: true | undefined;
	readonly _comments: string[];
	readonly _isVerbatim: boolean;
	_value: string;

	_remove(name: string, index?: number): this;
	_add(name: string, value: string, children?: NginxParseTreeNode[], comments?: string[], options?: { isVerbatim?: true }): this;
	_addVerbatimBlock(name: string, value: string, comments?: string[]): this;
	_getString(depth?: number): string;

	toString(): string;
}

export {};
