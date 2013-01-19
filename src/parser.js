var fs = require('fs');

function NginxParseTreeNode(name, value, parent, children) {
	this.name = name || '';
	this.value = value || '';
	this.parent = parent || null;
	this.children = children || [];
	this.comments = [];
}

function NginxParser() {
	this.source = '';
	this.index = -1;
	this.tree = null;
	this.context = null;
	this.error = null;
}

NginxParser.prototype.parse = function(source, callback) {
	this.source = source;
	this.index = 0;
	this.tree = new NginxParseTreeNode('[root]');
	this.context = new NginxParseTreeNode(null, null, this.tree);
	this.error = null;

	do {
		this.parseNext();
		if (this.error) {
			callback && callback(this.error);
			return;
		}
	} while (this.index < this.source.length);

	callback && callback(this.error, this.tree);
};

NginxParser.prototype.parseNext = function() {
	var c = this.source.charAt(this.index),
		value;

	switch (c) {
		case '{':
		case ';':
			this.context.value = this.context.value.trim();
			this.context.parent.children.push(this.context);

			//new context is child of current context, or a sibling to the parent
			this.context = new NginxParseTreeNode(null, null, c === '{' ? this.context : this.context.parent);
			this.index++;
			break;
		case '}':
			//new context is sibling to the parent
			this.context = new NginxParseTreeNode(null, null, this.context.parent.parent);
			this.index++;
			break;
		case '\n':
		case '\r':
			if (this.context.value) {
				this.context.value += c;
			}
			this.index++;
			break;
		case '\'':
		case '"':
			if (!this.context.name) {
				this.setError('Found a string but expected a directive');
				return;
			}

			this.context.value += this.readString();
			break;
		case '#':
			this.context.comments.push(this.readComment());
			break;
		default:
			value = this.readWord();
			if (!this.context.name) {
				this.context.name = value.trim();
				//read trailing whitespace
				var ws = /^\s*/.exec(this.source.substring(this.index));
				if (ws) {
					this.index += ws[0].length;
				}
			} else {
				this.context.value += value;
			}
			break;
	}
};

NginxParser.prototype.readString = function() {
	var delimiter = this.source.charAt(this.index),
		value = delimiter;
	for (var i = this.index + 1; i < this.source.length; i++) {
		if (this.source.charAt(i) === '\\') {
			value += this.source.charAt(i) + this.source.charAt(i + 1);
			i++;
			continue;
		}
		if (this.source.charAt(i) === delimiter) {
			value += delimiter;
			break;
		}

		value += this.source.charAt(i);
	}

	if (value.length < 2 || value.charAt(value.length - 1) !== delimiter) {
		this.setError('Unable to parse quote-delimited value (probably an unclosed string)');
		return '';
	}
	this.index += value.length;
	return value;
};

NginxParser.prototype.setError = function(message) {
	var line = (this.source.substring(0, this.index).match(/\n/g) || []).length + 1;

	this.error = {
		message: message,
		index: this.index,
		line: line
	};
};

NginxParser.prototype.readWord = function() {
	var result = /(.+?)[\s#;{}]/.exec(this.source.substring(this.index));
	if (!result) {
		this.setError('Word not terminated. Are you missing a semicolon?');
		return '';
	}
	this.index += result[1].length;
	return result[1];
};

NginxParser.prototype.readComment = function() {
	var result = /(.*?)(?:\r\n|\n|$)/.exec(this.source.substring(this.index));
	this.index += result ? result[0].length : 0;
	return result[1].substring(1); //ignore # character
};

NginxParser.prototype.parseFile = function(file, encoding, callback) {
	var parser = this;
	fs.readFile(file, encoding, function(err, contents) {
		if (err) {
			callback && callback(err);
			return;
		}

		parser.parse(contents, callback);
	});
};

exports.NginxParser = NginxParser;
exports.parse = function(source, callback) {
	new NginxParser().parse(source, callback);
};
exports.parseFile = function(file, encoding, callback) {
	new NginxParser().parseFile(file, encoding, callback);
};
