// vanilla JS: const NginxConfFile = require('nginx-conf').NginxConfFile;
import {NginxConfFile, parse} from '../../';
import {NginxParseOptions} from '../../src/parser';

const filename = `${__dirname}/../files/readme.conf`;

NginxConfFile.create(filename, function (err, conf) {
	if (err || !conf) {
		console.log(err);
		return;
	}

	// reading values
	console.log('user: ' + conf.nginx.user?.[0]._value);
	console.log('http.server.listen: ' + conf.nginx.http?.[0].server?.[0].listen?.[0]._value);
	console.log('http.server.location.root:' + conf.nginx.http?.[0].server?.[0].location?.[3].root?.[0]._value);

	//writing values
	//NginxConfFile.create() automatically sets up a sync, so that whenever
	//a value is changed, or a node is removed/added, the file gets updated
	//immediately

	const onFlushed = () => {
		console.log('finished writing to disk');
	};

	conf.on('flushed', onFlushed);

	//listen to the flushed event to determine when the new file has been flushed to disk
	if (conf.nginx.events?.[0].connections) {
		conf.nginx.events[0].connections[0]._value = 1000;

		//don't write to disk when something changes
		conf.die(filename);
		conf.nginx.events[0].connections[0]._value = 2000; //change remains local, not in /etc/nginx.conf
	}

	//write to a different file
	conf.live(`${filename}.bak`);

	//force the synchronization
	conf.flush();

	//adding and removing directives
	if (conf.nginx.http) {
		conf.nginx.http[0]._add('add_header', 'Cache-Control max-age=315360000, public');
		console.log(conf.nginx.http[0].add_header?.[0]._value); //Cache-Control max-age=315360000, public

		conf.nginx.http[0]._add('add_header', 'X-Load-Balancer lb-01');
		conf.nginx.http[0]._add('add_header', 'X-Secure true');

		console.log(conf.nginx.http[0].add_header?.[0]._value); //Cache-Control max-age=315360000, public
		console.log(conf.nginx.http[0].add_header?.[1]._value); //X-Load-Balancer lb-01
		console.log(conf.nginx.http[0].add_header?.[2]._value); //X-Secure true

		conf.nginx.http[0]._remove('add_header'); //removes add_header[0]
		conf.nginx.http[0]._remove('add_header', 1); //removes add_header[1]
	}

	//adding a new block
	conf.nginx.http?.[0]._add('server');
	conf.nginx.http?.[0].server?.[0]._add('listen', '80');

	//that'll create something like this:
	/*
	  server {
		listen 80;
	  }
	*/

	//multiple blocks
	conf.nginx.http?.[0]._add('server');
	conf.nginx.http?.[0].server?.[1]._add('listen', '443');

	/*
	  server {
		listen 80;
	  }
	  server {
		listen 443;
	  }
	*/

	// blocks with values:
	conf.nginx.http?.[0].server?.[1]._add('location', '/');
	conf.nginx.http?.[0].server?.[1].location?.[0]._add('root', '/var/www/example.com');

	/*
	  server {
		location / {
		  root /var/www/example.com;
		}
	  }
	*/

	// you can also create empty blocks
	conf.nginx.http?.[0]._add('events', '', []); // events { }

	// lua blocks also work, but you can't put a mismatched "{" or "}" in a comment!
	conf.nginx.http?.[0].server?.[0].location?.[0]._addVerbatimBlock('rewrite_by_lua_block', '\n\
		ngx.say("this is a lua block!")\n\
		res = ngx.location.capture("/memc",\n\
		  { args = { cmd = "incr", key = ngx.var.uri } }\n\
		)'
	);

	// remove old listener
	conf.off('flushed', onFlushed);

	// kill process when done writing to disk
	conf.on('flushed', () => {
		console.log('finished writing to disk, exiting');
		process.exit();
	});

	conf.flush();
});

const options: NginxParseOptions = {
	templateSyntax: true,
};
parse('foo', (err, result) => {
	if (!err && result) {
		console.log(result.parent?.value);
	}
}, options);
