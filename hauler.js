#!/usr/bin/env node

"use strict";

var net = require("net");
var spacebox = require("./");

var socket = net.connect({
    host: "localhost",
    port: 9876
}, function () {
    console.log("connected to server");
});

socket.on("data", function (data) {
    data = JSON.parse(data);
    var handle = data.handle;
    var files = data.payload;
    spacebox.synchronize(files, function (err, updates) {
        if (err) {
            console.error(err);
            return socket.end();
        }
        var response = {
            label: "synchronized",
            handle: handle,
            payload: updates
        };
        socket.write(JSON.stringify(response));
    });
});
