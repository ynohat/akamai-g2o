"use strict";

var crypto = require("crypto");

/**
 * Generates a request signature.
 *
 * @throws {Error} If the version is not implemented
 * @param  {Number} version the signing algorithm version
 * @param  {String} key the shared signing key
 * @param  {String} data the contents of the data header (typically X-Akamai-G2O-Data)
 * @param  {String} signString typically the request URL
 * @return {String} the signature
 */
module.exports = function (version, key, data, signString) {
    // versions start at 1, decrement to fit in the array
    version--;
    if (version in versions) {
        return versions[version](key, data, signString);
    }
    throw new Error("unsupported algorithm");
};

var versions = [
    // version 1: MD5(key,data,sign-string)
    function (key, data, signString, encoding) {
        var h = crypto.createHash("md5");
        h.update(key + data + signString);
        return h.digest(encoding || "base64");
    },

    // version 2: MD5(key,MD5(key,data,sign-string))
    function (key, data, signString, encoding) {
        var h1 = crypto.createHash("md5");
        h1.update(key);
        h1.update(data);
        h1.update(signString);
        var h2 = crypto.createHash("md5");
        h2.update(key);
        h2.update(h1.digest());
        return h2.digest(encoding || "base64");
    },

    // version 3: MD5-HMAC(key,data,sign-string)
    function (key, data, signString, encoding) {
        var h = crypto.createHmac("md5", key);
        h.update(data);
        h.update(signString);
        return h.digest(encoding || "base64");
    },

    // version 4: SHA1-HMAC(key,data,sign-string)
    function (key, data, signString, encoding) {
        var h = crypto.createHmac("sha1", key);
        h.update(data);
        h.update(signString);
        return h.digest(encoding || "base64");
    },

    // version 5: SHA256-HMAC(key,data,sign-string)
    function (key, data, signString, encoding) {
        var h = crypto.createHmac("sha256", key);
        h.update(data);
        h.update(signString);
        return h.digest(encoding || "base64");
    }
];
