/**
 * spacebox unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var fs = require("fs");
var assert = require("chai").assert;
var spacebox = require("../");

describe("ipfs", function () {

    before(function (done) {
        fs.open("data/blank.txt", "w+", function (err, fd) {
            fs.close(fd, function (err) {
                if (err) return done(err);
                fs.open("data/subdata/blank.txt", "w+", function (err, fd) {
                    if (err) return done(err);
                    fs.close(fd, function (err) {
                        if (err) return done(err);
                        fs.open("data/subdata/subsubdata/blank.txt", "w+", function (err, fd) {
                            if (err) return done(err);
                            fs.close(fd, done);
                        });
                    });
                });
            });
        });
    });

    describe("add", function () {
        var test = function (t) {
            it(t.path + "," + t.recursive + " -> " + t.hash, function (done) {
                spacebox.ipfs.add(t.path, t.recursive, function (err, file) {
                    if (err) return done(err);
                    if (file.constructor === Array) {
                        assert.isAbove(file.length, 1);
                        for (var i = 0, len = file.length; i < len; ++i) {
                            if (file[i].Name === t.path) {
                                assert.strictEqual(file[i].Hash, t.hash);
                            }
                        }
                    } else {
                        assert.strictEqual(file.Hash, t.hash);
                    }
                    done();
                });
            });
        };
        test({
            path: "data",
            recursive: true,
            hash: "QmPuDEFbf4SMDwKxX6BnMAFzaYqgouE3HZgkjVgp6Wkxy9"
        });
        test({
            path: "data/test.csv",
            recursive: false,
            hash: "QmZhtKv8zwj6CbqeWzwQYw9cJFYfGfppb2qYS1xvKkm417"
        });
        test({
            path: "data/test.txt",
            recursive: true,
            hash: "QmUpbbXcmpcXvfnKGSLocCZGTh3Qr8vnHxW5o8heRG6wDC"
        });
        test({
            path: "data/test.dat",
            recursive: false,
            hash: "QmdChoeCkScfkGN1h5kp2FWyE1QJDLLFibBWh6u2TPXV43"
        });
        test({
            path: "data/blank.txt",
            recursive: false,
            hash: "QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH"
        });
        test({
            path: "data/subdata",
            recursive: true,
            hash: "QmZ2Y7UY6MdRwcKLBJyx18Jq1ygtEa9LQcmZLtM4R5bfLo"
        });
        test({
            path: "data/subdata/subsubdata",
            recursive: true,
            hash: "QmdECRQDwYE8wkSNh2MA3kQ2hhjToVSTLYf29UtxjWQCvr"
        });
    });

    describe("is_directory", function () {
        var test = function (t) {
            it(t.hash + " -> " + t.directory, function (done) {
                spacebox.ipfs.is_directory(t.hash, function (err, directory) {
                    if (err) return done(err);
                    assert.strictEqual(directory, t.directory);
                    done();
                });
            });
        };
        test({
            hash: "QmPuDEFbf4SMDwKxX6BnMAFzaYqgouE3HZgkjVgp6Wkxy9",
            directory: true
        });
        test({
            hash: "QmZhtKv8zwj6CbqeWzwQYw9cJFYfGfppb2qYS1xvKkm417",
            directory: false
        });
        test({
            hash: "QmUpbbXcmpcXvfnKGSLocCZGTh3Qr8vnHxW5o8heRG6wDC",
            directory: false
        });
        test({
            hash: "QmdChoeCkScfkGN1h5kp2FWyE1QJDLLFibBWh6u2TPXV43",
            directory: false
        });
        test({
            hash: "Qmd69BU8jcZfWHTDNLYewHBbHNYeKFGy1DF8hjJMMS6yWr",
            directory: true
        });
        test({
            hash: "QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn",
            directory: true
        })
    });

    describe("publish/resolve", function () {
        var test = function (t) {
            it(t.hash + " -> " + t.name, function (done) {
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
            hash: "QmeHk2XUgWE6hYwktRnVb72rsHY8La2rb4HQpuCKDP3mAQ",
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

describe("remove", function () {
    var test = function (t) {
        it(t.path + "," + t.hash, function (done) {
            spacebox.remove(t.path, t.hash, t.options, function (err, hash) {
                if (err) return done(err);
                assert.strictEqual(hash, t.hash);
                done();
            });
        });
    };
    test({
        path: "data/blank.txt",
        options: {local: true},
        hash: "QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH"
    });
    test({
        path: "data/subdata",
        options: {local: true},
        hash: "QmZ2Y7UY6MdRwcKLBJyx18Jq1ygtEa9LQcmZLtM4R5bfLo"
    });
    test({
        path: "data/subdata/subsubdata",
        options: {local: true},
        hash: "QmZ2Y7UY6MdRwcKLBJyx18Jq1ygtEa9LQcmZLtM4R5bfLo"
    });
});

describe("upload", function () {
    var test = function (t) {
        it(t.path + ",{recursive:" + t.options.recursive + ",publish:" + t.options.publish + "} -> " + t.hash, function (done) {
            spacebox.upload(t.path, t.options, function (err, res) {
                if (err) return done(err);
                if (t.options.recursive) {
                    assert.isArray(res);
                    assert.isAbove(res.length, 1);
                    for (var i = 0, len = res.length; i < len; ++i) {
                        assert.property(res[i], "path");
                        assert.property(res[i], "hash");
                        assert.property(res[i], "directory");
                        if (res[i].path === t.path) {
                            assert.strictEqual(res[i].hash, t.hash);
                        }
                    }
                } else {
                    assert.strictEqual(res.hash, t.hash);
                    assert.strictEqual(res.directory, t.options.recursive);
                    if (res.name) {
                        assert.strictEqual(res.name, t.name);
                    }
                }
                done();
            });
        });
    };
    test({
        path: "data/test.dat",
        options: {
            recursive: false,
            publish: false
        },
        hash: "QmdChoeCkScfkGN1h5kp2FWyE1QJDLLFibBWh6u2TPXV43"
    });
    test({
        path: "data/test.csv",
        options: {
            recursive: false,
            publish: false
        },
        hash: "QmZhtKv8zwj6CbqeWzwQYw9cJFYfGfppb2qYS1xvKkm417"
    });
    test({
        path: "data/test.txt",
        options: {
            recursive: false,
            publish: false
        },
        hash: "QmUpbbXcmpcXvfnKGSLocCZGTh3Qr8vnHxW5o8heRG6wDC"
    });
    test({
        path: "data",
        options: {
            recursive: true,
            publish: false
        },
        hash: "QmPuDEFbf4SMDwKxX6BnMAFzaYqgouE3HZgkjVgp6Wkxy9"
    });
    test({
        path: "data/test.dat",
        options: {
            recursive: false,
            publish: true
        },
        hash: "QmdChoeCkScfkGN1h5kp2FWyE1QJDLLFibBWh6u2TPXV43"
    });
    test({
        path: "data/test.csv",
        options: {
            recursive: false,
            publish: true
        },
        hash: "QmZhtKv8zwj6CbqeWzwQYw9cJFYfGfppb2qYS1xvKkm417"
    });
    test({
        path: "data/test.txt",
        options: {
            recursive: false,
            publish: true
        },
        hash: "QmUpbbXcmpcXvfnKGSLocCZGTh3Qr8vnHxW5o8heRG6wDC"
    });
    test({
        path: "/home/jack/src/spacebox/data",
        options: {
            recursive: true,
            publish: true
        },
        hash: "QmPuDEFbf4SMDwKxX6BnMAFzaYqgouE3HZgkjVgp6Wkxy9"
    });
});
