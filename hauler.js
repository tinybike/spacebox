#!/usr/bin/env node

"use strict";

var net = require("net");
var spacebox = require("./");

var socket = net.connect({
    // host: "sync.hauler.io",
    // port: "80"
    host: "localhost",
    port: 9876
}, function () {
    console.log("connected to server");
});

socket.on("data", function (data) {
    data = JSON.parse(data);
    if (data && data.label) {
        console.log(data);
        switch (data.label) {
        case "synchronize":
            spacebox.synchronize(data.payload, function (err, updates) {
                if (err) {
                    console.error(err);
                    return socket.end();
                }
                socket.write(JSON.stringify({
                    label: "synchronized",
                    handle: data.handle,
                    payload: updates
                }));
            });
            break;

        case "upload":
            spacebox.upload(data.path, data.options, function (err, files) {
                if (err || !files) {
                    return console.error("upload failed:", err, files);
                }
                if (files && files.constructor === Object && !files.path) {
                    files.path = data.path;
                }
                socket.write(JSON.stringify({
                    label: "uploaded",
                    handle: data.handle,
                    payload: files
                }));
            });
            break;

        default:
            console.error("unknown label:", data.label);
            console.log(JSON.stringify(data, null, 2));
        }
    }
});
