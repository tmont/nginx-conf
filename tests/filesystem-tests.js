var should = require('should'),
	NginxConfFile = require('../').NginxConfFile,
	fs = require('fs'),
	path = require('path');

function copyFile(callback) {
	var fileName = __dirname + '/files/nginx-home.conf';
	var temp = path.join(path.dirname(fileName), Math.random() + '.conf'),
		readStream = fs.createReadStream(fileName),
		writeStream = fs.createWriteStream(temp);

	readStream.on('end', function(err) {
		callback(err, temp);
	});
	readStream.pipe(writeStream);
}


describe('flushing to disk', function() {
	var tempFile, backupFile;
	beforeEach(function(done) {
		copyFile(function(err, temp) {
			tempFile = temp;
			done(err);
		});
	});

	afterEach(function(done) {
		if (tempFile) {
			fs.unlinkSync(tempFile);
		}
		if (backupFile) {
			fs.unlinkSync(backupFile);
		}

		done();
	});

	it('when node value changes', function(done) {
		NginxConfFile.create(tempFile, function(err, file) {
			should.not.exist(err);
			file.on('flushed', function() {
				NginxConfFile.create(tempFile, function(err, file) {
					should.not.exist(err);
					file.nginx.user.should.have.property('_value', 'lollersk8');
					done();
				});
			});

			file.nginx.user._value = 'lollersk8';
		});
	});

	it('when node is added', function(done) {
		NginxConfFile.create(tempFile, function(err, file) {
			should.not.exist(err);
			file.on('flushed', function() {
				NginxConfFile.create(tempFile, function(err, file) {
					should.not.exist(err);
					file.nginx.user.should.have.property('foo');
					file.nginx.user.foo.should.have.property('_value', 'bar');
					done();
				});
			});

			file.nginx.user._add('foo', 'bar');
		});
	});

	it('when node is removed', function(done) {
		NginxConfFile.create(tempFile, function(err, file) {
			should.not.exist(err);
			file.on('flushed', function() {
				NginxConfFile.create(tempFile, function(err, file) {
					should.not.exist(err);
					file.nginx.should.not.have.property('user');
					done();
				});
			});

			file.nginx._remove('user');
		});
	});

	it('manually', function(done) {
		NginxConfFile.create(tempFile, function(err, file) {
			should.not.exist(err);
			file.on('flushed', function() {
				NginxConfFile.create(tempFile, function(err, file) {
					should.not.exist(err);
					file.nginx.user.should.have.property('_value', 'lollersk8');
					done();
				});
			});

			file.die(tempFile);
			file.nginx.user._value = 'lollersk8';
			file.live(tempFile);
			file.flush();
		});
	});

	it('should not flush when node value is changed after die()', function(done) {
		NginxConfFile.create(tempFile, function(err, file) {
			should.not.exist(err);
			file.die(tempFile);
			var flushed = false;
			file.on('flushed', function() {
				flushed = true;
			});

			file.nginx.user._value = 'lollersk8';

			setTimeout(function() {
				flushed.should.equal(false, 'should not have triggered flushed event');
				done();
			}, 100);
		});
	});

	it('should not flush when node is added after die()', function(done) {
		NginxConfFile.create(tempFile, function(err, file) {
			should.not.exist(err);
			file.die(tempFile);
			var flushed = false;
			file.on('flushed', function() {
				flushed = true;
			});

			file.nginx._add('foo', 'bar');

			setTimeout(function() {
				flushed.should.equal(false, 'should not have triggered flushed event');
				done();
			}, 100);
		});
	});

	it('should not flush when node is removed after die()', function(done) {
		NginxConfFile.create(tempFile, function(err, file) {
			should.not.exist(err);
			file.die(tempFile);
			var flushed = false;
			file.on('flushed', function() {
				flushed = true;
			});

			file.nginx._remove('user');

			setTimeout(function() {
				flushed.should.equal(false, 'should not have triggered flushed event');
				done();
			}, 100);
		});
	});

	it('should create a new file if one does not already exist', function(done) {
		backupFile = __dirname + '/files/backup_test.conf';
		NginxConfFile.createFromSource('foo bar;', function(err, file) {
			should.not.exist(err);
			file.on('flushed', function() {
				fs.readFile(backupFile, 'utf8', function(err, contents) {
					should.not.exist(err);
					should.exist(contents);
					contents.should.equal('foo lollersk8;\n');
					done();
				});
			});

			file.live(backupFile);
			file.nginx.foo._value = 'lollersk8';
		});
	});
});