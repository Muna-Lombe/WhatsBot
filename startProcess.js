const { replicate, clean, fetchSession } = require("./session/manage");

async function startBot(botId, botStarter) {
  try {
    clean();
    await fetchSession();
    await replicate();
    setTimeout(async () => {
      // require("./main");
      await botStarter();
    }, 1000);
  } catch (error) {
    console.error("something caught:", error?.message);
  }
}

module.exports = { startBot };
