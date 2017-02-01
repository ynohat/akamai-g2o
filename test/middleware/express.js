"use strict";

var express = require("express");
var bodyParser = require("body-parser");
var g2o = require("../../lib/middleware");
var client = require("./client");
var fs = require("fs");
var yaml = require("js-yaml");

var samples = yaml.safeLoad(fs.readFileSync(require.resolve("./samples.yaml"), 'utf8'));

describe("express server", function () {
    var server;

    beforeEach(function (done) {

        var app = express();
        app.use(bodyParser.json());
        app.use(function (req, res, next) {
            g2o(req.body)(req, res, next);
        });
        app.use(function (req, res, next) {
            res.status(200).json(req.g2o);
        });
        app.use(function (error, req, res, next) {
            res.status(500).json({error: error.message});
        });
        server = app.listen(0, done);
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
