"use strict";

var http = require("http");
var g2o = require("../../lib/middleware");
var client = require("./client");
var fs = require("fs");
var yaml = require("js-yaml");

var samples = yaml.safeLoad(fs.readFileSync(require.resolve("./samples.yaml"), 'utf8'));

describe("standard NodeJS http.Server", function () {
    var server;

    beforeEach(function (done) {

        server = http.createServer(function (req, res) {
            var body = "";
            req.on("data", function (data) { body += data; });
            req.on("end", function () {
                body = JSON.parse(body);
                g2o(body)(req, res, function (error) {
                    res.setHeader("Content-Type", "application/json");
                    if (error) {
                        res.statusCode = 500;
                        res.write(JSON.stringify(error.stack));
                    } else {
                        res.write(JSON.stringify(req.g2o));
                    }
                    res.end();
                });
            });
        });

        server.listen(0, done);
    });

    Object.keys(samples).forEach(function (name) {
        var sample = samples[name];
        it(name, function (done) {
            client(
                "localhost",
                server.address().port,
                sample.client,
                sample.server
            ).then(function (result) {
                result.statusCode.should.equal(sample.expect.statusCode);
                if (result.body && sample.expect.body) {
                    Object.keys(sample.expect.body).forEach(function (k) {
                        result.body[k].should.equal(sample.expect.body[k], k);
                    });
                }
                done();
            }).catch(function (error) {
                done(error);
            });
        });
    });

    afterEach(function () {
        server.close();
    });
});
