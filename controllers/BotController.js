const { request, response, json } = require("express");
const { readFileSync } = require("fs");

const { BotClientInstance } = require("../botClientInstanceCreator");
const { startBot, stopBot } = require("../startProcess");
const { botsDb } = require("../services");
const { sleep, cleanUpBotCrumbs } = require("../helpers/genUtils");
const { BotSessionManager } = require("../managers/botMangager");
const { checkBotCondition } = require("../utilities");

class BotController {
  static BotClient = BotClientInstance;
  static startBot = startBot;

  /**
   * check bot session's health status
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message event received from the ws
   */
  static async healthCheck(socket, message, _retries = 0) {
    const { conn, coll } = await botsDb;
    const botHealthCheckSocket = {
      send: (body) => {
        if (body) {
          if (typeof body === "string") {
            const str = JSON.parse(body);
            str.event = "healthCheck";
            str.eventType = message.eventType;
            socket.send(JSON.stringify(str));
          } else {
            socket.send(
              JSON.stringify({
                event: body.event || "healthCheck",
                eventType: message.eventType,
                ...body,
              })
            );
          }
        }
      },
    };
    if (_retries > 10) return { status: "fail", message: "retry timedout" };

    //check bot status and restart if should be running
    try {
      const { botSessions } = message;
      const { data } = await coll.read();
      // console.log("data", data)
      let result = {};
      botSessions.forEach(async (botSess, x) => {
        console.log("Checking bot health for:", data?.[0]);

        result = await checkBotCondition({
          botSess,
          botHealthCheckSocket,
          botData: data,
        });
        if (
          result.status === "fail" &&
          result.message === "connectionState error"
        ) {
          return await this.healthCheck(socket, message, (_retries = +1));
        }
      });
      return result;
      // socket.send(JSON.stringify({ eventType:message.eventType, event: "healthCheck", botArray: data }));
    } catch (error) {
      console.log("error in healthCheck:", error);
      return { status: "fail", message: error.message };
    }
  }

  /**
   *
   * register a new bot session
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message received from the ws
   */
  static async register(socket, message) {
    const registerBotSocket = {
      send: (body) => {
        if (body) {
          if (typeof body === "string") {
            const str = JSON.parse(body);
            str.event = "register";
            str.eventType = message.eventType;
            socket.send(JSON.stringify(str));
          } else {
            socket.send(
              JSON.stringify({
                event: body.event || "register",
                eventType: message.eventType,
                ...body,
              })
            );
          }
        }
      },
    };

    try {
      // socket.send("waiting to register...");
      const { userId } = message;
      const prmRes = Promise.all([
        new Promise(async (resolve, reject) => {
          setTimeout(async () => {
            const botInstance = await BotSessionManager.createWAClient({
              userId,
              ws: registerBotSocket,
              register: true,
            });
            // registerBotSession({ userId, ws: socket });

            if (!botInstance.client) {
              reject({ status: "fail", message: "bot did not register" });
            }

            return resolve(
              { status: "pending" }
              // socket.send(JSON.stringify({ eventType:message.eventType, event: "register", status: "pending" }))
            );
            // socket.send(JSON.stringify({ eventType:message.eventType, event: 'register', status: 'fail', message:'bot did not register' }))
          }, 2000);
        }),
      ])
        .then((res) => res)
        .catch((res) => res);

      const res = await prmRes;
      return res.hasOwnProperty("0") ? res[0] : { ...res };
    } catch (error) {
      console.log("error in register:", error);
      // socket.send(
      //   JSON.stringify({
      //     eventType:message.eventType, event: "register",
      //     status: "fail",
      //     message: error.message
      //   })
      // )
      return {
        status: "fail",
        message: error.message,
      };
      // res.status(500).json({
      //   code: 500,
      //   error: error.message,
      // });
    }
  }
  /**
   *
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message event received from the ws
   */
  static async connect(socket, message) {
    const connectBotSocket = {
      send: (body) => {
        if (body) {
          if (typeof body === "string") {
            const str = JSON.parse(body);
            str.event = "connect";
            str.eventType = message.eventType;
            socket.send(JSON.stringify(str));
          } else {
            socket.send(
              JSON.stringify({
                event: body.event || "connect",
                eventType: message.eventType,
                ...body,
              })
            );
          }
        }
      },
    };

    try {
      const { botId } = message;
      connectBotSocket.send(
        JSON.stringify({ event: "connect", message: "waiting to connect..." })
      );
      const prmRes = Promise.all([
        new Promise((resolve, reject) => {
          setTimeout(async () => {
            const res = await startBot({
              event: "connect",
              botId,
              botToken: botId.split("_")[2],
              ws: connectBotSocket,
            });

            if (res?.status === "success") {
              resolve(
                // socket.send(JSON.stringify({ eventType:message.eventType, event: "connect", status: "success" }))
                { status: "success" }
              );
            } else {
              reject(
                // socket.send(JSON.stringify({ eventType:message.eventType, event: 'connect', status, message }))
                { status: "fail", message: "bot did not connect" }
              );
            }
          }, 2000);
        }),
      ])
        .then((re) => re)
        .catch((r) => r);

      const res = await prmRes;

      return res.hasOwnProperty("0") ? res[0] : { ...res };
    } catch (error) {
      console.log("error in connect:", error);
      // socket.send(
      //   JSON.stringify({
      //     eventType:message.eventType, event: "connect",
      //     status: "fail",
      //     message: error.message
      //   })
      // )

      return { status: "fail", message: error.message };
    }
  }

