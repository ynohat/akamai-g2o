"use strict";

var yaml = require("js-yaml");
var fs = require("fs");
var sign = require("../lib/sign");

describe("signature algorithms", function () {
    var tests = yaml.safeLoad(fs.readFileSync(require.resolve("./sign/samples.yaml"), 'utf8'));

    Object.keys(tests).forEach(function (name) {
        var test = tests[name];

        it(name, function () {
            sign(
                test.version,
                test.key,
                test.authData,
                test.signString
            ).should.equal(test.signature);
        });
    });
});
