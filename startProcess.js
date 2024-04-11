const { replicate, clean, fetchSession } = require("./session/manage");

async function startBot(botId, botToken, botClient, ws) {
  try {
    clean();
    await fetchSession(botId, botToken);
    await replicate(botId, botToken);
    setTimeout(async () => {
      // require("./main");
      await botClient(botId, ws).start();
    }, 1000);
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}
async function stopBot(botId, botClient) {
  try {
    await botClient(botId).stop();
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}

module.exports = { startBot, stopBot };
