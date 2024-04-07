//jshint esversion:11
const express = require("express");
const app = express();
const { createServer } = require("http");

const ws = require("ws");

const { router } = require("./routes");
const fs = require("fs");
const { wsRouter } = require("./routes/bot");
app.use(express.json()); // for application/json
app.use(express.urlencoded({ extended: true }));
app.use("/", router);
const httpServer = createServer(app, {});
httpServer.removeAllListeners("upgrade");

const wss = new ws.Server({ noServer: true });
wss.on("connection", (socket, req) => {
  socket.on("message", (message) => {
    console.log("wss:", message.toString());

    wsRouter(socket, message);
  });
  socket.on("error", (error) => console.log("ws Socket error: ", error));
});

wss.on("error", (error) => console.log("wss error: ", error));
httpServer.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname.startsWith("/api/bot")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    console.log("no scket", pathname);
    socket.destroy();
  }
});

httpServer.listen(process.env.PORT);
