const { BotFactory } = require("../factories/botFactory");

class BotManager {
  constructor() {
    this.bots = new Map();
  }

  registerBot(user, ws) {
    const bot = BotFactory.createBot(user, ws);
    this.bots.set(user, bot);
  }

  getBot(user) {
    return this.bots.get(user);
  }
}

module.exports = {
  BotManager,
};
