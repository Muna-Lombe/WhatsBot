const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { readdir } = require("fs/promises");
const { BotClient } = require("../mainly");
// const { WhatsappWebSession } = require('./WhatsappWebSession')

const getDirectories = async (source) =>
  (await readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

class WhatsappSessionManager {
  sessionIdVsClientInstance = {};

  constructor() {
    this.sessionIdVsClientInstance = {};
    return this;
  }

  createWAClient = (sessionId, qrGenerationCallback, readyInstanceCallback) => {
    return new WhatsappWebSession(
      sessionId,
      qrGenerationCallback,
      readyInstanceCallback
    );
  };

  async restorePreviousSessions(excludedSessionIds = []) {
    const directoryNames = await getDirectories("../.wwebjs_auth");
    const sessionIds = directoryNames.map((name) => name.split("-")[1]);

    sessionIds.forEach((sessionId) => {
      if (excludedSessionIds.includes(sessionId)) return;
      this.createWAClient(sessionId);
    });
  }

  getClientFromSessionId = (sessionId) => {
    // {sessionId:ClientInstance}
    return this.sessionIdVsClientInstance[sessionId];
  };
}

const singularWhatsappSessionManager = new WhatsappSessionManager();
module.exports = {
  BotSessionManager: singularWhatsappSessionManager,
};
