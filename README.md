# nginx-conf

`nginx-conf` is a node module for making changes to an [nginx](http://nginx.org) configuration
file programmatically.

[![NPM version](https://badge.fury.io/js/nginx-conf.png)](http://badge.fury.io/js/nginx-conf)

## Installation
`npm install nginx-conf`

This library has no dependencies.

## Breaking Changes
Version `2.0.0` changed the way that single directives are accessed. In short, everything
is now array-indexed.


```javascript
// Pre 2.0.0:
conf.nginx.foo.bar._value;

// 2.0.0+
conf.nginx.foo[0].bar[0]._value;
```

## Usage
Pretend you have an nginx config file like
[this one](https://github.com/tmont/nginx-conf/blob/master/tests/files/nginx-home.conf).

Note that all public methods are prefixed with `_` so that they (hopefully) don't clash with
nginx's directives.

Note: `*_content_by_lua_block` directives are supported in `>=v1.3.0`.

```javascript
// vanilla JS: const NginxConfFile = require('nginx-conf').NginxConfFile;
import {NginxConfFile} from '../../';

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
```

### Comments
Support for comments is supported-ish. Comments are attached to directives, and will always
be rendered *above* the directive when using `toString()` (or `_getString()`).

Comments can be added, removed and updated via the `_comments` array on a node.

```javascript
console.log(conf.nginx.events[0].use[0]._comments.length); // 1
console.log(conf.nginx.events[0].use[0]._comments[0]); // use [ kqueue | rtsig | epoll | /dev/poll | select | poll ];

//remove the comment
conf.nginx.events[0].use[0]._comments.splice(0, 1);

//add a new one
conf.nginx.events[0].use[0]._comments.push('my new comment');
console.log(conf.nginx.events[0].use[0]._comments.length); // 1
console.log(conf.nginx.events[0].use[0]._comments[0]); //my new comment

//update a comment's text
conf.nginx.events[0].use[0]._comments[0] = 'updated';
console.log(conf.nginx.events[0].use[0]._comments[0]); //updated
```

If the comment is in a weird place (like in the middle of a directive), it'll still be
attached to the node. If it's *after* the directive (after the semicolon or closing brace),
it will be attached to the *next* node, or ignored if it's at the end of the file.

Assuming this nginx configuration:
```nginx
foo #comment
bar;
```

You will have this object structure:
```javascript
console.log(conf.nginx.foo[0]._value); //bar
console.log(conf.nginx.foo[0]._comments[0]); //comment
```

But if the comment comes *after*:
```nginx
foo bar;
#comment
```

```javascript
console.log(conf.nginx.foo[0]._value); //bar
console.log(conf.nginx.foo[0]._comments.length); //0
```

### Parser options
Support for go template syntax is provided via `NginxParserOptions`.  By default, templating syntax is not supported.

To enable templating syntax, pass the following `NginxParserOptions` to the `parser.parse` or `parser.parseFile` function(s):
```javascript
{
  templateSyntax: true
}
```

## Development
```bash
git clone git@github.com:tmont/nginx-conf.git
cd nginx-conf
npm install
npm test
```

If you're making changes, you should run `npm run watch` in a separate
terminal. `tsc` will output the JavaScript in the `dist/` directory.
The tests reference the JavaScript files in `dist/`, not the TypeScript
files elsewhere.

Only the stuff in `dist/` is included in the NPM package.
