"use strict";

const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const xenv = require("@sap/xsenv");

cds.on("bootstrap", (app) => {
    app.use(proxy());
    // For handshake
    app.options("/*", (req, res) => {
        console.log("☞", req.headers);
        res.writeHead(200, { "Webhook-Allowed-Origin": "*" }).send();
    });

    // Basically accept GET requests to `webhooksub` path, logging
    app.get("/webhooksub", (req, res) => {
        console.log("☞", req.path);
        res.send("Hey, this is a webhook - send a POST!");
    });

    // Also accept POST requests to `webhooksub` path, and log out
    // what the path was, and also the JSON body if any.
    app.post("/webhooksub", (req, res) => {
        console.log("Webhooksub - Logs");
        console.log("Headers ☞", req.headers);
        console.log("PATH ☞", req.path);
        console.log("BODY ☞", req.body);
        // QOS - 1 --> It will delete the message only when it is getting 2xx acknowledgment from the webhook subscription (POST call). Else it won't delete the message
        // QOS - 0 --> It will delete the message irrespective of response of the POST call.
        res.status(200).end();
    });
});

module.exports = cds.server;
