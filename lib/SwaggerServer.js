/**
 * Created by mjn on 3/12/15.
 */


/*global require, exports, __dirname, sync, req, res */

"use strict";

var Dox = require('dox'),
    File = require('File'),
    Semaphore = require('Threads').Semaphore;

function getSjs(me, path) {
    me.semaphore.lock();
    try {
        var cache = me.cache,
            file;

        var sjs = cache[path];
        if (!sjs) {
            file = new File(path);
            if (file.isDirectory()) {
                file = new File(path + '/index.sjs');
                if (!file.exists()) {
                    return 403;
                }
            }
            if (!file.exists()) {
                return 404;
            }
            cache[path] = sjs = {
                file         : file,
                lastModified : 0
            };
        }
        else {
            file = sjs.file;
        }
        var lastModified = file.lastModified();
        if (lastModified > sjs.lastModified) {
            sjs.fn = new Function('me', 'req', 'res', file.readAll());
            sjs.lastModified = lastModified;
        }
        return sjs;
    }
    finally {
        me.semaphore.unlock();
    }
}
function readSjs(me, req, res) {
    var sjs = getSjs(me, me.path + '/' + req.args.join('/'));
    if (!sjs.fn) {
        return sjs;
    }
    return sjs.fn.call(req.scope, me, req, res) || 200;
}
    
function SwaggerServer(path) {
    var ret = {
        path: path,
        semaphore: new Semaphore(),
        cache: {},
        handler: function (me, req, res) {
            return readSjs(me, req, res)
        }
    };
    return ret;
}

decaf.extend(SwaggerServer.prototype, { });

function parseJSON(path, args) {
    var file = new File(path);
    if (!file.exists()) {
        throw new Error('Swagger JSON at ' + path + 'does not exist');
    }
    if (!file.isFile()) {
        throw new Error('File at ' + path + 'is not a file');
    }
    return {
        path         : path,
        args         : args,
        file         : file,
        lastModified : 0,
        fn           : function() {

        },
        handler      : function(me, req, res) {
            var modified = file.lastModified();
            if (modified > me.lastModified) {
                me.fn = new Function('me', 'req', 'res', file.readAll());
                me.lastModified = modified;
            }
            return me.fn.call(req.scope, me, req, res) || 200;
        }
    };
}

decaf.extend(exports, {
    SwaggerServer : SwaggerServer,
    parseJSON     : parseJSON
});