// Description: This file contains the bot manager class which is responsible for managing the bot instances.

// The bot manager class is responsible for managing the bot instances. It creates a new bot instance when a new bot is registered and stores the bot instance in a map with the bot id as the key. It also provides methods to get the bot instance from the bot id and add listeners to the bot instance.
const { readdir } = require("fs/promises");
const { BotClientInstance } = require("../botClientInstanceCreator");
const { clean } = require("../session/manage");
const { listenersArray } = require("../factories/botFactory");

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
  clientExists = (botId) => {
    return this.botIdVsClientInstance[botId] !== undefined;
  };

  createWAClient = async ({ botId, userId, ws, register }) => {
    let client = null;

    if (this.botIdVsClientInstance[botId]) {
      return this.botIdVsClientInstance[botId];
    }
    if (register) {
      const {
        registerBotSession,
      } = require("../session/genTokenFromWebWithDownload");

      // console.log("what is registerBotSession", registerBotSession)
      const response = await registerBotSession({ userId, ws }); //
      client = response.client;
      botId ||= response.botId;
      console.log(
        "new bot",
        this.botIdVsClientInstance,
        "/n respinse",
        response
      );
    }
    this.botIdVsClientInstance[botId] = new BotClientInstance({
      botId,
      ws,
      client,
      listeners: listenersArray,
    });

    this.botIdVsClientInstance[botId] = client;

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
    console.log(
      "has botIdVsClientInstance:",
      this.botIdVsClientInstance.clientId ||
        (false, "creating new botClient instance...")
    );
    return (this.botIdVsClientInstance[botId] ||= new BotClientInstance({
      botId,
      listeners: listenersArray,
    }));
  };

  addClientListeners = ({ client, listeners: [] }) => {
    // listeners.forEach((listener) => {
    //   client.addListener(listener.event, listener.callback);
    // });
    // // client ||= this.getClientFromBotId(botId);
    // client.addWs(ws);
  };

  getBotIds = () => {
    return Object.keys(this.botIdVsClientInstance);
  };
}

const singleWhatsappSessionManagerInstance = new WhatsappSessionManager();

module.exports = {
  BotSessionManager: singleWhatsappSessionManagerInstance,
};
