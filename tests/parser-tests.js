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

		it('should parse directive with quoted name', function(done) {
			parser.parse('"foo" bar;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', '"foo"');
				tree.children[0].should.have.property('value', 'bar');
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

		it('should parse directive with interpolated variable', function(done) {
			parser.parse('foo bar${baz}bat;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);

				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar${baz}bat');
				done();
			});
		});

		it('should parse directive that ends with interpolated variable', function(done) {
			parser.parse('foo bar${baz};', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);

				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar${baz}');
				done();
			});
		});

		it('should parse directive with interpolated variable and whitespace', function(done) {
			parser.parse('foo bar${baz} bat;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);

				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar${baz} bat');
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

		it('should handle consecutive strings', function(done) {
			parser.parse('foo "bar" "baz";', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', '"bar" "baz"');
				done();
			});
		});

		it('should handle multiple values with string that starts with opening curly bracket', function(done) {
			//edge case found after trying to parse a logstash_json log_format
			parser.parse('foo bar \'{\';', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar \'{\'');
				done();
			});
		});

		it('should parse value with interpolated variable', function(done) {
			parser.parse('foo "bar${var}";', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', '"bar${var}"');
				done();
			});
		});

		it('should parse value with interpolated variable and whitespace', function(done) {
			parser.parse('foo "bar${var}  ";', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', '"bar${var}  "');
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

		it('should parse lua block', function(done) {
			parser.parse('content_by_lua_block { ngx.say(ngx.var.arg_a) }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);

				tree.children[0].should.have.property('name', 'content_by_lua_block');
				tree.children[0].should.have.property('value', ' ngx.say(ngx.var.arg_a) ');
				tree.children[0].should.have.property('isVerbatim', true);
				done();
			});
		});

		it('should parse lua block with nested curly brackets', function(done) {
			parser.parse('content_by_lua_block { lol { foo {} } }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);

				tree.children[0].should.have.property('name', 'content_by_lua_block');
				tree.children[0].should.have.property('value', ' lol { foo {} } ');
				tree.children[0].should.have.property('isVerbatim', true);
				done();
			});
		});

		it('should parse lua block with newlines', function(done) {
			parser.parse('content_by_lua_block { ngx.say(ngx.var.arg_a)\nend }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);

				tree.children[0].should.have.property('name', 'content_by_lua_block');
				tree.children[0].should.have.property('value', ' ngx.say(ngx.var.arg_a)\nend ');
				tree.children[0].should.have.property('isVerbatim', true);
				done();
			});
		});

		it('should parse directive following a lua block', function(done) {
			parser.parse('content_by_lua_block { echo \'foo\' } foo bar;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(2);

				tree.children[0].should.have.property('name', 'content_by_lua_block');
				tree.children[0].should.have.property('value', ' echo \'foo\' ');
				tree.children[0].should.have.property('isVerbatim', true);
				tree.children[1].should.have.property('name', 'foo');
				tree.children[1].should.have.property('value', 'bar');
				done();
			});
		});

		it('should parse if statement', function(done) {
			parser.parse('if ($bad) { return 403; }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);

				tree.children[0].should.have.property('name', 'if');
				tree.children[0].should.have.property('value', '($bad)');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'return');
				tree.children[0].children[0].should.have.property('value', '403');
				done();
			});
		});

		it('should parse if statement with regex and newlines', function(done) {
			parser.parse('if ($http_cookie ~* "id=([^;]+)(?:;|$)") \n{\n set $id $1;\n }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);

				tree.children[0].should.have.property('name', 'if');
				tree.children[0].should.have.property('value', '($http_cookie ~* "id=([^;]+)(?:;|$)")');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'set');
				tree.children[0].children[0].should.have.property('value', '$id $1');
				done();
			});
		});

		it('should handle if statement with fragment', function(done) {
			var source = 'if ($http_cookie ~* "id=([^;]+)(?:;|$)") {\n\
  rewrite ^/(.*)$ https://$http_host/#/login?$args?;\n\
}\n';
			parser.parse(source, function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'if');
				tree.children[0].should.have.property('value', '($http_cookie ~* "id=([^;]+)(?:;|$)")');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'rewrite');
				tree.children[0].children[0].should.have.property('value', '^/(.*)$ https://$http_host/#/login?$args?');
				done();
			});
		});

		it('should parse value with interpolated variable that opens scope immediately afterward', function(done) {
			parser.parse('foo bar${var}{ hi; }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar${var}');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'hi');
				done();
			});
		});
	});

	describe('invalid and weird syntax', function() {
		it('directive not terminated with ";"', function(done) {
			parser.parse('foo', function(err) {
				should.exist(err);
				err.should.have.property('message', 'Word not terminated. Are you missing a semicolon?');
				done();
			});
		});

		it('directive value not terminated with ";"', function(done) {
			parser.parse('foo bar', function(err) {
				should.exist(err);
				err.should.have.property('message', 'Word not terminated. Are you missing a semicolon?');
				done();
			});
		});

		it('*_by_lua_block directive not terminated with "}"', function(done) {
			parser.parse('foo_by_lua_block { ngx.say(\'Hello,world!\')', function(err) {
				should.exist(err);
				err.should.have.property('message', 'Verbatim bock not terminated. Are you missing a closing curly bracket?');
				done();
			});
		});

		it('*_by_lua_block directive with mismatched curly brackets', function(done) {
			parser.parse('foo_by_lua_block { foo {} ', function(err) {
				should.exist(err);
				err.should.have.property('message', 'Verbatim bock not terminated. Are you missing a closing curly bracket?');
				done();
			});
		});

		it('*_by_lua_block should blow up if mismatched curly bracket is in a comment', function(done) {
			parser.parse('foo_by_lua_block {\n-- this is a comment }\n } ', function(err) {
				should.exist(err);
				err.should.have.property('message', 'Word not terminated. Are you missing a semicolon?');
				done();
			});
		});

		it('directive semicolon after comment', function(done) {
			parser.parse('foo # comment\n bar;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar');
				tree.children[0].children.should.have.length(0);
				done();
			});
		});

		it('directive opening brace after comment', function(done) {
			parser.parse('foo # comment\n { bar; }', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', '');
				tree.children[0].children.should.have.length(1);
				tree.children[0].children[0].should.have.property('name', 'bar');
				tree.children[0].children[0].should.have.property('value', '');
				done();
			});
		});

		it('missing closing brace should not throw', function(done) {
			parser.parse('foo { bar;', function(err) {
				should.not.exist(err);
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

		it('should attach comments before directive to current node', function(done) {
			parser.parse('# this is a comment\nfoo bar;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar');
				tree.children[0].comments.should.have.length(1);
				tree.children[0].comments[0].should.equal(' this is a comment');
				done();
			});
		});

		it('should attach multiple comments to current node', function(done) {
			parser.parse('# this is a comment\n#another comment\nfoo bar;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar');
				tree.children[0].comments.should.have.length(2);
				tree.children[0].comments[0].should.equal(' this is a comment');
				tree.children[0].comments[1].should.equal('another comment');
				done();
			});
		});

		it('should attach comment in middle of directive to current node', function(done) {
			parser.parse('foo # this is a comment\nbar;', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar');
				tree.children[0].comments.should.have.length(1);
				tree.children[0].comments[0].should.equal(' this is a comment');
				done();
			});
		});

		it('should ignore comments at end of source', function(done) {
			parser.parse('foo bar; # this is a comment', function(err, tree) {
				should.not.exist(err);
				should.exist(tree);
				tree.children.should.have.length(1);
				tree.children[0].should.have.property('name', 'foo');
				tree.children[0].should.have.property('value', 'bar');
				tree.children[0].comments.should.have.length(0);
				done();
			});
		});
	});
});
