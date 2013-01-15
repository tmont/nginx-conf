var pkg = require('./package.json'),
	parser = require('./src/parser');

exports.version = pkg.version;
exports.NginxConfFile = require('./src/conf').NginxConfFile;
exports.NginxParser = parser.NginxParser;
exports.parseFile = parser.parseFile;
exports.parse = parser.parse;