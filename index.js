#!/usr/bin/env node
/**
 * spacebox
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var fs = require("fs");
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

        // lookup the IPFS hash associated with your account's public key
        resolve: function (name, callback) {
            ipfs.name.resolve(name, function (err, res) {
                if (err || !res) return callback(err || "couldn't resolve name");
                if (res && res.constructor === Object && res.Path) {
                    return callback(null, res.Path);
                }
                callback(res);
            });
        },

        // publish an IPFS hash to your IPFS account's public key
        publish: function (hash, callback) {
            ipfs.name.publish(hash, function (err, res) {
                if (err || !res) return callback(err || "couldn't publish hash");
                if (res && res.constructor === Object && res.Name) {
                    return callback(null, res.Name);
                }
                callback(res);
            });
        },

        // add files/folders to IPFS
        add: function (path, recursive, callback) {
            if (!callback && recursive && recursive.constructor === Function) {
                callback = recursive;
                recursive = false;
            }
            var folder;
            if (path.indexOf('/') > -1) {
                folder = path.split('/');
                folder = folder[folder.length - 1];
            } else {
                folder = path;
            }
            ipfs.add(path, {recursive: recursive}, function (err, res) {
                if (err || !res) return callback(err || "couldn't add directory");
                if (res && res.constructor === Array && res.length) {
                    for (var i = 0, len = res.length; i < len; ++i) {
                        if (!recursive || res[i].Name === folder) {
                            return callback(null, res[i].Hash);
                        }
                    }
                }
            });
        },

        is_directory: function (hash, callback) {
            ipfs.ls(hash, function (err, res) {
                if (err || !res) return callback(err);
                if (res.Objects && res.Objects.constructor === Array && res.Objects.length && res.Objects[0] && res.Objects[0].constructor === Object && res.Objects[0].Links && res.Objects[0].Links.constructor === Array) {
                    return callback(null, !!res.Objects[0].Links.length);
                }
                callback(res);
            });
        },

        pin: function (hash, recursive, callback) {
            ipfs.pin.add(hash, {recursive: recursive}, function (err, res) {
                if (err || !res) return callback(err);
                if (res && res.Pinned) {
                    return callback(null, res.Pinned);
                }
                callback(res);
            })
        }

    },

    upload: function (path, options, callback) {
        var self = this;
        fs.exists(path, function (exists) {
            if (!exists) return callback("path does not exist");
            self.ipfs.add(path, options.recursive, function (err, hash) {
                if (err || !hash) return callback(err);

                // publish the results to ethereum
                if (options.publish) {
                    self.eth.set_hash(options.name, hash, function (err, res) {
                        if (err || !res) return callback(err);
                        if (res === true) {
                            return self.ipfs.is_directory(hash, function (err, directory) {
                                if (err) return callback(err);
                                callback(null, {
                                    hash: hash,
                                    name: name,
                                    directory: directory
                                });
                            });
                        }
                        callback(res);
                    });

                // store the results privately
                } else {
                    self.ipfs.is_directory(hash, function (err, directory) {
                        if (err) return callback(err);
                        callback(null, {hash: hash, directory: directory});
                    });
                }

                // self.ipfs.publish(hash, function (err, name) {
                //     if (err || !name) return callback(err);
                //     if (options.publish) {
                //         self.eth.set_hash(name, hash, function (err, res) {
                //             if (err || !res) return callback(err);
                //             if (res === true) {
                //                 return callback(null, { hash: hash, name: name });
                //             }
                //             callback(res);
                //         });
                //     } else {
                //         callback(null, { hash: hash, name: name });
                //     }
                // });
            });
        });
    }

};
