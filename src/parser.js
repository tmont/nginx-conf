var fs = require('fs');

function NginxParseTreeNode(name, value, parent, children) {
	this.name = name || '';
	this.value = value || '';
	this.parent = parent || null;
	this.children = children || [];
	this.comments = [];
	this.isVerbatim = false;
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
			callback && callback(this.error, this.tree);
			return;
		}
	} while (this.index < this.source.length);

	callback && callback(this.error, this.tree);
};

NginxParser.prototype.parseNext = function() {
	var c = this.source.charAt(this.index),
		value;

	if (!c) {
		return;
	}

	switch (c) {
		case '{':
		case ';':
			this.context.value = this.context.value.trim();
			this.context.parent.children.push(this.context);

			if (c === '{' && this.context.name && /_by_lua_block$/.test(this.context.name)) {
				//special handling of lua blocks: they are not treated as a regular "block", which would
				//have child directives and stuff. lua "blocks" are just lua code surrounded by "{ }".
				if (this.context.value) {
					//there's already a value set, that means something is weird (pretty sure this is invalid...)
					//basically the "lol" in something like this: content_by_lua_block lol { echo 'hello' }
					this.setError(
						'Already a value set for Lua block (alert nginx-conf developers if your syntax is valid)'
					);
					break;
				}

				this.context.value = this.readVerbatimBlock();
				this.context.isVerbatim = true;
				this.context = new NginxParseTreeNode(null, null, this.context.parent);
			} else {
				//new context is child of current context, or a sibling to the parent
				this.context = new NginxParseTreeNode(null, null, c === '{' ? this.context : this.context.parent);
			}

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
				this.context.name = this.readString();
			} else {
				this.context.value += this.readString();
			}
			break;
		case '#':
			this.context.comments.push(this.readComment());
			break;
		default:
			value = this.readWord();
			var trimmedValue = value.trim();
			if (trimmedValue === '#') {
				// if value starts with whitespace and encounters a "#", we're at a comment.
				// we can't delimit words by "#" because comments can only appear outside of directives.
				// http://nginx.org/en/docs/beginners_guide.html#conf_structure
				this.index--;
				break;
			}
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
	var result = /^(.+?)[\s;{}'"]/.exec(this.source.substring(this.index));
	if (!result) {
		this.setError('Word not terminated. Are you missing a semicolon?');
		return '';
	}
	this.index += result[1].length;

	var word = result[1];
	if (word[word.length - 1] === '$' && this.source[this.index] === '{') {
		// interpolated variable, e.g. ${foo}, read until "}"
		result = /^(.+?})/.exec(this.source.substring(this.index));
		if (!result) {
			this.setError('Expected closing bracket "}" for interpolated variable');
			return word;
		}

		word += result[1];
		this.index += result[1].length;
		// if the current char is not whitespace, ";" or "{", there is more to the word
		if (!/[\s{;]/.test(this.source[this.index])) {
			word += this.readWord();
		}
	}

	return word;
};

NginxParser.prototype.readComment = function() {
	var result = /(.*?)(?:\r\n|\n|$)/.exec(this.source.substring(this.index));
	this.index += result ? result[0].length : 0;
	return result[1].substring(1); //ignore # character
};

NginxParser.prototype.readVerbatimBlock = function() {
	//can't just use regex because it has to count the number of matching {}
	//NOTE: this will break for lua comments that contain "{" or "}"
	var openingBrackets = 0,
		closingBrackets = 0,
		current,
		result = '';

	while (current = this.source.charAt(this.index)) {
		switch (current) {
			case '}':
				closingBrackets++;
				break;
			case '{':
				openingBrackets++;
				break;
		}

		result += current;
		this.index++;

		if (openingBrackets === closingBrackets) {
			break;
		}
	}

	if (openingBrackets !== closingBrackets) {
		this.setError('Verbatim bock not terminated. Are you missing a closing curly bracket?');
		return '';
	}

	return result.replace(/^{/, '').replace(/}$/, '');
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
