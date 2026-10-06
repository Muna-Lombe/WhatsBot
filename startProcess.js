const { BotSessionManager } = require("./managers/botMangager");
const { replicate, clean, fetchSession } = require("./session/manage");

/**
 * starts the bot
 * @param {*} botId - bot id to start
 * @param {*} botToken - token bound to bot
 * @param {*} ws - websocket connection
 */
async function startBot({ event, botId, botToken, ws }) {
  try {
    // clean();
    const fetchSessionRes = await fetchSession(botId, botToken);
    const replicateRes = await replicate(botId, botToken);

    if (fetchSessionRes.data?.error || replicateRes.error?.message)
      throw new Error("fetchSession or replicate failed...");

    const prmRes = Promise.all([
      new Promise((resolve, reject) => {
        setTimeout(async () => {
          // require("./main");
          const bot = await BotSessionManager.restorePreviousSessions({
            botId,
          });
          // console.log("pre ws-start bot",bot)
          bot.ws = ws;
          const resp = (await bot.start({ event })).connectionStatus;
          console.log("command size", bot.client.commands.size);
          console.log("bot start response:", resp);

          if (resp === "coonected") {
            resolve({ status: "success", message: "bot started" });
          } else {
            reject({ status: "failed", message: "bot start error" });
          }

          // await botClient(botId, ws).start();
        }, 1000);
      }),
    ])
      .then((res) => res)
      .catch((res) => res);

    const res = await prmRes;

    return res.hasOwnProperty("0") ? res[0] : res;
  } catch (error) {
    console.error("something caught:", error?.message);
    return {
      status: "fail",
      message: error?.toString(),
    };
  }
}
async function stopBot(botId, ws) {
  try {
    const bot = BotSessionManager.getClientFromBotId({ botId });
    bot.ws = ws;
    bot.client.stop();
    return { status: "success" };
  } catch (error) {
    console.error("something caught:", error?.message);
    return {
      status: "fail",
      message: error.message,
    };
  }
}

async function destroyBot(botId, ws) {
  try {
    const bot = BotSessionManager.getClientFromBotId({ botId });
    bot.ws = ws;
    bot.client.stop();
    bot.client.destroy();
    return "ok";
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}

module.exports = { startBot, stopBot };
