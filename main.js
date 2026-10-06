//jshint esversion:11
const express = require("express");
const app = express();
const { createServer } = require("http");

const ws = require("ws");

const { router } = require("./routes");
const fs = require("fs");
const { wsRouter } = require("./routes/botRoute.js");

// middlewares
app.use(express.json()); // for application/json
app.use(express.urlencoded({ extended: true }));
app.use("/", router);

// start a server and ensure is not listening
// for web sockets
const httpServer = createServer(app, {});
httpServer.removeAllListeners("upgrade");

// start a web socket server and add listeners
const wss = new ws.Server({ noServer: true });

// handle upgrade requests
httpServer.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname.startsWith("/api/bot")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    console.log("no socket", pathname);
    socket.destroy();
  }
});

wss.on("connection", (socket, req) => {
  socket.on("message", (message) => {
    // console.log("wss:", message.toString());

    wsRouter(socket, message);
  });
  socket.on("pong", () => console.log("pong"));
  socket.on("error", (error) => console.log("ws Socket error: ", error));
});

wss.on("error", (error) => console.log("wss error: ", error));

wss.on("close", (error) => console.log("wss close: ", error));

httpServer.listen(process.env.PORT);
