const { BotSessionManager } = require("./managers/botMangager");
const { replicate, clean, fetchSession } = require("./session/manage");

/**
 * starts the bot
 * @param {*} botId - bot id to start
 * @param {*} botToken - token bound to bot
 * @param {*} ws - websocket connection
 */
async function startBot(botId, botToken, ws) {
  try {
    // clean();
    await fetchSession(botId, botToken);
    await replicate(botId, botToken);
    setTimeout(async () => {
      // require("./main");
      const bot = await BotSessionManager.getClientFromBotId({ botId });
      // console.log("pre ws-start bot",bot)
      bot.ws = ws;
      await bot.start();
      console.log("post ws-start bot", bot.client.commands.size);

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
    bot.client.stop();
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}

async function destroyBot(botId, ws) {
  try {
    const bot = await BotSessionManager.getClientFromBotId({ botId });
    bot.ws = ws;
    bot.client.stop();
    bot.client.destroy();
    return "ok";
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}

module.exports = { startBot, stopBot };
