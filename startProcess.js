const { BotSessionManager } = require("./managers/botMangager");
const { replicate, clean, fetchSession } = require("./session/manage");

async function startBot(botId, botToken, ws) {
  try {
    // clean();
    await fetchSession(botId, botToken);
    await replicate(botId, botToken);
    setTimeout(async () => {
      // require("./main");
      const bot = await BotSessionManager.getClientFromBotId({ botId });
      bot.ws = ws;
      bot.start();

      // await botClient(botId, ws).start();
    }, 1000);
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}
async function stopBot(botId, ws) {
  try {
    const bot = await BotSessionManager.getClientFromBotId({ botId });
    bot.ws = ws;
    bot.stop();
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}

module.exports = { startBot, stopBot };
