const { request, response } = require("express");
const { BotService } = require("../services/BotService");
const { readFileSync } = require("fs");
const {
  registerBotSession,
} = require("../session/genTokenFromWebWithDownload");
const { BotClientInstance } = require("../mainly");
const { startBot, stopBot } = require("../startProcess");
const { botsDb } = require("../services");
const { sleep } = require("../helpers/genUtils");
const {BotSessionManager} = require("../managers/botMangager");

class BotController {
  static BotClient = BotClientInstance;
  static startBot = startBot;

  static async healthCheck(socket, message) {
    const { conn, coll } = await botsDb;

    //check bot status and restart if should be running
    try {
      const { botSessions } = message;
      const { data } = await coll.read();
      botSessions.forEach(async (botSess, x) => {
        if (
          data[x].status === "running" &&
          (botSess.lastActionTriggered === "connect" ||
            botSess.lastActionTriggered === "register")
        ) {
          // if is running
          console.log("is connected ... check connection.");
          const bot = BotSessionManager.getClientFromBotId(data[x].botId, socket);

          console.log(await bot.connection())




          return;
        } else if (
          data[x].status === "stopped" &&
          botSess.lastActionTriggered === "disconnect"
        ) {
          // if is stopped
          console.log("is stopped ...do nothing");
          return;
        } else if (
          data[x].status === "stopped" &&
          (botSess.lastActionTriggered === "connect" ||
            botSess.lastActionTriggered === "register")
        ) {
          // if should be running
          console.log("should be running ...starting...", botSess);

          await startBot(
            botSess.botId,
            botSess.botId.split("_")[2],
            BotClient,
            socket
          );
          await sleep(1000);
        } else if (
          data[x].status === "running" &&
          botSess.lastActionTriggered === "disconnect"
        ) {
          // if should be stopped
          console.log("should be stopped ...stopping...");

          await stopBot(botId, botId.split("_")[2], BotClient);
        } else {
          // if something else
          console.log("doing nothing again...");
        }
      });
      socket.send(JSON.stringify({ event: "healthCheck", botArray: data }));
    } catch (error) {
      console.log("error in healthCheck:", error);
    }
  }
  static async register(socket, message) {
    try {
      // socket.send("waiting to register...");
      const { userId } = message;
      setTimeout(() => {
        Promise.all([
          new Promise((resolve, reject) => {
            BotSessionManager.createWAClient({userId, ws:socket, register:true});
            // registerBotSession({ userId, ws: socket });
            resolve();
          }),
        ]);
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
            await startBot(botId, botId.split("_")[2], socket);

            resolve();
          }),
        ]);
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
            await stopBot(botId, socket);

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
