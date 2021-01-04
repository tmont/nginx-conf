const path = require('path');
const spawn = require('child_process').spawn;
const should = require('should');

describe('TypeScript', () => {
	it('should compile README code', (done) => {
		const tsc = path.resolve(path.join(__dirname, '..', 'node_modules', '.bin', 'tsc'));
		const tsFile = path.join(__dirname, 'typescript', 'readme.ts');
		const stdout = [];
		const stderr = [];
		const proc = spawn(tsc, [ '--noEmit', '--strict', tsFile ]);

		proc.stdout.on('data', chunk => stdout.push(chunk));
		proc.stderr.on('data', chunk => stderr.push(chunk));

		proc.on('exit', (signal) => {
			const stderrStr = Buffer.concat(stderr).toString('utf8')
			const stdoutStr = Buffer.concat(stdout).toString('utf8');
			stdoutStr.should.equal('');
			stderrStr.should.equal('');
			signal.should.equal(0);
			done();
		});
	}).timeout(10000);
});
