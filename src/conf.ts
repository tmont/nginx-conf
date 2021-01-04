import * as fs from 'fs';
import * as events from 'events';
import {NginxParseTreeNode} from './parser';
import * as parser from './parser';

const blacklistedNames = {
	_name: 1,
	_value: 1,
	_remove: 1,
	_add: 1,
	_getString: 1,
	_root: 1,
	toString: 1,
	_comments: 1,
	_isVerbatim: 1,
	_addVerbatimBlock: 1,
	__isBlock: 1,
};

export interface NginxConfOptions {
	tab?: string;
}

interface NginxConfItemApi {
	_remove(name: string, index?: number): this;
	_add(
		name: string,
		value?: string | number | null,
		children?: NginxParseTreeNode[] | null,
		comments?: string[],
		options?: AddOptions,
	): this;
	_addVerbatimBlock(name: string, value: string, comments?: string[]): this;
	_getString(depth: number): string;
	toString(): string;
}

interface NginxConfItemProps {
	_name: string;
	_value: string | number;
	_root: boolean;
	_comments: string[];
	_isVerbatim: boolean;
	__isBlock: boolean;
}

interface IndexableConfItem {
	[key: string]: NginxConfItem[] | undefined;
}

export type NginxConfItem = NginxConfItemApi & IndexableConfItem & NginxConfItemProps;

interface AddOptions {
	isVerbatim?: boolean;
}

const createConfItem = (file: NginxConfFile, target: IndexableConfItem, node: NginxParseTreeNode): NginxConfItem => {
	const name = node.name;
	let value = node.value;
	const children = node.children;
	const comments = node.comments || [];

	const newContext: NginxConfItemApi = {
		_remove: (name, index) => {
			index = Math.max(index || 0, 0);

			const item = newContext as NginxConfItem;

			const node = item[name];
			if (!node) {
				return newContext;
			}

			if (node[index]) {
				const removed = node.splice(index, 1);
				if (removed.length) {
					file.emit('removed', removed[0]);
				}
			}

			return item;
		},

		_add: function(name, value, children, comments, options = {}) {
			if (name in blacklistedNames) {
				throw new Error(`The name "${name}" is reserved`);
			}

			const item = newContext as NginxConfItem;

			const node = createConfItem(file, item, {
				name: name,
				value: (value || '').toString(),
				children: children || null,
				comments: comments || [],
				isVerbatim: !!options.isVerbatim,
				isBlock: !!children,
				parent: null,
			});
			file.emit('added', node);

			return item;
		},

		_addVerbatimBlock: function(name, value, comments) {
			return newContext._add(name, value, null, comments, {
				isVerbatim: true
			});
		},

		_getString: function(depth: number) {
			const item = newContext as NginxConfItem;
			depth = depth || +!item._root;
			const prefix = new Array(depth).join(file.tab);
			let buffer = '';
			let i: number;

			if (item._comments.length) {
				for (i = 0; i < item._comments.length; i++) {
					buffer += '#' + item._comments[i] + '\n';
				}
			}

			buffer += prefix + (!item._root ? item._name : '');

			if (item._isVerbatim) {
				buffer += ' {' + (item._value || '') + '}';
			} else if (item._value) {
				buffer += ' ' + item._value;
			}

			const properties = Object.keys(newContext)
				.filter(function(key) {
					return typeof(item[key]) !== 'function';
				})
				.map(function(key) {
					return item[key];
				});

			if (item.__isBlock || properties.length) {
				if (!item._root) {
					buffer += ' {\n';
				}
				for (i = 0; i < properties.length; i++) {
					const prop = properties[i];
					if (Array.isArray(prop)) {
						for (let j = 0; j < prop.length; j++) {
							buffer += prop[j]._getString(depth + 1);
						}
					}
				}
				if (!item._root) {
					buffer += prefix + '}\n';
				}
			} else if (!item._root) {
				if (!item._isVerbatim) {
					buffer += ';';
				}
				buffer += '\n';
			}

			return buffer;
		},

		toString: function() {
			return newContext._getString(0);
		}
	};

	Object.defineProperty(newContext, '_value', {
		enumerable: false,
		get: () => value,
		set: (newValue) => {
			newValue = newValue.toString();
			if (value === newValue) {
				return;
			}

			const oldValue = value;
			value = newValue;
			file.emit('changed', newContext, oldValue);
		}
	});

	const defineProperty = <K extends keyof NginxConfItemProps>(name: K, value: NginxConfItemProps[K]): void => {
		Object.defineProperty(newContext, name, {
			enumerable: false,
			value,
			writable: false
		});
	};

	// This property is for *internal* use only!
	// When this property is true, the item is definitely a block, but the
	// reverse implication may not apply! It's just a hack to ensure that empty
	// blocks are rendered as blocks.
	defineProperty('__isBlock', node.isBlock);
	defineProperty('_isVerbatim', node.isVerbatim);
	defineProperty('_name', name);
	defineProperty('_comments', comments);

	const item = newContext as NginxConfItem;

	if (name) {
		const existing = target[name];
		if (existing) {
			existing.push(item);
		} else {
			if (name === 'nginx') {
				// TODO: ugh
				(target as any)[name] = item;
			} else {
				target[name] = [item];
			}
		}
	}

	if (children) {
		for (let i = 0; i < children.length; i++) {
			createConfItem(file, item, children[i]);
		}
	}

	return item;
};

