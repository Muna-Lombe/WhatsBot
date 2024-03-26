class Bot {
  constructor(user, ws) {
    this.user = user;
    this.ws = ws;

    this.ws.on("message", (message) => {
      // handle incoming messages
      console.log(`Received message: ${message}`);
    });
  }

  sendMessage(message) {
    this.ws.send(message);
  }
}

class BotFactory {
  createBot(user, ws) {
    return new Bot(user, ws);
  }
}

module.exports = {
  BotFactory,
};
