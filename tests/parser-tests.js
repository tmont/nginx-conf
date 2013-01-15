var should = require('should'),
	parser = require('../src/parser');

describe('parser', function() {
	describe('basic directive parsing', function() {
		it('should parse directive with no value', function(done) {
			parser.parse('foo;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				done();
			});
		});

		it('should parse directive with value', function(done) {
			parser.parse('foo bar;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar');
				done();
			});
		});

		it('should parse multiple directives on same line', function(done) {
			parser.parse('foo bar; baz bat;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(2);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar');
				tree.children[1].should.have.property('name', 'baz');
				tree.children[1].should.have.property('value', 'bat');
				done();
			});
		});

		it('should parse multiple directives on different lines', function(done) {
			parser.parse('foo bar;\nbaz bat;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(2);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar');
				tree.children[1].should.have.property('name', 'baz');
				tree.children[1].should.have.property('value', 'bat');
				done();
			});
		});

		it('should parse directive with space-delimited values', function(done) {
			parser.parse('foo bar baz bat;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar baz bat');
				done();
			});
		});

		it('should err when missing semicolon', function(done) {
			parser.parse('foo', function(err, tree) {
				should.exist(err);
				err.should.have.property('line', 1);
				err.should.have.property('index', 0);
				err.should.have.property('message', 'Unable to read value (are you missing a semicolon?)');
				done();
			});
		});
	});

	describe('strings', function() {
		it('should parse value with double quote-delimited string', function(done) {
			parser.parse('foo "bar";', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', '"bar"');
				done();
			});
		});

		it('should parse value with single quote-delimited string', function(done) {
			parser.parse('foo \'bar\';', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', '\'bar\'');
				done();
			});
		});

		it('should parse double quote-delimited string with escaped double quote', function(done) {
			parser.parse('foo "ba \\"ba\\"";', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', '"ba \\"ba\\""');
				done();
			});
		});

		it('should parse single quote-delimited string with escaped single quote', function(done) {
			parser.parse('foo \'ba \\\'ba\\\'\';', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', '\'ba \\\'ba\\\'\'');
				done();
			});
		});

		it('should err if string is unclosed', function(done) {
			parser.parse('foo "foo;', function(err, tree) {
				should.exist(err);
				err.should.have.property('line', 1);
				err.should.have.property('index', 4);
				err.should.have.property('message', 'Unable to parse quote-delimited value (probably an unclosed string)');
				done();
			});
		});

		it('should err if directive starts with quote', function(done) {
			parser.parse('"foo";', function(err, tree) {
				should.exist(err);
				err.should.have.property('line', 1);
				err.should.have.property('index', 0);
				err.should.have.property('message', 'Found a string but expected a directive');
				done();
			});
		});
	});
});