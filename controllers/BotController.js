const { request } = require("express");
const { BotService } = require("../services/BotService");
const { readFileSync } = require("fs");
class BotController {
  BotClient;

  static async register(req, res) {
    try {
      const { userId, token } = req.body;
      console.log(req.body);
      if (!userId || !token) {
        res.status(400).json({
          status: 400,
          error: "Missing parameters",
        });
        return;
      }

      const botId = await BotService.register({
        userId,
        token,
        url: req.url,
      });

      const qrCode = readFileSync(
        path.join(__dirname, `../session/qrTemp/${userId}_login_qrcode.png`)
      );
      console.log("qrcode", qrcode);
      res.status(200).json({
        status: 200,
        message: "Bot Initialized",
        data: {
          qrcode: new Blob([qrCode], { type: "image/png" }),
          botId,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        error: error.message,
      });
    }
  }
  static async initialize(req, res) {
    try {
      const { userId, botId } = req.body;

      if (!userId || !botId) {
        res.status(400).json({
          status: 400,
          error: "Missing parameters",
        });
        return;
      }

      BotClient = await new BotService().initialize({
        userId,
        botId,
      });
      res.status(200).json({
        status: 200,
        message: "Bot Initialized",
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        error: error.message,
      });
    }
  }
  static async connect(req, res) {
    try {
      const { userId, botId } = req.body;

      if (!userId || !botId) {
        res.status(400).json({
          status: 400,
          error: "Missing parameters",
        });
        return;
      }

      await BotClient.connectBot({ userId, botId });
      res.status(200).json({
        status: 200,
        message: "Bot Connected",
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        error: error.message,
      });
    }
  }

  static async disconnect(req, res) {
    try {
      const { phone, template } = req.body;

      if (!phone || !template) {
        res.status(400).json({
          status: 400,
          error: "Missing parameters",
        });
        return;
      }

      await BotClient.disconnectBot();
      res.status(200).json({
        status: 200,
        message: "Bot Disconnected",
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        error: error.message,
      });
    }
  }
}
module.exports = { BotController };
