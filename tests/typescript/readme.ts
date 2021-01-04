// example copied from README

// var NginxConfFile = require('nginx-conf').NginxConfFile;
import {NginxConfFile} from '../../dist';

NginxConfFile.create('/etc/nginx.conf', function (err, conf) {
	if (err) {
		console.log(err);
		return;
	}

	if (!conf) {
		throw new Error();
	}

	//reading values
	if (conf.nginx.user) {
		if (Array.isArray(conf.nginx.user)) {
			conf.nginx.user.forEach((user, i) => {
				console.log(`user[${i}]: ${user._value}`);
			});
		} else {
			console.log(`user: ${conf.nginx.user._value}`); // www www
		}
	}

// 	console.log(conf.nginx.user!._value); //www www
// 	console.log(conf.nginx.http!.server.listen._value); //one.example.com
//
// 	//if there is more than one directive in a scope (e.g. location), then
// 	//you access them via array index rather than straight property access
// 	console.log(conf.nginx.http.server.location[3].root._value); // /spool/www
//
// 	//writing values
// 	//NginxConfFile.create() automatically sets up a sync, so that whenever
// 	//a value is changed, or a node is removed/added, the file gets updated
// 	//immediately
//
// 	conf.on('flushed', function () {
// 		console.log('finished writing to disk');
// 	});
//
// 	//listen to the flushed event to determine when the new file has been flushed to disk
// 	conf.nginx.events.connections._value = 1000;
//
// 	//don't write to disk when something changes
// 	conf.die('/etc/nginx.conf');
// 	conf.nginx.events.connections._value = 2000; //change remains local, not in /etc/nginx.conf
//
// 	//write to a different file
// 	conf.live('/etc/nginx.conf.bak');
//
// 	//force the synchronization
// 	conf.flush();
//
// 	//adding and removing directives
// 	conf.nginx.http._add('add_header', 'Cache-Control max-age=315360000, public');
// 	console.log(conf.nginx.http.add_header._value); //Cache-Control max-age=315360000, public
//
// 	conf.nginx.http._add('add_header', 'X-Load-Balancer lb-01');
// 	conf.nginx.http._add('add_header', 'X-Secure true');
// 	console.log(conf.nginx.http.add_header[0]._value); //Cache-Control max-age=315360000, public
// 	console.log(conf.nginx.http.add_header[1]._value); //X-Load-Balancer lb-01
// 	console.log(conf.nginx.http.add_header[2]._value); //X-Secure true
//
// 	conf.nginx.http._remove('add_header'); //removes add_header[0]
// 	conf.nginx.http._remove('add_header', 1); //removes add_header[1]
//
// 	//if there's only one directive with a name, it is always flattened into a property
// 	console.log(conf.nginx.http.add_header._value); //X-Load-Balancer lb-01
// 	console.log(conf.nginx.http.add_header[0]); //undefined
//
// 	//adding a new block
// 	conf.nginx.http._add('server');
// 	conf.nginx.http.server._add('listen', '80');
//
// 	//that'll create something like this:
// 	/*
// 	  server {
// 		listen 80;
// 	  }
// 	*/
//
// 	//multiple blocks
// 	conf.nginx.http._add('server');
// 	conf.nginx.http.server[1]._add('listen', '443');
//
// 	/*
// 	  server {
// 		listen 80;
// 	  }
// 	  server {
// 		listen 443;
// 	  }
// 	*/
//
// 	// blocks with values:
// 	conf.nginx.http.server[1]._add('location', '/');
// 	conf.nginx.http.server[1].location._add('root', '/var/www/example.com');
//
// 	/*
// 	  server {
// 		location / {
// 		  root /var/www/example.com;
// 		}
// 	  }
// 	*/
//
// 	// lua blocks also work, but you can't put a mismatched "{" or "}" in a comment!
// 	conf.nginx.http.location._addVerbatimBlock('rewrite_by_lua_block', '{\n\
//   ngx.say("this is a lua block!")\n\
//   res = ngx.location.capture("/memc",\n\
//     { args = { cmd = "incr", key = ngx.var.uri } }\n\
//   )\n\
// }');
});
