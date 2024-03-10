//jshint esversion:8
const config = require("../config");
const { botMsg } = require("../helpers/messageUtils");
const pmpermit = require("../helpers/pmpermit");

const execute = async (client, msg) => {
  const botmark = "​";

  if (config.pmpermit_enabled == "true" && !msg.to.includes("-")) {
    const userAllowed = await pmpermit.permit(msg.to.split("@")[0]);
    if (userAllowed) {
      return msg.reply(
        botMsg(
          "*✅ Allowed*\n\nYou are allowed for PM\n\n _Powered by WhatsBot_"
        )
      );
    }
    return msg.reply(
      botMsg(
        "*❌ Restricted*\n\nYou are not allowed for perform this action!\n\n _Powered by WhatsBot_"
      )
    );
  }
};

module.exports = {
  name: "Allow for PM",
  description: "Allow personal messaging for a conatct",
  command: "!allow",
  commandType: "admin",
  isDependent: false,
  help: `_You can allow him for pm by these commands_ 👇\n*!allow* - Allow an user for PM\n*!nopm* - Disallow an allowed user for PM`, // a string descring how to use this command Ex = help : 'To use this command type !test arguments'
  execute,
};
