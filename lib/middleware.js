"use strict";

var sign = require("./sign");

/**
 * Returns a middleware function using the provided options.
 *
 * @param  {Object} options
 * @return {Function}
 */
module.exports = function (options) {
    options = sanitizeOptions(options);
    return function (req, res, next) {
        req.g2o = {};
        req.g2o.authenticated = true;
        authenticateRequest(options, req, function (error) {
            if (error) {
                req.g2o.authenticated = false;
                req.g2o.message = error.message;
            }
            if (options.strict && !req.g2o.authenticated) {
                options.onUnauthenticated(
                    req,
                    requestUnauthenticated.bind(null, options, res)
                );
            } else {
                next();
            }
        });
    };
};

function requestUnauthenticated(options, res) {
    if (typeof res.status === "function") {
        // Express has a status() helper function
        res.status(options.unauthenticatedStatusCode);
    } else {
        res.statusCode = options.unauthenticatedStatusCode;
    }
    res.end();
}

function authenticateRequest(options, req, callback) {
    var dataHeader = options.dataHeader.toLowerCase();
    if (!(dataHeader in req.headers)) {
        return callback(new Error("missing auth data header"));
    }
    var dataString = req.headers[dataHeader];
    var data = parseDataString(dataString);
    req.g2o.data = data;
    checkTime(data, options, req, function (error) {
        if (error) return callback(error);
        checkSignature(data, options, req, function (error) {
            if (error) return callback(error);
            if (typeof options.extraCheck === "function") {
                options.extraCheck(req, callback);
            } else {
                callback();
            }
        });
    });
}

function checkTime(data, options, req, callback) {
    if (options.checkTime) {
        if (Math.abs(Date.now() - data.time.getTime()) > 1000 * options.timeWindow) {
            return callback(new Error("request time too far off"));
        }
    }
    callback();
}

function checkSignature(data, options, req, callback) {
    var signHeaderName = options.signHeader.toLowerCase();
    if (!(signHeaderName in req.headers)) {
        return callback(new Error("missing sign header"));
    }
    var signString = options.signString(req);
    options.key(req, data, function (error, key) {
        if (error) return callback(error);
        try {
            var signature = sign(data.version, key, data.raw, signString);
            var ghostSignature = req.headers[signHeaderName];
            if (signature !== ghostSignature) {
                return callback(new Error("invalid signature"));
            }
            callback();
        } catch (error) {
            callback(error);
        }
    });
}

function parseDataString(dataString) {
    // X-Akamai-G2O-Auth-Data: version, edge-ip, client-ip, time, unique-id, nonce
    var bits = dataString.split(", ");
    var data = {};
    data.raw = dataString;
    data.version = Number(bits.shift());
    data.edgeIp = bits.shift();
    data.clientIp = bits.shift();
    data.time = new Date(Number(bits.shift()) * 1000);
    data.uniqueId = bits.shift();
    data.nonce = bits.shift();
    return data;
}

function sanitizeOptions(options) {
    // create a copy and assign some sane defaults
    options = Object.assign({}, {
        key: null,
        strict: true,
        checkTime: true,
        timeWindow: 30,
        dataHeader: "X-Akamai-G2O-Auth-Data",
        signHeader: "X-Akamai-G2O-Auth-Sign",
        signString: defaultSignStringFunction,
        extraCheck: null,
        unauthenticatedStatusCode: 401,
        onUnauthenticated: defaultOnUnauthenticatedFunction,
    }, options);

    // make sure the key option is a function even if the user
    // provided an object
    switch (typeof options.key) {
        case "object":
            options.key = function (req, data, callback) {
                if (data.nonce in this) {
                    return callback(null, this[data.nonce]);
                }
                callback(new Error("unknown nonce"));
            }.bind(options.key);
            break;
        case "function":
            break;
        default:
            throw new Error("key should be an object or a function");
    }

    return options;
}

function defaultSignStringFunction(req) {
    if (req.originalUrl) {
        var bits = require("url").parse(req.originalUrl);
        return bits.path;
    }
    return req.url;
}

function defaultKeyFunction(req, data, callback) {
    if (data.nonce in this) {
        return callback(null, this[data.nonce]);
    }
    callback(new Error("unknown nonce"));
}

function defaultOnUnauthenticatedFunction(req, callback) {
    return callback();
}
