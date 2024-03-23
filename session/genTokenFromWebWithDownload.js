const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const qrcode2 = require("qr-image");
const qrcode3 = require("qrcode-svg");
const { createWriteStream } = require("fs");
const { write, clean } = require("./manage");
const readline = require("readline");
const { unlink } = require("fs/promises");
const path = require("path");
const app = require("express")();

async function generateNewToken({ userId, token, url }) {
  clean();

  const botId = "whatsbot_" + userId + "_" + token;

  const client = new Client({
    puppeteer: { headless: true, args: ["--no-sandbox"] },
    authStrategy: new LocalAuth({ clientId: botId }),
  });

  client.initialize();

  client.on("qr", async (qr) => {
    console.log(`Sending qr code to client\n`);

    await qrcode2
      .image(qr, { type: "png", size: 10 })
      .pipe(
        createWriteStream(
          path.join(__dirname, `/qrTemp/${userId}_login_qrcode.png`)
        )
      );
    // res.download(
    //   path.join(__dirname, '/qrTemp/qr.png'), function (err) {
    //     console.log(err)
    //   }
    // )
  });

  client.on("ready", () => {
    client.destroy();
    console.log("Please wait...");
    // wait because filesystem is busy
    setTimeout(async () => {
      console.log("Session has been created");
      await write(token, userId);

      await fetch(url, {
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
      await unlink(path.join(__dirname, `/qrTemp/${userId}_login_qrcode.png`));
      // app.response.download("./session.secure");
    }, 3000);
  });

  return botId;
}

// app.get("*", async (req, res) => {
//   generateNewToken(req, res);
//   // res.download("./session.secure");
// });

module.exports = {
  registerBotSession: generateNewToken,
};
