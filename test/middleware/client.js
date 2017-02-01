"use strict";

var http = require("http");
var url = require("url");
var sign = require("../../lib/sign");

module.exports = function (host, port, options, body) {
    var u = "http://" + host + ":" + port + options.path;
    var authData = [
        options.version,
        options.edgeIp || "127.0.0.1",
        options.clientIp || "127.0.0.1",
        options.time || (Date.now() / 1000),
        options.uniqueId || (Math.floor(Math.random() * 10000000)),
        options.nonce
    ].join(", ");
    var headers = {};
    headers[options.dataHeader || "X-Akamai-G2O-Auth-Data"] = authData;
    headers[options.signHeader || "X-Akamai-G2O-Auth-Sign"] = options.signature ||
        sign(options.version, options.key, authData, options.path);
    return request(u, headers, body);
};

function request(u, headers, body) {
    return new Promise(function (resolve, reject) {
        var options, req;

        body = JSON.stringify(body);

        options = url.parse(u);
        options.method = "POST";
        options.headers = Object.assign({}, headers);
        options.headers["Content-Type"] = "application/json";
        options.headers["Content-Length"] = body.length;

        req = http.request(
            options,
            function (res) {
                var data = "";
                res.setEncoding("utf8");
                res.on("data", function (chunk) {
                    data += chunk;
                });
                res.on("error", reject);
                res.on("end", function () {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: JSON.parse(data.length ? data : "null")
                    });
                });
            });
        req.on("error", reject);
        req.end(body);
    });
};
