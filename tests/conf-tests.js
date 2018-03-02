var should = require('should'),
	NginxConfFile = require('../').NginxConfFile;

describe('configuration editing', function() {
	describe('access', function() {
		it('top-level nodes', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('foo');
				file.nginx.foo.should.have.property('_name', 'foo');
				file.nginx.foo.should.have.property('_value', 'bar');
				done();
			});
		});

		it('nested nodes', function(done) {
			NginxConfFile.createFromSource('upstream backend { servers { server 127.0.0.1:8080; } }', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('upstream');
				file.nginx.upstream.should.have.property('_name', 'upstream');
				file.nginx.upstream.should.have.property('_value', 'backend');
				file.nginx.upstream.should.have.property('servers');
				file.nginx.upstream.servers.should.have.property('_value', '');
				file.nginx.upstream.servers.should.have.property('server');
				file.nginx.upstream.servers.server.should.have.property('_value', '127.0.0.1:8080');
				done();
			});
		});

		it('map block with quoted directive names', function(done) {
			NginxConfFile.createFromSource('map $http_user_agent $mobile { default 0; "~Opera Mini" 1; \'\' meh; }', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('map');
				file.nginx.map.should.have.property('_name', 'map');
				file.nginx.map.should.have.property('_value', '$http_user_agent $mobile');

				file.nginx.map.should.have.property('default');
				file.nginx.map.default.should.have.property('_name', 'default');
				file.nginx.map.default.should.have.property('_value', '0');

				file.nginx.map.should.have.property('"~Opera Mini"');
				file.nginx.map['"~Opera Mini"'].should.have.property('_name', '"~Opera Mini"');
				file.nginx.map['"~Opera Mini"'].should.have.property('_value', '1');

				file.nginx.map.should.have.property('\'\'');
				file.nginx.map['\'\''].should.have.property('_name', '\'\'');
				file.nginx.map['\'\''].should.have.property('_value', 'meh');
				done();
			});
		});

		it('nodes with same name', function(done) {
			NginxConfFile.createFromSource('location /foo { bar baz; } location /bar { bat qux; }', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('location');
				file.nginx.location.should.be.an.instanceOf(Array);
				file.nginx.location.should.have.length(2);
				file.nginx.location[0].should.have.property('bar');
				file.nginx.location[0].bar.should.have.property('_value', 'baz');
				file.nginx.location[1].should.have.property('bat');
				file.nginx.location[1].bat.should.have.property('_value', 'qux');
				done();
			});
		});

		it('adding comments', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('foo');
				file.nginx.foo._comments.should.have.length(0);
				file.nginx.foo._comments.push('new comment');
				file.nginx.foo._comments.should.have.length(1);
				done();
			});
		});

		it('removing comments', function(done) {
			NginxConfFile.createFromSource('#comment\nfoo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('foo');
				file.nginx.foo._comments.should.have.length(1);
				file.nginx.foo._comments[0].should.equal('comment');
				file.nginx.foo._comments.splice(0, 1);
				file.nginx.foo._comments.should.have.length(0);
				done();
			});
		});

		it('updating comments', function(done) {
			NginxConfFile.createFromSource('#comment\nfoo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('foo');
				file.nginx.foo._comments.should.have.length(1);
				file.nginx.foo._comments[0].should.equal('comment');
				file.nginx.foo._comments[0] = 'changed';
				file.nginx.foo._comments[0].should.equal('changed');
				done();
			});
		});
	});

	describe('events', function() {
		it('on add', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var count = 0;
				file.on('added', function(node) {
					count++;
					should.exist(node);
					node.should.have.property('_name', 'baz');
					node.should.have.property('_value', 'bat');
				});
				file.nginx.should.have.property('foo');
				file.nginx._add('baz', 'bat');
				count.should.equal(1);
				done();
			});
		});

		it('on remove', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var count = 0;
				file.on('removed', function(node) {
					count++;
					should.exist(node);
					node.should.have.property('_name', 'foo');
					node.should.have.property('_value', 'bar');
				});
				file.nginx.should.have.property('foo');
				file.nginx._remove('foo');
				count.should.equal(1);
				done();
			});
		});

		it('on value change', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var count = 0;
				file.on('changed', function(context, oldValue) {
					count++;
					should.exist(context);
					should.exist(oldValue);
					oldValue.should.equal('bar');
					context._value.should.equal('baz');
				});
				file.nginx.should.have.property('foo');
				file.nginx.foo._value = 'baz';
				count.should.equal(1);
				done();
			});
		});

		it('should not emit on change if value is unchanged', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var count = 0;
				file.on('changed', function() {
					count++;
				});
				file.nginx.should.have.property('foo');
				file.nginx.foo._value = 'bar';
				count.should.equal(0);
				done();
			});
		});

		it('should not emit on removal if node doesn\'t exist', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var count = 0;
				file.on('removed', function() {
					count++;
				});
				file.nginx.should.have.property('foo');
				file.nginx._remove('bar');
				count.should.equal(0);
				done();
			});
		});
	});

	describe('adding and removing nodes', function() {
		var blacklist = {
			_name: 1,
			_value: 1,
			_remove: 1,
			_add: 1,
			_getString: 1,
			_root: 1,
			toString: 1,
			_comments: 1,
			_isVerbatim: 1,
			_addVerbatimBlock: 1
		};
		for (var name in blacklist) {
			(function(name) {
				it('should not allow adding a node named "' + name + '"', function(done) {
					NginxConfFile.createFromSource('foo bar;', function(err, file) {
						should.not.exist(err);
						should.exist(file);
						var count = 0;
						file.on('added', function() {
							count++;
						});
						file.nginx.should.have.property('foo');
						try {
							file.nginx._add(name);
							done('Expected an error to be thrown');
						} catch (e) {
							e.should.have.property('message', 'The name "' + name + '" is reserved');
							count.should.equal(0);
							done();
						}
					});
				});
			}(name));
		}

		it('should add new block', function(done) {
			NginxConfFile.createFromSource('', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx._add('server');

				file.nginx.should.have.property('server');
				file.nginx.server._add('foo', 'bar');
				file.nginx.server.should.have.property('foo');
				file.nginx.server.foo.should.have.property('_value', 'bar');
				done();
			});
		});

		it('should add new block to existing blocks', function(done) {
			NginxConfFile.createFromSource('server {}', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('server');
				file.nginx._add('server');

				file.nginx.server.should.be.instanceOf(Array);
				file.nginx.server[1]._add('foo', 'bar');
				file.nginx.server[0].should.not.have.property('foo');
				file.nginx.server[1].should.have.property('foo');
				file.nginx.server[1].foo.should.have.property('_value', 'bar');
				done();
			});
		});

		it('should add new verbatim block', function(done) {
			NginxConfFile.createFromSource('', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx._addVerbatimBlock('content_by_lua_block', 'echo "hello"');

				file.nginx.should.have.property('content_by_lua_block');
				file.nginx.content_by_lua_block.should.have.property('_name', 'content_by_lua_block');
				file.nginx.content_by_lua_block.should.have.property('_value', 'echo "hello"');
				file.nginx.content_by_lua_block.should.have.property('_isVerbatim', true);

				file.toString().should.equal('content_by_lua_block {echo "hello"}\n');
				done();
			});
		});

		it('should create an array for multiple items', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('foo');
				file.nginx.foo.should.have.property('_value', 'bar');
				file.nginx._add('foo', 'baz');
				file.nginx._add('foo', 'bat');

				file.nginx.foo.should.be.an.instanceOf(Array);
				file.nginx.foo.should.have.length(3);
				file.nginx.foo[0].should.have.property('_value', 'bar');
				file.nginx.foo[1].should.have.property('_value', 'baz');
				file.nginx.foo[2].should.have.property('_value', 'bat');
				done();
			});
		});

		it('should create property with value and children', function(done) {
			NginxConfFile.createFromSource('location /foo { hello world; }', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('location');
				file.nginx.location.should.have.property('_value', '/foo');
				file.nginx.location.should.have.property('hello');
				file.nginx.location.hello.should.have.property('_value', 'world');
				done();
			});
		});

		it('should remove first item when index is not given', function(done) {
			NginxConfFile.createFromSource('foo bar; foo baz; foo bat;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('foo');
				file.nginx.foo.should.be.an.instanceOf(Array);
				file.nginx.foo.should.have.length(3);

				file.nginx._remove('foo');
				file.nginx.foo.should.have.length(2);
				file.nginx.foo[0].should.have.property('_value', 'baz');
				file.nginx.foo[1].should.have.property('_value', 'bat');
				done();
			});
		});

		it('should remove item at index', function(done) {
			NginxConfFile.createFromSource('foo bar; foo baz; foo bat;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('foo');
				file.nginx.foo.should.be.an.instanceOf(Array);
				file.nginx.foo.should.have.length(3);

				file.nginx._remove('foo', 1);
				file.nginx.foo.should.have.length(2);
				file.nginx.foo[0].should.have.property('_value', 'bar');
				file.nginx.foo[1].should.have.property('_value', 'bat');
				done();
			});
		});

		it('should flatten array into property when only one item remains', function(done) {
			NginxConfFile.createFromSource('foo bar; foo baz;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				file.nginx.should.have.property('foo');
				file.nginx.foo.should.be.an.instanceOf(Array);
				file.nginx.foo.should.have.length(2);

				file.nginx._remove('foo', 0);
				file.nginx.foo.should.not.be.an.instanceOf(Array);
				file.nginx.foo.should.have.property('_value', 'baz');
				done();
			});
		});
	});

	describe('converting to nginx-compatible string', function() {
		it('should convert to an nginx-compatible string', function(done) {
			NginxConfFile.createFromSource('foo bar; baz { bat qux; }', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				var expected =
'foo bar;\n\
baz {\n\
    bat qux;\n\
}\n';

				actual.should.equal(expected);
				done();
			});
		});

		it('should convert to an nginx-compatible string with custom TAB', function(done) {
			NginxConfFile.createFromSource('foo bar; baz { bat qux; }', { tab: '  ' }, function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				var expected =
'foo bar;\n\
baz {\n\
  bat qux;\n\
}\n';

				actual.should.equal(expected);
				done();
			});
		});

		it('should handle directives with the same name', function(done) {
			NginxConfFile.createFromSource('foo bar; location { meh; } location { meep; } foo bat;', { tab: '  ' }, function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				var expected =
'foo bar;\n\
foo bat;\n\
location {\n\
  meh;\n\
}\n\
location {\n\
  meep;\n\
}\n';

				actual.should.equal(expected);
				done();
			});
		});

		it('should output comments above directive regardless of original position', function(done) {
			NginxConfFile.createFromSource('# first\nfoo # second\nbar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				var expected =
'# first\n\
# second\n\
foo bar;\n';

				actual.should.equal(expected);
				done();
			});
		});

		it('should handle line breaks and consecutive strings', function(done) {
			var source = 'foo bar \'{\'\n  \'"foo": "bar"\'\n\'}\';';
			NginxConfFile.createFromSource(source, function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				actual.should.equal(source + '\n');
				done();
			});
		});

		it('should handle blocks with quoted strings', function(done) {
			var source = 'map $http_user_agent $mobile { default 0; "~Opera Mini" 1; *.foo 2; }';
			NginxConfFile.createFromSource(source, { tab: '  ' }, function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				var expected =
'map $http_user_agent $mobile {\n\
  default 0;\n\
  "~Opera Mini" 1;\n\
  *.foo 2;\n\
}\n';

				actual.should.equal(expected);
				done();
			});
		});

		it('should handle verbatim lua blocks', function(done) {
			var source = 'something_by_lua_block { \n\
if file then\n\
  ngx.say("body is in file ", file)\n\
else\n\
  ngx.say("no body found")\n\
end\n\
}\n';
			NginxConfFile.createFromSource(source, { tab: '  ' }, function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				actual.should.equal(source);
				done();
			});
		});

		it('should handle if statements', function(done) {
			var source = 'if ($http_cookie ~* "id=([^;]+)(?:;|$)") {\n\
  set $id $1;\n\
}\n';
			NginxConfFile.createFromSource(source, {tab: '  '}, function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				actual.should.equal(source);
				done();
			});
		});

		it('should handle if statements with fragment', function(done) {
			var source = 'if ($http_cookie ~* "id=([^;]+)(?:;|$)") {\n\
  rewrite ^/(.*)$ https://$http_host/#/login?$args?;\n\
}\n';
			NginxConfFile.createFromSource(source, {tab: '  '}, function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var actual = file.toString();
				actual.should.equal(source);
				done();
			});
		});
	});
});