export class NginxConfFile extends events.EventEmitter {
	public readonly tab: string;
	public readonly _name: string;
	public readonly nginx: NginxConfItem;

	private readonly files: string[];
	private readonly liveListener: () => void;
	private writeTimeout: NodeJS.Timeout | null;

	public constructor(tree: NginxParseTreeNode, options: NginxConfOptions = {}) {
		super();
		this.files = [];
		this.tab = options.tab || '    ';
		this._name = 'NginxConfFile';
		this.liveListener = () => {
			this.flush();
		};
		this.writeTimeout = null;

		createConfItem(this, this as any as IndexableConfItem, {
			name: 'nginx',
			children: null,
			comments: [],
			isBlock: false,
			isVerbatim: false,
			parent: null,
			value: '',
		});
		Object.defineProperty(this.nginx, '_root', {
			writable: false,
			value: true,
			enumerable: false
		});

		const children = tree.children || [];
		for (let i = 0; i < children.length; i++) {
			const node = children[i];
			createConfItem(this, this.nginx, node);
		}
	}

	public live(file: string): this {
		if (this.files.indexOf(file) === -1) {
			this.files.push(file);
			if (this.files.length === 1) {
				this.on('added', this.liveListener);
				this.on('removed', this.liveListener);
				this.on('changed', this.liveListener);
			}
		}

		return this;
	}

	public die(file: string): this {
		const index = this.files.indexOf(file);
		if (index !== -1) {
			this.files.splice(index, 1);
			if (!this.files.length) {
				this.removeListener('added removed changed', this.liveListener);
			}
		}

		return this;
	}

	/**
	 * To handle potentially concurrent writes, use flush() instead.
	 */
	public write(callback?: (errors: Error[] | null, wrote: boolean) => void): void {
		if (!this.files.length) {
			callback && callback(null, false);
			return;
		}

		const contents = this.toString();
		const len = this.files.length;
		const errors: Error[] = [];
		let completed = 0;

		for (const file of this.files) {
			fs.writeFile(file, contents, 'utf8', function (err) {
				err && errors.push(err);
				completed++;
				if (completed === len) {
					callback && callback(errors.length ? errors : null, true);
				}
			});
		}
	}

	public flush(callback?: (errors?: Error[] | null) => void): void {
		if (this.writeTimeout) {
			clearTimeout(this.writeTimeout);
		}

		//the call to write() gets shoved into the event loop so that
		//you can modify the tree more than once without hoping that
		//no race conditions occur

		//e.g. conf._remove('foo'); conf._remove('bar'); will only issue
		//one call to write(), eliminating any possible race conditions
		this.writeTimeout = setTimeout(() => {
			this.write((err, wrote) => {
				if (!err && wrote) {
					this.emit('flushed');
				}

				callback && callback(err);
			});
		}, 1);
	}

	public toString(): string {
		return this.nginx.toString();
	}

	public static create(
		file: string,
		options?: NginxConfOptions | ((err: Error | null, conf?: NginxConfFile) => void) | null,
		callback?: (err: Error | null, conf?: NginxConfFile) => void,
	): void {
		let opts: NginxConfOptions;
		if (typeof(options) === 'function') {
			callback = options;
			opts = {};
		} else {
			opts = options || {};
		}

		parser.parseFile(file, 'utf8', (err, tree) => {
			if (err) {
				callback && callback(err);
				return;
			}
			if (!tree) {
				callback && callback(new Error('tree could not be generated'));
				return;
			}

			callback && callback(null, new NginxConfFile(tree, opts).live(file));
		});
	}

	public static createFromSource(
		source: string,
		options?: NginxConfOptions | ((err: Error | null, conf?: NginxConfFile) => void) | null,
		callback?: (err: Error | null, conf?: NginxConfFile) => void,
	): void {
		let opts: NginxConfOptions;
		if (typeof(options) === 'function') {
			callback = options;
			opts = {};
		} else {
			opts = options || {};
		}

		parser.parse(source, (err, tree) => {
			if (err) {
				callback && callback(err);
				return;
			}
			if (!tree) {
				callback && callback(new Error('tree could not be generated'));
				return;
			}

			callback && callback(null, new NginxConfFile(tree, opts));
		});
	}
}
