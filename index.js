#!/usr/bin/env node
/**
 * spacebox
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var crypto = require("crypto");
var multihash = require("multi-hash");
var ipfs = require("ipfs-api")("localhost", "5001");
var abi = require("augur-abi");
var ethrpc = require("ethrpc");

function noop() { }

function sha256(str) {
    return "0x" + crypto.createHash("sha256").update(str).digest("hex");
}

module.exports = {

    eth: {

        contract: "0xbb546e90de503eb15d9730b7e1480d6f1e85686e",

        coinbase: null,

        set_hash: function (name, hash, callback) {
            var self = this;
            function sendTx(name, hash) {
                ethrpc.transact({
                        from: self.coinbase,
                        to: self.contract,
                        method: "set_hash",
                        signature: "ii",
                        send: true,
                        returns: "number",
                        params: [
                            sha256(name),
                            abi.hex(multihash.decode(hash))
                        ]
                    },
                    noop,
                    function (res) {
                        if (res && res.callReturn === "1") {
                            callback(null, true);
                        }
                    },
                    callback
                );
            }
            if (name && hash) {
                if (this.coinbase === null) {
                    return ethrpc.coinbase(function (coinbase) {
                        if (coinbase && !coinbase.error) {
                            self.coinbase = coinbase;
                            sendTx(name, hash);
                        }
                    });
                }
                sendTx(name, hash);
            }
        },

        get_hash: function (name, callback) {
            var tx = {
                to: this.contract,
                method: "get_hash",
                signature: "i",
                send: false,
                returns: "hash",
                params: sha256(name)
            };
            if (callback && callback.constructor === Function) {
                return ethrpc.fire(tx, function (hash) {
                    if (!hash || hash.error || !parseInt(hash)) {
                        return callback(hash);
                    }
                    callback(null, multihash.encode(abi.unfork(hash)));
                });
            }
            var hash = ethrpc.fire(tx);
            if (!hash || hash.error || !parseInt(hash)) throw hash;
            return multihash.encode(abi.unfork(hash));
        }

    },

    ipfs: {

        resolve: function (name, callback) {
            ipfs.name.resolve(name, function (err, res) {
                if (err || !res) return callback(err || "couldn't resolve name");
                if (res && res.constructor === Object && res.Path) {
                    return callback(null, res.Path);
                }
                callback(res);
            });
        },

        publish: function (hash, callback) {
            ipfs.name.publish(hash, function (err, res) {
                if (err || !res) return callback(err || "couldn't publish hash");
                if (res && res.constructor === Object && res.Name) {
                    return callback(null, res.Name);
                }
                callback(res);
            });
        },

        add_files: function (path, recurse, callback) {
            if (!callback && recurse && recurse.constructor === Function) {
                callback = recurse;
                recurse = false;
            }
            var folder;
            if (path.indexOf('/') > -1) {
                folder = path.split('/');
                folder = folder[folder.length - 1];
            } else {
                folder = path;
            }
            ipfs.add(path, {recursive: recurse}, function (err, res) {
                if (err || !res) return callback(err || "couldn't add directory");
                if (res && res.constructor === Array && res.length) {
                    for (var i = 0, len = res.length; i < len; ++i) {
                        if (!recurse || res[i].Name === folder) {
                            return callback(null, res[i].Hash);
                        }
                    }
                }
            });
        }
    
    },

    upload: function (path, recurse, publish, callback) {
        var self = this;
        this.ipfs.add_files(path, recurse, function (err, hash) {
            if (err || !hash) return callback(err);
            self.ipfs.publish(hash, function (err, name) {
                if (err || !name) return callback(err);
                if (publish) {
                    self.eth.set_hash(name, hash, function (err, res) {
                        if (err || !res) return callback(err);
                        if (res === true) {
                            return callback(null, { hash: hash, name: name });
                        }
                        callback(res);
                    });
                } else {
                    callback(null, { hash: hash, name: name });
                }
            });
        });
    }

};
