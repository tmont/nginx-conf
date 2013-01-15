var parseFile = require('./parser').parseFile,
	EventEmitter = require('events').EventEmitter;

function createConfItem(file, context, name, value) {
	context[name] = {
		get value() {
			return value;
		},
		set value(newValue) {
			newValue = newValue.toString();
			if (value === newValue) {
				return;
			}

			var oldValue = value;
			value = newValue;
			file.emit('changed', context, name, value, oldValue);
		},

		get name() {
			return name;
		},

		remove: function() {
			delete context[name];
			file.emit('removed', context, name);
		},

		add: function(name, value) {
			createConfItem(file, context, name, value);
			file.emit('added', context, name);
			return this;
		},

		toString: function() {
			return this.getString(1);
		},

		getString: function(depth) {
			depth = depth || 1;
			var prefix = new Array(depth).join('  '),
				buffer = prefix + this.name;

			if (!this.value) {
				buffer += ';';
			} else if (typeof(this.value) === 'object') {
				buffer += ' {\n';
				for (var key in Object.keys(this.value)) {
					buffer += this.value[key].getString(depth + 1);
				}
				buffer += prefix + '}';
			} else {
				buffer += ' ' + this.value + ';';
			}

			return buffer + '\n';
		}
	};

	if (typeof(value) === 'object') {
		value = createConfItem(file, context[name], value);
	}
}

function NginxConfFile(tree) {
	this.nginx = {};
	this.files = [];

	for (var i = 0; i < tree.nodes.length; i++) {
		var node = tree.nodes[i];
		createConfItem(this, this.nginx, node.name, node.value);
	}
}

NginxConfFile.prototype.__proto__ = EventEmitter.prototype;

NginxConfFile.prototype.live = function(file) {
	if (this.files.indexOf(file) === -1) {
		this.files.push(file);
	}

	return this;
};

NginxConfFile.prototype.die = function(file) {
	var index = this.files.indexOf(file);
	if (index !== -1) {
		this.files.splice(index, 1);
	}

	return this;
};

NginxConfFile.create = function(file, options, callback) {
	options = options || {};
	parseFile(file, options.encoding || 'utf8', function(err, tree) {
		if (err) {
			callback && callback(err);
			return;
		}

		callback && callback(new NginxConfFile(tree).live(file));
	});
};