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

async function generateNewToken({ userId, token, res }) {
  clean();
  console.log("cleaned..!");
  userId = userId.replace(" ", "-");
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
      `/qrTemp/${userId}_login_qrcode.png`,
      `http://${res.req.headers.host}`
    );

    return res.res.status(200).send({
      message: "QR genereated",
      data: {
        qrcode: opt2,
      },
    });

    // .sendFile(
    //   path.join(__dirname, `/qrTemp/${userId}_login_qrcode.png`),
    //   function (err) {
    //     console.log(err)
    //   }
    // );
    // res.download(
    //   path.join(__dirname, `/qrTemp/${userId}_login_qrcode.png`), function (err) {
    //     console.log(err)
    //   }
    // )
  });
  client.on("authenticated", async (session) => {
    console.log("authenticated", session);
  });
  client.on("ready", () => {
    client.destroy();
    console.log("Please wait...");
    // wait because filesystem is busy
    setTimeout(async () => {
      console.log("Session has been created");
      await write(token, userId);
      await fetch("http://localhost:5000/bot/notify", {
        method: "POST",
        body: JSON.stringify({
          botId,
          message: "authenticated",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      await unlink(path.join(__dirname, `/qrTemp/${userId}_login_qrcode.png`));
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
}

// app.get("*", async (req, res) => {
//   generateNewToken(req, res);
//   // res.download("./session.secure");
// });

module.exports = {
  registerBotSession: generateNewToken,
};