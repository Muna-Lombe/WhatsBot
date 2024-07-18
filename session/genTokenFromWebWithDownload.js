const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const qrcode2 = require("qr-image");
const qrcode3 = require("qrcode-svg");
const { createWriteStream, readFile, rmSync, existsSync } = require("fs");
const { write, clean, deleteAllFilesInDir } = require("./manage");
const readline = require("readline");
const { unlink, rm, mkdir, rmdir } = require("fs/promises");
const path = require("path");
const { response } = require("express");
const app = require("express")();
const axios = require("axios");
const { server_url } = require("../config");
const { startBot } = require("../startProcess");
const { botsDb } = require("../services");

async function generateNewToken({ userId, http, ws }) {
  try {
    // clean();
    console.log("commented out cleaning in tokenGen..! uncomment if needed.");
    userId = userId.replace(" ", "-");
    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const botId = "whatsbot_" + userId + "_" + token;
    // console.log("botId: ", botId);

    // create user folder if it doesn't exist
    if (!existsSync(path.join(__dirname, `/qrAuth/${userId}`))) {
      await mkdir(path.join(__dirname, `/qrAuth/${userId}`));
    }

    console.log("initialising register-client...");
    const client = new Client({
      puppeteer: { headless: true, args: ["--no-sandbox"] },
      authStrategy: new LocalAuth({ clientId: botId }),
    });

    client.initialize();
    console.log("register-client initialized..!");

    console.log("creating bot...");
    client.on("qr", async (qr) => {
      // await unlink(
      //   path.join(__dirname, `/qrAuth/${userId}`)
      // )

      await deleteAllFilesInDir(path.join(__dirname, `/qrAuth/${userId}`));
      console.log(`Sending qr code to client\n`);

      const saveAndSendQr = async () => {
        await qrcode2
          .image(qr, { type: "png", size: 10 })
          .pipe(
            createWriteStream(
              path.join(
                __dirname,
                `/qrAuth/${userId}/${token}_login_qrcode.png`
              )
            )
          );

        const opt2 = new URL(
          `/securelink/qrAuth/${userId}/${token}_login_qrcode.png`,
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
      };
      setTimeout(() => {
        saveAndSendQr();
      }, 500);

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
    client.on("ready", async () => {
      const { conn, coll } = await botsDb;

      client.destroy();
      console.log("Please wait...");
      // wait because filesystem is busy
      setTimeout(async () => {
        console.log("Session has been created");

        await write(botId, token);
        await coll.insert({ botId, status: "running", timestamp: new Date() });

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

        await rm(path.join(__dirname, `/qrAuth/${userId}`), {
          recursive: true,
          force: true,
        });

        // await unlink(
        //   path.join(__dirname, `/qrAuth/${userId}`)
        // );

        startBot(botId, botId.split("_")[2], ws);
        // app.response.download("./session.secure");
      }, 3000);
    });

    return { botId, client };
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
