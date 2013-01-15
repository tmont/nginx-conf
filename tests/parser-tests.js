var should = require('should'),
	parser = require('../');

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

		it('should preserve linebreaks in values', function(done) {
			parser.parse('foo bar\n  baz;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar\n  baz');
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

	describe('comments', function() {
		it('should ignore comments on their own line', function(done) {
			parser.parse('# comment\nfoo;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				done();
			});
		});

		it('should ignore comments on same line as directive', function(done) {
			parser.parse('foo; # comment', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				done();
			});
		});
	});

	describe('scopes', function() {
		it('should parse children', function(done) {
			parser.parse('foo { bar; }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'bar');
				done();
			});
		});

		it('should parse siblings with children', function(done) {
			parser.parse('foo { bar baz; } sibling; foo2 { bar2 baz2; }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(3);

				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'bar');
				tree.children[0].children[0].should.have.property('value', 'baz');

				tree.children[1].should.have.property('name', 'sibling');

				tree.children[2].should.have.property('name', 'foo2');
				tree.children[2].children.should.have.length(1);
				tree.children[2].children[0].should.have.property('name', 'bar2');
				tree.children[2].children[0].should.have.property('value', 'baz2');
				done();
			});
		});

		it('should parse nested children', function(done) {
			parser.parse('foo { bar { baz { bat; } } }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);

				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'bar');
				tree.children[0].children[0].children.should.have.length(1);
				tree.children[0].children[0].children[0].should.have.property('name', 'baz');
				tree.children[0].children[0].children[0].children.should.have.length(1);
				tree.children[0].children[0].children[0].children[0].should.have.property('name', 'bat');
				done();
			});
		});

		it('should parse named scope', function(done) {
			parser.parse('upstream backend { server 127.0.0.1:3000; }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);

				tree.children[0].should.have.property('name', 'upstream');
				tree.children[0].should.have.property('value', 'backend');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'server');
				tree.children[0].children[0].should.have.property('value', '127.0.0.1:3000');
				done();
			});
		});
	});
});