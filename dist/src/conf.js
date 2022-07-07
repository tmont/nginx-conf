"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NginxConfFile = void 0;
const fs = __importStar(require("fs"));
const events = __importStar(require("events"));
const parser = __importStar(require("./parser"));
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
const createConfItem = (file, target, node, isRoot = false) => {
    const name = node.name;
    let value = node.value;
    const children = node.children;
    const comments = node.comments || [];
    const newContext = {
        _remove: (name, index) => {
            index = Math.max(index || 0, 0);
            const item = newContext;
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
        _add: function (name, value, children, comments, options = {}) {
            if (name in blacklistedNames) {
                throw new Error(`The name "${name}" is reserved`);
            }
            const item = newContext;
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
        _addVerbatimBlock: function (name, value, comments) {
            return newContext._add(name, value, null, comments, {
                isVerbatim: true
            });
        },
        _getString: function (depth) {
            const item = newContext;
            depth = depth || +!item._root;
            const prefix = new Array(depth).join(file.tab);
            let buffer = '';
            let i;
            if (item._comments.length) {
                for (i = 0; i < item._comments.length; i++) {
                    buffer += '#' + item._comments[i] + '\n';
                }
            }
            buffer += prefix + (!item._root ? item._name : '');
            if (item._isVerbatim) {
                buffer += ' {' + (item._value || '') + '}';
            }
            else if (item._value) {
                buffer += ' ' + item._value;
            }
            const properties = Object.keys(newContext)
                .filter(function (key) {
                return typeof (item[key]) !== 'function';
            })
                .map(function (key) {
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
            }
            else if (!item._root) {
                if (!item._isVerbatim) {
                    buffer += ';';
                }
                buffer += '\n';
            }
            return buffer;
        },
        toString: function () {
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
    const defineProperty = (name, value) => {
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
    if (isRoot) {
        defineProperty('_root', true);
    }
    const item = newContext;
    if (name) {
        const existing = target[name];
        if (existing) {
            existing.push(item);
        }
        else if (!isRoot) {
            // this whole interface is kinda weird, but basically the "root"
            // is treated differently as it's just attached to the NginxConfFile
            // instance on the "nginx" property, so we don't actually want to do
            // anything if the we're operating on the "root" node
            target[name] = [item];
        }
    }
    if (children) {
        for (let i = 0; i < children.length; i++) {
            createConfItem(file, item, children[i]);
        }
    }
    return item;
};
class NginxConfFile extends events.EventEmitter {
    constructor(tree, options = {}) {
        super();
        this.files = [];
        this.tab = options.tab || '    ';
        this._name = 'NginxConfFile';
        this.liveListener = () => {
            this.flush();
        };
        this.writeTimeout = null;
        this.nginx = createConfItem(this, this, {
            name: 'nginx',
            children: null,
            comments: [],
            isBlock: false,
            isVerbatim: false,
            parent: null,
            value: '',
        }, true);
        const children = tree.children || [];
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            createConfItem(this, this.nginx, node);
        }
    }
    live(file) {
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
    die(file) {
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
    write(callback) {
        if (!this.files.length) {
            callback && callback(null, false);
            return;
        }
        const contents = this.toString();
        const len = this.files.length;
        const errors = [];
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
    flush(callback) {
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
    toString() {
        return this.nginx.toString();
    }
    static create(file, options, callback) {
        let opts;
        if (typeof (options) === 'function') {
            callback = options;
            opts = {};
        }
        else {
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
    static createFromSource(source, options, callback) {
        let opts;
        if (typeof (options) === 'function') {
            callback = options;
            opts = {};
        }
        else {
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
exports.NginxConfFile = NginxConfFile;
//# sourceMappingURL=conf.js.map