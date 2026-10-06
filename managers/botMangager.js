// Description: This file contains the bot manager class which is responsible for managing the bot instances.
const { readdir } = require("fs/promises");
const { BotClientInstance } = require("../botClientInstanceCreator");
const { clean } = require("../session/manage");
const { listenersArray } = require("../factories/botFactory");
const { Socket } = require("socket.io");
const { Client } = require("whatsapp-web.js");

const getDirectories = async (source) => {
  return await readdir(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
};

/**
 * The bot manager class is responsible for managing the bot instances. It creates a new bot instance when a new bot is registered and stores the bot instance in a map with the bot id as the key. It also provides methods to get the bot instance from the bot id and add listeners to the bot instance.

 */
class WhatsappSessionManager {
  botIdVsClientInstance = {};
  botSocket = null;
  constructor() {
    this.botIdVsClientInstance = {};
    clean();

    return this;
  }
  /**Check if a session client exists */
  clientExists = (botId) => {
    return this.botIdVsClientInstance[botId] !== undefined;
  };

  /** Create a new session client
   * @param {String} botId - The Id to be used as the botId
   * @param {String} userId - The userId used to create the botId
   * @param {Socket} ws - The current socket connection
   * @param {Boolean} register - Whether or not to register or use a previously stored session client
   * @returns {Promise<BotClientInstance>}
   */
  createWAClient = async ({ botId, userId, ws, register }) => {
    // let client = null;
    this.botSocket ||= ws;

    if (this.botIdVsClientInstance[botId]) {
      return this.botIdVsClientInstance[botId];
    }
    if (register) {
      const {
        registerBotSession,
      } = require("../session/genTokenFromWebWithDownload");

      // console.log("what is registerBotSession", registerBotSession)
      const response = await registerBotSession({ userId, ws }); //
      // client = response.client;
      botId ||= response.botId;

      // response
      console.log("bot registration started..! ", response.botId);
      this.createWAClient({ botId, ws });
    }
    this.botIdVsClientInstance[botId] = new BotClientInstance({
      botId,
      ws,
      listeners: listenersArray,
    });

    // this.botIdVsClientInstance[botId] ||= client;

    return this.botIdVsClientInstance[botId];
  };

  /**
   *
   * @param {Array} excludedbotIds - An array of botIds to exclude from the restoration process
   * @param {String} botId - the Id of the bot to restore
   * @param {Socket} ws - The current socket connection
   *
   */
  async restorePreviousSessions({ excludedbotIds = [], botId }) {
    // this.botSocket ||= ws;

    if (botId) {
      return (
        this.getClientFromBotId({ botId }) ||
        (await this.createWAClient({ botId }))
      );
    }

    const directoryNames = await getDirectories("../.wwebjs_auth");
    const botIds = directoryNames.map((name) => name.split("-")[1]);

    botIds.forEach((botId) => {
      if (excludedbotIds.includes(botId)) return;
      this.createWAClient({ botId });
    });
    // return botIds
  }

  /**
   *
   *  @param {String} botId - The Id to be used as the botId
   * @returns {BotClientInstance}
   */
  getClientFromBotId = ({ botId }) => {
    // {botId:ClientInstance}
    console.log(
      "has botIdVsClientInstance:",
      this.botIdVsClientInstance.clientId ||
        (false, "creating new botClient instance...")
    );
    return this.botIdVsClientInstance[botId];
    //   ||= new BotClientInstance({
    //   botId,
    //   listeners: listenersArray,
    // });
  };

  /**
   *
   * @param {BotClientInstance} client - The client process to add the listeners to
   * @param {Array} listeners - An array of event listeners to add to the client
   *
   */
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
