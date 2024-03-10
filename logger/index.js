const { botMsg } = require("../helpers/messageUtils");

module.exports = async function logger(client, text) {
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
