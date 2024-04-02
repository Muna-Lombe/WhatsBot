const { Router } = require("express");
const { verifyToken } = require("../middlewares/Auth");
const { BotController } = require("../controllers/BotController");
const ws = require("ws");
const {
  registerBotSession,
} = require("../session/genTokenFromWebWithDownload");

const botRouter = Router();

// botRouter.post('/register', verifyToken, BotController.register);
// botRouter.post('/connect', verifyToken, BotController.connect);
// botRouter.post('/disconnect', verifyToken, BotController.disconnect);
// botRouter.post('/message', verifyToken, BotController.message);

const wsRouter = (socket, message) => {
  const { event, ...rest } = message.toJson();

  if (event === "register") {
    socket.send("waiting to register...");
    setTimeout(() => {
      Promise.all([
        new Promise((resolve, reject) => {
          registerBotSession;
          resolve();
        }),
      ]).then((promises) => {
        socket.send("registered");
      });
    }, 2000);
  }
  if (event === "connect") {
    socket.send("waiting to connect...");
    setTimeout(() => {
      Promise.all([
        new Promise((resolve, reject) => {
          wsClient.send("connect");
          resolve();
        }),
      ]).then((promises) => {
        socket.send("connected");
      });
    }, 2000);
  }
  if (event === "disconnect") {
    socket.send("waiting to disconnect...");
    setTimeout(() => {
      Promise.all([
        new Promise((resolve, reject) => {
          wsClient.send("disconnect");
          resolve();
        }),
      ]).then((promises) => {
        socket.send("disconnected");
      });

      // socket.send('disconnected')
    }, 2000);
  }
};

module.exports = { wsRouter };
