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
	var tempFile;
	beforeEach(function(done) {
		copyFile(function(err, temp) {
			tempFile = temp;
			done(err);
		});
	});

	afterEach(function(done) {
		if (tempFile) {
			fs.unlink(tempFile, done);
		} else {
			done();
		}
	});

	it('via events', function(done) {
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

	it('should not flush after die()', function(done) {
		NginxConfFile.create(tempFile, function(err, file) {
			should.not.exist(err);
			file.die(tempFile);
			file.nginx.user._value = 'lollersk8';

			process.nextTick(function() {
				NginxConfFile.create(tempFile, function(err, file) {
					should.not.exist(err);
					//should not have changed
					file.nginx.user.should.have.property('_value', 'www www');
					done();
				});
			}, 500);
		});
	});
});