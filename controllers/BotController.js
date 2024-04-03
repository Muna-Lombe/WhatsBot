const { request, response } = require("express");
const { BotService } = require("../services/BotService");
const { readFileSync } = require("fs");
const {
  registerBotSession,
} = require("../session/genTokenFromWebWithDownload");
const { BotClient } = require("../mainly");
const { startBot, stopBot } = require("../startProcess");

class BotController {
  static BotClient = BotClient;
  static startBot = startBot;

  static async register(socket, message) {
    try {
      socket.send("waiting to register...");
      const { userId, token } = message;
      setTimeout(() => {
        Promise.all([
          new Promise((resolve, reject) => {
            registerBotSession({ userId, token, ws: socket });
            resolve();
          }),
        ]).then((promises) => {
          socket.send("registered");
        });
      }, 2000);
    } catch (error) {
      console.log("error in register:", error);
      res.status(500).json({
        code: 500,
        error: error.message,
      });
    }
  }
  static async connect(socket, message) {
    try {
      const { botId } = message;
      socket.send("waiting to connect...");
      setTimeout(() => {
        Promise.all([
          new Promise(async (resolve, reject) => {
            await startBot(botId.split("_")[1], botId, BotClient);

            resolve();
          }),
        ]).then((promises) => {
          socket.send("connected");
        });
      }, 2000);
    } catch (error) {
      console.log("error in connect:", error);
      res.status(404).json({
        // code: 500,
        error: JSON.stringify(error.stack),
      });
    }
  }

  static async disconnect(socket, message) {
    try {
      const { botId } = message;
      socket.send("waiting to disconnect...");
      setTimeout(() => {
        Promise.all([
          new Promise(async (resolve, reject) => {
            await stopBot(botId, BotClient);

            resolve();
          }),
        ]).then((promises) => {
          socket.send("disconnected");
        });
      }, 2000);
    } catch (error) {
      res.status(500).json({
        code: 500,
        error: error.message,
      });
    }
  }
}
module.exports = { BotController };
