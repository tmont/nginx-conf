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
		var blacklist = { _name: 1, _value: 1, _remove: 1, _add: 1, _getString: 1, _root: 1, toString: 1, _comments: 1 };
		for (var name in blacklist) {
			(function(name) {
				it('should not allow adding a node name "' + name + '"', function(done) {
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
	});
});