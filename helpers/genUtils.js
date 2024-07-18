const { botsDb } = require("../services");
const { clean } = require("../session/manage");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanUpBotCrumbs(botId) {
  // clean up bot associated files
  const botDir = `./bots/${botId}`;
  const botFiles = fs.readdirSync(botDir);
  for (const file of botFiles) {
    const filePath = `${botDir}/${file}`;
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmdirSync(filePath, { recursive: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }

  // clean up session storage related to bot
  clean(botId);

  // remove botSession from database
  const { coll, conn } = await botsDb;
  await coll.delete({ botId: botId });
}

module.exports = {
  sleep,
  cleanUpBotCrumbs,
};
