#!/usr/bin/env node
/**
 * spacebox
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var fs = require("fs");
var cp = require("child_process");
var crypto = require("crypto");
var p = require("path");
var async = require("async");
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
            ipfs.add(path, {recursive: recursive}, function (err, res) {
                if (err || !res) return callback(err || "couldn't add directory");
                if (res && res.constructor === Array && res.length) {
                    if (recursive && res && res.constructor === Array && res.length > 1) {
                        return callback(null, res);
                    }
                    callback(null, res[0]);
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
            });
        }

    },

    upload: function (path, options, callback) {
        var self = this;
        options = options || {};
        if (!callback && options && options.constructor === Function) {
            callback = options;
            options = {};
        }
        console.log("upload(", path,options,")");
        fs.exists(path, function (exists) {
            console.log("exists:", exists);
            if (!exists) return callback("path does not exist");
            self.ipfs.add(path, options.recursive, function (err, file) {
                var files = [];
                if (err || !file) return callback(err);

                // publish the results publicly to ethereum
                if (options.publish) {
                    if (!options.recursive) {
                        return self.eth.set_hash(path, file.Hash, function (err, res) {
                            if (err || !res) return callback(err);
                            if (res !== true) return callback(res);
                            self.ipfs.is_directory(file.Hash, function (err, directory) {
                                if (err) return callback(err);
                                callback(null, {
                                    hash: file.Hash,
                                    path: path,
                                    directory: directory
                                });
                            });
                        });
                    }
                    var basename = p.basename(path);
                    async.each(file, function (thisFile, nextFile) {
                        if (thisFile.Name === '') return nextFile();
                        self.ipfs.is_directory(thisFile.Hash, function (err, directory) {
                            if (err) return nextFile(err);
                            if (directory && thisFile.Name === basename) {
                                self.eth.set_hash(path, thisFile.Hash, function (err, res) {
                                    if (err || !res) return nextFile(err);
                                    if (res !== true) return nextFile(res);
                                    files.push({
                                        hash: thisFile.Hash,
                                        path: path,
                                        directory: directory
                                    });
                                    nextFile();
                                });
                            } else {
                                files.push({
                                    hash: thisFile.Hash,
                                    path: p.join(p.dirname(path), thisFile.Name),
                                    directory: directory
                                });
                                nextFile();
                            }
                        });
                    }, function (err) {
                        if (err) return callback(err);
                        callback(null, files);
                    });

                // store the results privately
                } else {
                    if (!options.recursive || file.Hash) {
                        return self.ipfs.is_directory(file.Hash, function (err, directory) {
                            if (err) return callback(err);
                            callback(null, {hash: file.Hash, directory: directory});
                        });
                    }
                    var basename = p.basename(path);
                    async.each(file, function (thisFile, nextFile) {
                        if (thisFile.Name === '') return nextFile();
                        self.ipfs.is_directory(thisFile.Hash, function (err, directory) {
                            if (err) return nextFile(err);
                            files.push({
                                hash: thisFile.Hash,
                                path: (thisFile.Name === basename) ? path : p.join(path, thisFile.Name),
                                directory: directory
                            });
                            nextFile();
                        });
                    }, function (err) {
                        if (err) return callback(err);
                        callback(null, files);
                    });
                }
            });
        });
    },

    synchronize: function (files, callback) {
        var self = this;
        var dirlist = [];
        var num_updates = 0;
        var updates = {};
        async.each(files, function (file, nextFile) {
            var hash = file.ipfshash;
            var path = file.filepath;
            var modified = file.modified;

            self.ipfs.add(path, {recursive: true}, function (err, file) {
                if (err) return nextFile(err);
                if (hash === file.Hash) return nextFile();

                // if the file's hash has changed,
                // keep the most recently modified copy
                self.ipfs.is_directory(hash, function (err, directory) {
                    if (err) return nextFile(err);
                    if (directory) {
                        dirlist.push(path);
                        return nextFile();
                    }
                    fs.stat(path, function (err, stat) {
                        if (err) return nextFile(err);
                        num_updates++;

                        // if the local copy is more recent, then upload it
                        if (new Date(stat.mtime) > new Date(modified)) {
                            self.upload(path, {recursive: true}, function (err, res) {
                                if (err) return nextFile(err);
                                console.log("Uploaded file " + path + ": " + file.Hash);
                                updates[path] = {
                                    hash: file.Hash,
                                    directory: false
                                };
                                nextFile();
                            });

                        // otherwise, download the remote copy
                        } else {
                            cp.exec("ipfs get " + hash + " -o " + path, function (err, stdout) {
                                if (err) return nextFile(err);
                                console.log("Downloaded " + path + ": " + file.Hash);
                                updates[path] = {
                                    hash: file.Hash,
                                    directory: false
                                };
                                nextFile();
                            });
                        }
                    });
                });
            });
            
        }, function (err) {
            if (err) return callback(err);
            async.each(dirlist, function (directory, nextDirectory) {
                self.upload(directory, {recursive: true}, function (err, res) {
                    if (err) return nextDirectory(err);
                    for (var i = 0, len = res.length; i < len; ++i) {
                        if (res[i].path === directory) {
                            console.log("Uploaded directory " + directory + ": " + res[i].hash);
                            updates[directory] = {
                                hash: res[i].hash,
                                directory: true
                            };
                            return nextDirectory();
                        }
                    }
                    nextDirectory(res);
                });
            }, function (err) {
                if (err) return callback(err);
                callback(null, updates);
            });
        });
    }
};
