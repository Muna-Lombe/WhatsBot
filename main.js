//jshint esversion:11
const express = require("express");
const app = express();
const ws = require("ws");

const { router } = require("./routes");
const fs = require("fs");
const { wsRouter } = require("./routes/bot");
app.use(express.json()); // for application/json
app.use(express.urlencoded({ extended: true }));

const wss = new ws.Server({ port: 5101, path: "/api/bot" });
wss.on("connection", (socket, req) => {
  socket.on("message", (message) => {
    console.log("wss", message.toString());
    wsRouter(socket, message);
  });
  socket.on("error", (error) => console.log("ws Socket error: ", error));
});

wss.on("error", (error) => console.log("wss error: ", error));
