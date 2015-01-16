/**
 * Created by mschwartz on 1/16/15.
 */

/*global require, exports, __dirname, sync */

"use strict";

var File      = require('File'),
    Semaphore = require('Threads').Semaphore;

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

function invalid(res, message) {
    message = message || 'Bad request';
    res.send(400, {message : message});
}

/**
 * RESTful API server for JOLT
 *
 * @param routes key = route, value = path to file to handle the route
 * @param invalid_handler optional handler for bad requests; signature is invalid(res, message)
 * @returns config object for JOLT verb
 * @constructor
 */
function RestServer(routes, invalid_handler) {
    return {
        invalid   : invalid_handler || invalid,
        routes    : routes,
        semaphore : new Semaphore(),
        cache     : {},
        handler   : function (me, req, res) {
            var me = this,
                route = req.args.shift(),
                api = getAPI(me, me.routes[route]),
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
