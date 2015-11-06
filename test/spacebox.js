/**
 * spacebox unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var spacebox = require("../");

describe("ipfs", function () {

    describe("add_files", function () {
        var test = function (t) {
            it(t.path + "," + t.recurse + " -> " + t.hash, function (done) {
                spacebox.ipfs.add_files(t.path, t.recurse, function (err, hash) {
                    if (err) return done(err);
                    assert.strictEqual(hash, t.hash);
                    done();
                });
            });
        };
        test({
            path: "data",
            recurse: true,
            hash: "QmV9UzBH3u6zGgN4gNrbc8qqcShhAZ8v7pVxXG96wFW93f"
        });
        test({
            path: "data/test.csv",
            recurse: false,
            hash: "QmZhtKv8zwj6CbqeWzwQYw9cJFYfGfppb2qYS1xvKkm417"
        });
        test({
            path: "data/test.txt",
            recurse: false,
            hash: "QmUpbbXcmpcXvfnKGSLocCZGTh3Qr8vnHxW5o8heRG6wDC"
        });
        test({
            path: "data/test.dat",
            recurse: false,
            hash: "QmdChoeCkScfkGN1h5kp2FWyE1QJDLLFibBWh6u2TPXV43"
        });
    });

    describe("publish/resolve", function () {
        var test = function (t) {
            it(t.hash + " -> " + t.label, function (done) {
                spacebox.ipfs.publish(t.hash, function (err, name) {
                    if (err) return done(err);
                    assert.strictEqual(name, t.name);
                    spacebox.ipfs.resolve(t.name, function (err, hash) {
                        if (err) return done(err);
                        assert.strictEqual(hash, "/ipfs/" + t.hash);
                        done();
                    });
                });
            });
        };
        test({
            hash: "QmV9UzBH3u6zGgN4gNrbc8qqcShhAZ8v7pVxXG96wFW93f",
            name: "QmXbf8FzHBSW1i7CQRn6LWGhrdxqcjWpFghvRS1g8T32DK"
        });
    });

    describe("upload", function () {
        var test = function (t) {
            it(t.path + "," + t.recurse + "," + t.publish + " -> name:" + t.name + ",hash:" + t.hash, function (done) {
                spacebox.upload(t.path, t.recurse, t.publish, function (err, res) {
                    if (err) return done(err);
                    assert.strictEqual(res.hash, t.hash);
                    assert.strictEqual(res.name, t.name);
                    done();
                });
            });
        };
        test({
            path: "data",
            recurse: true,
            publish: true,
            hash: "QmV9UzBH3u6zGgN4gNrbc8qqcShhAZ8v7pVxXG96wFW93f",
            name: "QmXbf8FzHBSW1i7CQRn6LWGhrdxqcjWpFghvRS1g8T32DK"
        });
        test({
            path: "data",
            recurse: true,
            publish: false,
            hash: "QmV9UzBH3u6zGgN4gNrbc8qqcShhAZ8v7pVxXG96wFW93f",
            name: "QmXbf8FzHBSW1i7CQRn6LWGhrdxqcjWpFghvRS1g8T32DK"
        });
    });

});

describe("eth", function () {

    describe("set/get_hash", function () {
        var test = function (t) {
            it(t.name + ": " + t.hash, function (done) {
                spacebox.eth.set_hash(t.name, t.hash, function (err, res) {
                    if (err) return done(err);
                    assert.isTrue(res);

                    // asynchronous
                    spacebox.eth.get_hash(t.name, function (err, ipfsHash) {
                        if (err) return done(err);
                        if (!ipfsHash) return done("no response");
                        assert.strictEqual(ipfsHash, t.hash);

                        // synchronous
                        var syncIpfsHash = spacebox.eth.get_hash(t.name);
                        if (!syncIpfsHash) return done("no response");
                        if (syncIpfsHash.error) return done(syncIpfsHash);
                        assert.strictEqual(syncIpfsHash, t.hash);

                        done();
                    });
                });
            });
        };
        test({
            name: "jack@tinybike.net",
            hash: "QmaUJ4XspR3XhQ4fsjmqHSkkTHYiTJigKZSPa8i4xgVuAt"
        });
        test({
            name: "tinybike",
            hash: "QmeWQshJxTpnvAq58A51KhBkEi6YGJDKRe7rssPFRnX2EX"
        });
        test({
            name: "jack@tinybike.net",
            hash: "Qmehkp3udWtoLzJvxNJMtCkPmSExSr7ibHy3fdwJg2Z1Ju"
        });
        test({
            name: "QmQKmU43G12uAF8HfWL7e3gUgxFm1C8F7CzMVm8FiHdW2G",
            hash: "QmQKmU43G12uAF8HfWL7e3gUgxFm1C8F7CzMVm8FiHdW2G"
        });
        test({
            name: "lolololololololololololololololololololololololololol",
            hash: "Qmd6g7UTqPrnxfNPGpsdXtj1fMjaPo4NUKtjZc6LW8eeBE"
        });

    });

});
