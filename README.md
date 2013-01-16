#nginx-conf
by [Tommy Montgomery](http://tmont.com)

`nginx-conf` is a node module for making changes to an [nginx](http://nginx.org) configuration
file programmatically.

## Usage
Pretend you have an nginx config file like
[this one](https://github.com/tmont/nginx-conf/blob/master/tests/files/nginx-home.conf).

Note that all public methods are prefixed with `_` so that they (hopefully) don't clash with
nginx's directives.

```javascript
var NginxConfFile = require('nginx-conf').NginxConfFile;

NginxConfFile.create('/etc/nginx.conf', function(err, conf) {
  if (err) {
    console.log(err);
    return;
  }

  //reading values
  console.log(conf.nginx.user._value); //www www
  console.log(conf.nginx.http.server.listen._value); //one.example.com

  //if there is more than one directive in a scope (e.g. location), then
  //you access them via array index rather than straight property access
  console.log(conf.nginx.http.server.location[3].root._value); // /spool/www

  //writing values
  //NginxConfFile.create() automatically sets up a sync, so that whenever
  //a value is changed, or a node is removed/added, the file gets updated
  //immediately

  conf.on('flushed', function() {
    console.log('finished writing to disk');
  });

  //listen to the flushed event to determine when the new file has been flushed to disk
  conf.nginx.events.connections._value = 1000;

  //don't write to disk when something changes
  conf.die('/etc/nginx.conf');
  conf.nginx.events.connections._value = 2000; //change remains local, not in /etc/nginx.conf

  //write to a different file
  conf.live('/etc/nginx.conf.bak');

  //force the synchronization
  conf.flush();

  //adding and removing directives
  conf.nginx.http._add('add_header', 'Cache-Control max-age=315360000, public');
  console.log(conf.nginx.http.add_header._value); //Cache-Control max-age=315360000, public

  conf.nginx.http._add('add_header', 'X-Load-Balancer lb-01');
  conf.nginx.http._add('add_header', 'X-Secure true');
  console.log(conf.nginx.http.add_header[0]._value); //max-age=315360000, public
  console.log(conf.nginx.http.add_header[1]._value); //X-Load-Balancer lb-01
  console.log(conf.nginx.http.add_header[2]._value); //X-Secure true

  conf.nginx.http.remove('add_header'); //removes add_header[0]
  conf.nginx.http.remove('add_header', 1); //removes add_header[1]

  //if there's only one directive with a name, it is always flattened into a property
  console.log(conf.nginx.http.add_header._value); //X-Load-Balancer lb-01
  console.log(conf.nginx.http.add_header[0]); //undefined
});
```

## Development
```bash
git clone git@github.com:tmont/nginx-conf.git
cd nginx-conf
npm install
npm test
```