  /**
   * disconnect a bot session
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message event received from the ws
   */
  static async disconnect(socket, message) {
    const disconnectBotSocket = {
      send: (body) => {
        if (body) {
          if (typeof body === "string") {
            const str = JSON.parse(body);
            str.event = "disconnect";
            str.eventType = message.eventType;
            socket.send(JSON.stringify(str));
          } else {
            socket.send(
              JSON.stringify({
                event: body.event || "disconnect",
                eventType: message.eventType,
                ...body,
              })
            );
          }
        }
      },
    };

    try {
      const { botId } = message;
      // socket.send("waiting to disconnect...");
      disconnectBotSocket.send(
        JSON.stringify({
          eventType: message.eventType,
          event: "disconnect",
          status: "pending",
        })
      );

      const prmRes = Promise.all([
        new Promise((resolve, reject) => {
          setTimeout(async () => {
            const res = await stopBot(botId, disconnectBotSocket);
            if (res?.status === "success") {
              return resolve(
                { status: "success", message: "bot disconnected" }
                // socket.send(JSON.stringify({ eventType:message.eventType, event: "disconnect", status: "success" }))
              );
            } else {
              return reject({ status: "success", message: "bot disconnected" });
            }
            // socket.send(JSON.stringify({ eventType:message.eventType, event: 'disconnect', status: 'fail', message:"disconnect did not complete" }))

            // reject()
          }, 2000);
        }),
      ]);

      const res = await prmRes;
      return res.hasOwnProperty("0") ? res[0] : { ...res };
    } catch (error) {
      // socket.send(
      //   JSON.stringify({
      //     eventType:message.eventType, event: "disconnect",
      //     status: "fail",
      //     message: error.message,
      //   })
      // );
      return { status: "fail", message: error.message };
    }
  }
  /**
   * disconnect a bot session
   * @param {*} socket - a websocket(ws) connection
   * @param {*} message - a message event received from the ws
   */
  static async remove(socket, message) {
    const removeBotSocket = {
      send: (body) => {
        if (body) {
          if (typeof body === "string") {
            const str = JSON.parse(body);
            str.event = "remove";
            str.eventType = message.eventType;
            socket.send(JSON.stringify(str));
          } else {
            socket.send(
              JSON.stringify({
                event: body.event || "remove",
                eventType: message.eventType,
                ...body,
              })
            );
          }
        }
      },
    };

    try {
      const { botId } = message;
      removeBotSocket.send(
        JSON.stringify({
          eventType: message.eventType,
          event: "remove",
          status: "pending",
        })
      );

      const prmRes = Promise.all([
        new Promise((resolve, reject) => {
          setTimeout(async () => {
            const res = await stopBot(botId, removeBotSocket);
            if (res?.status === "success") {
              return resolve(
                { status: "success", message: "bot removed" }
                // socket.send(JSON.stringify({ eventType:message.eventType, event: "remove", status: "success" }))
              );
            } else {
              return reject({ status: "fail", message: "bot removed failed" });
            }
            // socket.send(JSON.stringify({ eventType:message.eventType, event: 'remove', status: 'fail', message:"remove did not complete" }))

            // reject()
          }, 2000);
        }),
      ]);
    } catch (error) {
      return {
        status: "fail",
        message: error.message,
      };
      // socket.send(
      //   JSON.stringify({
      //     eventType:message.eventType, event: "remove",
      //     status: "fail",
      //     message: error.message,
      //   })
      // );
    }
  }
}
module.exports = { BotController };
