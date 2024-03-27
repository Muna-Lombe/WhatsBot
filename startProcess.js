const { replicate, clean, fetchSession } = require("./session/manage");

async function startBot(userId, botId, botStarter) {
  try {
    clean();
    await fetchSession(userId);
    await replicate(userId);
    setTimeout(async () => {
      // require("./main");
      await botStarter(botId);
    }, 1000);
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}

module.exports = { startBot };
