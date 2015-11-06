#!/usr/bin/env node
// publish ipfs.se evm code to Ethereum network

"use strict";

var ethrpc = require("ethrpc");
var cp = require("child_process");

ethrpc.useHostedNode();
ethrpc.excision = false;
ethrpc.balancer = false;

cp.exec("serpent compile contracts/ipfs.se", function (err, bytecode) {
    if (err) return process.exit(err);
    ethrpc.publish(bytecode.replace("\n", ""), function (txhash) {
        if (!txhash) return process.exit("couldn't publish bytecode");
        var count = 0;
        (function get_receipt() {
            if (++count > 50) return process.exit("couldn't confirm upload");
            ethrpc.receipt(txhash, function (receipt) {
                if (receipt && receipt.contractAddress) {
                    console.log("contract address:", receipt.contractAddress);
                } else {
                    setTimeout(get_receipt, ethrpc.TX_POLL_INTERVAL);
                }
            });
        })();
    });
});
