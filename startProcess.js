const { replicate, clean, fetchSession } = require("./session/manage");

async function startBot(userId, botId, botClient, ws) {
  try {
    clean();
    await fetchSession(userId);
    await replicate(userId);
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
