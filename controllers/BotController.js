const { request, response } = require("express");
const { BotService } = require("../services/BotService");
const { readFileSync } = require("fs");
const {
  registerBotSession,
} = require("../session/genTokenFromWebWithDownload");
const { BotClient } = require("../mainly");
const { startBot } = require("../startProcess");

class BotController {
  static BotClient = BotClient;
  static startBot = startBot;

  static async register(req, res) {
    try {
      const { userId, token } = req.body;
      console.log("ref", req.body);
      if (!userId || !token) {
        res.status(400).json({
          code: 400,
          error: "Missing parameters",
        });
        return;
      }
      console.log("registering...", userId, token);
      await registerBotSession({
        userId,
        token,
        http: { req, res },
      });
      // res.status(200).json({
      //   code: 200,
      //   message: "Generating QR Code",
      // });

      // const { respond } = await BotService.register({
      //   userId,
      //   token,
      //   res: { req, res },
      // });

      // await respond(new URL(req.url, `http://${req.headers.host}`));
      // const qrCode = readFileSync(
      //   path.join(__dirname, `../session/qrTemp/${userId}_login_qrcode.png`)
      // );
      // console.log("qrcode", qrcode);
      // res.status(200).json({
      //   code: 200,
      //   message: "Bot Initialized",
      //   data: {
      //     qrcode: new Blob([qrCode], { type: "image/png" }),
      //     botId,
      //   },
      // });
    } catch (error) {
      console.log("error in register:", error);
      res.status(500).json({
        code: 500,
        error: error.message,
      });
    }
  }
  static async connect(req, res) {
    try {
      const { userId, botId } = req.body;
      console.log("conn", req.body);

      if (!userId || !botId) {
        res.status(400).json({
          code: 400,
          error: "Missing parameters",
        });
        return;
      }
      await startBot(botId.split("_")[1], botId, BotClient);

      // const BotClient = new BotService(userId, botId);
      // await BotClient.connect();
      res.status(200).json({
        code: 200,
        message: "Bot Connected",
      });
    } catch (error) {
      console.log("error in connect:", error);
      res.status(404).json({
        // code: 500,
        error: JSON.stringify(error.stack),
      });
    }
  }

  static async disconnect(req, res) {
    try {
      const { phone, template } = req.body;

      if (!phone || !template) {
        res.status(400).json({
          code: 400,
          error: "Missing parameters",
        });
        return;
      }

      await this.BotClient.client.disconnectBot();
      res.status(200).json({
        code: 200,
        message: "Bot Disconnected",
      });
    } catch (error) {
      res.status(500).json({
        code: 500,
        error: error.message,
      });
    }
  }
}
module.exports = { BotController };
