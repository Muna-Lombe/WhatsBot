const { botMsg } = require("../helpers/messageUtils");

//jshint esversion:8
const execute = async (client, msg) => {
  const botmark = "​";

  client.sendPresenceAvailable();
  msg.reply(botMsg("```" + "I will be online from now." + "```"));
};

module.exports = {
  name: "Awake",
  description: "Stay online always !",
  command: "!awake",
  commandType: "plugin",
  isDependent: false,
  help: undefined,
  execute,
};
