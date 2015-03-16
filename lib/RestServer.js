/**
 * Created by mschwartz on 1/16/15.
 */

/*global require, exports, __dirname, sync */

"use strict";

var File      = require('File'),
    Semaphore = require('Threads').Semaphore,
    dox       = require('dox');

function getAPI(me, path) {
    me.semaphore.lock();
    try {
        var cache = me.cache,
            file;

        var api = cache[path];
        if (!api) {
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
            cache[path] = api = {
                file         : file,
                lastModified : 0
            };
        }
        else {
            file = api.file;
        }
        var lastModified = file.lastModified();
        if (lastModified > api.lastModified) {
            api.fn = new Function('me', file.readAll());
            api.routes = api.fn(me);
            api.lastModified = lastModified;
        }
        return api;
    }
    finally {
        me.semaphore.unlock();
    }
}

function getSwagger(me) {
    var rebuild = false;
    me.swaggerSemaphore.lock();
    try {
        decaf.each(me.files, function (file) {
            if (file.lastModified() > me.swaggerLastModified()) {
                rebuild = true;
                return false; // exits decaf.each
            }
        });
        if (!rebuild) {
            return me.swaggerJson;
        }
        var sources = [];
        decaf.each(me.files, function (file) {
            sources.push(file.readAll());
        });
        var doxObject = dox.parseComments(sources.join(';\n'));
        // iterate doxObject
        var swaggerObject = {};
        decaf.each(doxObject, function (commentDescription) {
            // ...
            // add to swaggerObject
        });
        me.swaggerJson = JSON.stringify(swaggerObject);
        me.lastModified = new Date().getTime();
        return me.swaggerJson;
    }
    finally {
        me.swaggerSemaphore.unlock();
    }
}
function runSwagger(me, req, res) {
    // get swagger
    var json = getSwagger(me);
    res.writeHead({'Content-Type' : 'application/json'});
    res.end(json);
}

/**
 * Default invalid request handler for REST
 *
 * @private
 * @param res
 * @param message
 */
function invalid(res, message) {
    message = message || 'Bad request';
    res.send(400, {message : message});
}

/**
 * RESTful API server for JOLT
 *
 * @param routes key = route, value = path to file to handle the route
 * @param invalid_handler optional handler for bad requests; signature is invalid(res, message)
 * @returns {Object} config object for JOLT verb
 * @constructor
 */
function RestServer(routes, options) {
    options = options || {
        invalid_handler : invalid,
        swagger         : false
    };
    var files = [];
    decaf.each(routes, function (filename) {
        files.push(new File(filename));
    });
    return {
        swaggerEnabled      : options.swagger,
        invalid             : options.invalid_handler || invalid,
        routes              : routes,
        semaphore           : new Semaphore(),
        cache               : {},
        // for swagger:
        files               : files,
        swaggerJson         : '{}',
        swaggerLastModified : 0,
        swaggerSemaphore    : new Semaphore(),
        handler             : function (me, req, res) {
            var me = this,
                route = req.args.shift();

            if (me.swaggerEnabled && route === 'swagger.json') {
                return runSwagger(me, req, res);
            }
            var api = getAPI(me, me.routes[route]),
                method = req.method;

            if (api && api.routes && api.routes[method]) {
                try {
                    api.routes[method].apply({
                        config : me,
                        req    : req,
                        res    : res,
                        send   : function (status, o) {
                            this.res.send(status, o);
                        }
                    }, req.args);
                }
                catch (e) {
                    me.invalid(res, e.message);
                }
            }
            else {
                me.invalid(res);
            }
        }
    };
}

exports.RestServer = RestServer;
