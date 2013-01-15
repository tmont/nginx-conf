var should = require('should'),
	NginxConfFile = require('../src/conf').NginxConfFile;

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
	});

	describe('events', function() {
		it('on add', function(done) {
			NginxConfFile.createFromSource('foo bar;', function(err, file) {
				should.not.exist(err);
				should.exist(file);
				var count = 0;
				file.on('added', function(context, name) {
					count++;
					should.exist(context);
					should.exist(name);
					name.should.equal('baz');
					context.should.have.property(name);
					context[name].should.have.property('_value', 'bat');
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
				file.on('removed', function(context, name) {
					count++;
					should.exist(context);
					should.exist(name);
					name.should.equal('foo');
					context.should.not.have.property(name);
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

	describe('adding nodes', function() {
		var blacklist = { _name: 1, _value: 1, _remove: 1, _add: 1, _getString: 1, _root: 1, toString: 1 };
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
	});

	it('should convert to an nginx-compatible string', function(done) {
		NginxConfFile.createFromSource('foo bar; baz { bat qux; }', function(err, file) {
			should.not.exist(err);
			should.exist(file);
			var actual = file.toString();
			var expected =
'foo bar;\n\
baz {\n\
    bat qux;\n\
}\n\n';

			actual.should.equal(expected);
			done();
		});
	});

	it('should convert to an nginx-compatible string with custom TAB', function(done) {
		NginxConfFile.createFromSource('foo bar; baz { bat qux; }', { tab: '   ' }, function(err, file) {
			should.not.exist(err);
			should.exist(file);
			var actual = file.toString();
			var expected =
'foo bar;\n\
baz {\n\
   bat qux;\n\
}\n\n';

			actual.should.equal(expected);
			done();
		});
	});
});