const { request, response } = require("express");
const { readFileSync } = require("fs");

const { BotClientInstance } = require("../botClientInstanceCreator");
const { startBot, stopBot } = require("../startProcess");
const { botsDb } = require("../services");
const { sleep } = require("../helpers/genUtils");
const { BotSessionManager } = require("../managers/botMangager");

class BotController {
  static BotClient = BotClientInstance;
  static startBot = startBot;

  /**
   * check bot session's health status
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message event received from the ws
   */
  static async healthCheck(socket, message) {
    const { conn, coll } = await botsDb;

    //check bot status and restart if should be running
    try {
      const { botSessions } = message;
      const { data } = await coll.read();
      // console.log("data", data)
      botSessions.forEach(async (botSess, x) => {
        console.log("Checking bot health for:", data);
        if (
          data[x]?.status === "running" &&
          (botSess.lastActionTriggered === "connect" ||
            botSess.lastActionTriggered === "register")
        ) {
          // if is running
          console.log("is connected ... check connection.");
          const bot = BotSessionManager.getClientFromBotId(
            data[x].botId,
            socket
          );
          const { error, state, info } = await bot?.connection(); // check connection

          if (!error) {
            console.log("bot connection status:", state, info);
          } else {
            console.log("bot connection status:", error);

            coll.update({ id: data[x].id }, { status: "stopped" });
          }

          return;
        } else if (
          data[x]?.status === "stopped" &&
          botSess.lastActionTriggered === "disconnect"
        ) {
          // if is stopped
          console.log("is stopped ...needs manual restart!...");
          return;
        } else if (
          data[x]?.status === "stopped" &&
          (botSess.lastActionTriggered === "connect" ||
            botSess.lastActionTriggered === "register")
        ) {
          // if should be running
          console.log("should be running ...starting...", botSess);

          await startBot(botSess.botId, botSess.botId.split("_")[2], socket);
          await sleep(1000);
        } else if (
          data[x]?.status === "running" &&
          botSess.lastActionTriggered === "disconnect"
        ) {
          // if should be stopped
          console.log("should be stopped ...stopping...");

          await stopBot(botId, botId.split("_")[2], BotClient);
        } else {
          // if something else
          console.log("no bot sessions exist!...");
        }
      });
      socket.send(JSON.stringify({ event: "healthCheck", botArray: data }));
    } catch (error) {
      console.log("error in healthCheck:", error);
    }
  }

  /**
   *
   * register a new bot session
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message event received from the ws
   */
  static async register(socket, message) {
    try {
      // socket.send("waiting to register...");
      const { userId } = message;
      setTimeout(() => {
        Promise.all([
          new Promise((resolve, reject) => {
            BotSessionManager.createWAClient({
              userId,
              ws: socket,
              register: true,
            });
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
  /**
   *
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message event received from the ws
   */
  static async connect(socket, message) {
    try {
      const { botId } = message;
      socket.send(JSON.stringify({ message: "waiting to connect..." }));
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

  /**
   * disconnect a bot session
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message event received from the ws
   */
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
