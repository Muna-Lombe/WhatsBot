const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const qrcode2 = require("qr-image");
const qrcode3 = require("qrcode-svg");
const { createWriteStream, readFile } = require("fs");
const { write, clean } = require("./manage");
const readline = require("readline");
const { unlink } = require("fs/promises");
const path = require("path");
const { response } = require("express");
const app = require("express")();
const axios = require("axios");
const { server_url } = require("../config");
const { startBot } = require("../startProcess");

async function generateNewToken({ userId, http, BotClient, ws }) {
  try {
    clean();
    console.log("cleaned..!");
    userId = userId.replace(" ", "-");
    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const botId = "whatsbot_" + userId + "_" + token;
    console.log("botId: ", botId);
    const client = new Client({
      puppeteer: { headless: true, args: ["--no-sandbox"] },
      authStrategy: new LocalAuth({ clientId: botId }),
    });

    client.initialize();
    console.log("client initialized..!");

    client.on("qr", async (qr) => {
      console.log(`Sending qr code to client\n`);

      await qrcode2
        .image(qr, { type: "png", size: 10 })
        .pipe(
          createWriteStream(
            path.join(__dirname, `/qrTemp/${userId}_login_qrcode.png`)
          )
        );
      const opt1 = await new Promise((resolve, reject) => {
        new Blob(
          [
            readFile(
              path.join(__dirname, `/qrTemp/${userId}_login_qrcode.png`),
              (err, data) => {
                if (err) {
                  return reject(err);
                }
                resolve(data);
              }
            ),
          ],
          { type: "image/png" }
        );
      });
      const opt2 = new URL(
        `/securelink/qrTemp/${userId}_login_qrcode.png`,
        `http://${http?.req?.headers?.host || server_url}`
      );
      if (http?.hasOwnProperty("req")) {
        http.res.status(200).send({
          message: "QR genereated",
          data: {
            qrcode: opt2,
          },
        });
      } else if (ws) {
        const message = JSON.stringify({
          event: "register",
          status: "scanningQr",
          message: "qr-genereated",
          data: {
            botId,
            qrcode: opt2,
          },
        });
        console.log("sending wss message", message);
        ws.send(message);
      }

      // await axios.post(
      //     "http://localhost:5000/bot/message",
      //     {
      //       message: "qr-genereated",
      //       data: {
      //         qrcode: opt2,
      //       }
      //     }
      //   );
    });
    client.on("auth_failure", async (error) => {
      if (http.hasOwnProperty("req")) {
        await axios.post("http://localhost:5000/bot/message", {
          data: {
            botId,
          },
          message: "bot-register-error",
        });
      } else if (ws) {
        ws.send(
          JSON.stringify({
            event: "connect",
            status: "error",
            data: {
              botId,
            },
            message: "bot-register-error",
          })
        );
      }
    });
    client.on("authenticated", async (session) => {
      console.log("authenticated", session);
      if (http?.hasOwnProperty("req")) {
        await axios.post("http://localhost:5000/bot/message", {
          event: "connect",
          status: "pending",
          data: {
            botId,
          },
        });
      } else if (ws) {
        ws.send(
          JSON.stringify({
            event: "connect",
            status: "pending",
            data: {
              botId,
            },
          })
        );
      }
    });
    client.on("ready", () => {
      client.destroy();
      console.log("Please wait...");
      // wait because filesystem is busy
      setTimeout(async () => {
        console.log("Session has been created");
        await write(token, userId);
        if (http?.hasOwnProperty("req")) {
          await axios.post("http://localhost:5000/bot/message", {
            event: "connect",
            status: "complete",
            data: {
              botId,
            },
            message: "bot-registered",
          });
        } else if (ws) {
          ws.send(
            JSON.stringify({
              event: "connect",
              status: "complete",
              data: {
                botId,
              },
              message: "bot-registered",
            })
          );
        }

        await unlink(
          path.join(__dirname, `/qrTemp/${userId}_login_qrcode.png`)
        );
        startBot(botId.split("_")[1], botId, BotClient, ws);
        // app.response.download("./session.secure");
      }, 3000);
    });

    return {
      respond: (url) => {
        console.log("responding to ", url);
        return fetch(url, {
          method: "POST",
          body: JSON.stringify({
            userId,
            botId,
            message: "Bot registered!",
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      },
    };
  } catch (error) {
    console.log("", error);
  }
}

// app.get("*", async (req, res) => {
//   generateNewToken(req, res);
//   // res.download("./session.secure");
// });

module.exports = {
  registerBotSession: generateNewToken,
};
