// Description: This file contains the bot manager class which is responsible for managing the bot instances.

const QRCode = require("qrcode");
const { readdir } = require("fs/promises");
const { BotClient, BotClientInstance } = require("../mainly");
const { clean } = require("../session/manage");
const {
  registerBotSession,
} = require("../session/genTokenFromWebWithDownload");
// const { WhatsappWebSession } = require('./WhatsappWebSession')

const getDirectories = async (source) =>
  (await readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

class WhatsappSessionManager {
  botIdVsClientInstance = {};

  constructor() {
    this.botIdVsClientInstance = {};
    clean();

    return this;
  }

  createWAClient = async ({ botId, userId, ws, register }) => {
    let client = null;
    if (this.botIdVsClientInstance[botId]) {
      return this.botIdVsClientInstance[botId];
    }
    if (register) {
      client = (await registerBotSession({ userId, ws })).client; //
    }

    this.botIdVsClientInstance[botId] = new BotClientInstance(
      botId,
      ws,
      client
    );

    return this.botIdVsClientInstance[botId];
  };

  async restorePreviousSessions({ excludedbotIds = [], ws }) {
    const directoryNames = await getDirectories("../.wwebjs_auth");
    const botIds = directoryNames.map((name) => name.split("-")[1]);

    botIds.forEach((botId) => {
      if (excludedbotIds.includes(botId)) return;
      this.createWAClient({ botId, ws: ws || undefined });
    });
  }

  getClientFromBotId = ({ botId }) => {
    // {botId:ClientInstance}
    return this.botIdVsClientInstance[botId];
  };

  addClientListeners = ({ client, listeners: [] }) => {
    listeners.forEach((listener) => {
      client.addListener(listener.event, listener.callback);
    });
    const client = this.getClientFromBotId(botId);
    client.addWs(ws);
  };

  getBotIds = () => {
    return Object.keys(this.botIdVsClientInstance);
  };
}

const singularWhatsappSessionManager = new WhatsappSessionManager();

module.exports = {
  BotSessionManager: singularWhatsappSessionManager,
};
