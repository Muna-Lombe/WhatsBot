const { BotService } = require("../services/BotService");

class BotController {
  BotClient;
  static async initialize(req, res) {
    try {
      const { userId, token, phoneNumerId } = req.body;

      if (!userId || !token || !phoneNumerId) {
        res.status(400).json({
          status: 400,
          error: "Missing parameters",
        });
        return;
      }

      BotClient = await new BotService().initialize({
        userId,
        token,
        phoneNumerId,
      });
      res.status(200).json({
        status: 200,
        message: "Bot Initialized",
        data: { botId: BotClient.id },
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
      const { phone, message } = req.body;

      if (!phone || !message) {
        res.status(400).json({
          status: 400,
          error: "Missing parameters",
        });
        return;
      }

      await BotClient.connectBot();
      res.status(200).json({
        status: 200,
        message: "Bot Connected",
        data: { botId: "10" },
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
