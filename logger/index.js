const { Client } = require("whatsapp-web.js");
const { botMsg } = require("../helpers/messageUtils");

module.exports = async function logger(client = new Client(), text) {
  console.log("emitting message to WA contact...", client.info.wid.user);
  try {
    await client.sendMessage(client.info.wid._serialized, botMsg(text));
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Example:
// await logger(client, "message");
