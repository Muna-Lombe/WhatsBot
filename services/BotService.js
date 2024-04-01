const axios = require("axios");
/**
 * Main entry point of the WhatsBot application.
 * Initializes the WhatsApp client using whatsapp-web.js library.
 * @module WhatsBot
 */
const { Client, LocalAuth } = require("whatsapp-web.js");
/**
 * Helper module for managing PM permits.
 * @module pmpermit
 */
const pmpermit = require("../helpers/pmpermit");

const fs = require("fs");
/**
 * Logger module for logging messages.
 * @type {object}
 */
const logger = require("../logger");
const { afkHandler } = require("../helpers/afkWrapper");
const {
  incommingInput,
  updateInputState,
} = require("../helpers/commandInputState");
const { getContactIdByName } = require("../helpers/findContact");
const { callCommand } = require("../helpers/commandWrapper");
const { botMsg } = require("../helpers/messageUtils");
const { INPUTSTATETYPES } = require("../helpers/commandUtils");

const botmark = "​";

/**
 * Configuration object for the application.
 * @type {object}
 */
const config = require("../config");
const database = require("../db");
const {
  registerBotSession,
} = require("../session/genTokenFromWebWithDownload");
const { response } = require("express");

function createBotSession({ userId, botId }) {
  try {
    const client = new Client({
      puppeteer: { headless: true, args: ["--no-sandbox"] },
      authStrategy: new LocalAuth({ clientId: botId }),
    });

    client.commands = new Map();

    fs.readdir(`${__dirname}/../commands`, (err, files) => {
      if (err) return console.error(err);
      files.forEach((commandFile) => {
        if (commandFile.endsWith(".js")) {
          let commandName = commandFile.replace(".js", "");
          const command = require(`${__dirname}/../commands/${commandName}`);
          client.commands.set(commandName, command);
        }
      });
    });

    console.log("creating bot session for user: ", userId);
    database("BotSessions").then(({ conn, coll }) => {
      coll.create({ userId, token: botId, phoneNumberId: 1 });
    });
    console.log("client started:");
    return client;
  } catch (error) {
    console.log("error", error);
  }
}

const addClientHandlers = ({ client }) => {
  try {
    client.on("ready", async () => {
      console.log("Bot has been started");
      try {
        await logger(
          client,
          "Bot has been started!\n\nGet started by sending `!help` to see what commands are available."
        );
      } catch (err) {
        console.log(err);
      }
    });

    client.on("message", async (msg) => {
      if (!msg.author && config.pmpermit_enabled === "true") {
        var checkIfAllowed = await pmpermit.handler(msg.from.split("@")[0]); // get status

        if (!checkIfAllowed.permit) {
          // if not permitted
          if (checkIfAllowed.block) {
            await msg.reply(botMsg(checkIfAllowed.msg));
            setTimeout(async () => {
              await (await msg.getContact()).block();
            }, 500);
          } else if (!checkIfAllowed.block) {
            msg.reply(botMsg(checkIfAllowed.msg));
          }
        } else {
          await checkAndApplyAfkMode();
        }
      }

      if (!msg.author && config.pmpermit_enabled !== "true") {
        await checkAndApplyAfkMode();
      }

      async function checkAndApplyAfkMode() {
        const contact = await msg.getContact();
        const afkData = await afkHandler(contact?.name || contact?.pushname);
        if (afkData?.notify) {
          //if user is afk
          const { reason, timediff } = afkData;
          let lastseen = "";
          lastseen += timediff[0] ? `${timediff[0]} days ` : "";
          lastseen += timediff[1] ? `${timediff[1]} hrs ` : "";
          lastseen += timediff[2] ? `${timediff[2]} min ` : "";
          lastseen += `${timediff[3]} sec ago`;
          await msg.reply(
            `${botmark}${afkData.msg}\n\n😊😊😊\n\nI am currently offline...\n\n*Reason*: ${reason}\n*Last Seen*:${lastseen}`
          );
        }
      }
    });

    client.on("message_create", async (msg) => {
      // auto pmpermit
      // console.log("message create called")
      try {
        if (config.pmpermit_enabled == "true") {
          // console.log("pmpermit_enabled")

          let otherChat = await (await msg.getChat()).getContact();
          let authorIsPermited = await pmpermit.isPermitted(otherChat.number);
          // console.log("checking if author permitted...", authorIsPermited)
          if (
            msg.fromMe &&
            msg.type !== "notification_template" &&
            otherChat.isUser &&
            !authorIsPermited &&
            !otherChat.isMe &&
            !msg.body.startsWith("!") &&
            !msg.body.endsWith("_Powered by WhatsBot_")
          ) {
            console.log("is not permitted");
            await pmpermit.permit(otherChat.number);
            await msg.reply(
              `${botmark}You are automatically permitted for message !\n\n_Powered by WhatsBot_`
            );
          }
        }
      } catch (err) {
        console.log("something not right in authorPermit:\n", err);
      }

      if (
        msg.fromMe &&
        !msg.body.startsWith("!") &&
        !msg.body.startsWith(botmark)
      ) {
        console.log("is message incoming: ", incommingInput().isIncomming);

        const args = msg.body.split(" ").map((arg) => arg.toLowerCase());

        const input = incommingInput();

        if (
          input.inputState === INPUTSTATETYPES["reading command"] ||
          input.inputState === INPUTSTATETYPES["waiting for command"]
        ) {
          console.log(input.inputState);
          // updateInputState("schedule", INPUTSTATETYPES["reading command"], false);
          return client.commands
            .get("schedule")
            .execute(client, msg, [input.inputState, ...args]);
        }
        if (input.inputState === INPUTSTATETYPES["confirming command"]) {
          console.log(INPUTSTATETYPES["confirming command"]);
          // updateInputState("schedule", INPUTSTATETYPES["confirming command"], false);
          return client.commands
            .get("schedule")
            .execute(client, msg, [
              INPUTSTATETYPES["confirming command"],
              ...args,
            ]);
        }
        if (input.inputState === INPUTSTATETYPES["updating command"]) {
          console.log(INPUTSTATETYPES["updating command"]);
          // updateInputState("schedule", INPUTSTATETYPES["updating command"], false);
          if (input.args[1] === "edit") {
            if (input.args?.[2]) {
              return client.commands
                .get("schedule")
                .execute(client, msg, [
                  INPUTSTATETYPES["updating command"],
                  "edit",
                  input.args?.[2],
                  ...args,
                ]);
            }
            return client.commands
              .get("schedule")
              .execute(client, msg, [
                INPUTSTATETYPES["updating command"],
                "edit",
                ...args,
              ]);
          }
          return client.commands
            .get("schedule")
            .execute(client, msg, [
              INPUTSTATETYPES["updating command"],
              ...args,
            ]);
        }
      }

      if (msg.fromMe && msg.body.startsWith("!")) {
        callCommand(client, msg, incommingInput(), updateInputState);
      }

      // if(getContactIdByName("muna") === msg.from && msg.body.startsWith("!")){
      //   callCommand(client, msg, incommingInput(), updateInputState)
      // }
    });

    client.on("message_revoke_everyone", async (after, before) => {
      if (before) {
        if (
          before.fromMe !== true &&
          before.hasMedia !== true &&
          before.author == undefined &&
          config.enable_delete_alert == "true"
        ) {
          client.sendMessage(
            before.from,
            botMsg("_You deleted this message_ 👇👇\n\n" + before.body)
          );
        }
      }
    });

    client.on("disconnected", (reason) => {
      console.log("Client was logged out", reason);
      try {
        client.destroy();
        client.initialize();
      } catch (error) {
        logger(client, "Client was logged out, could not reconnect");
      }
    });
    return client;
  } catch (error) {
    console.log(error);
  }
};

class BotService {
  constructor(userId, botId) {
    try {
      this.client = createBotSession({ userId, botId });

      client.on("ready", async () => {
        console.log("Bot has been started");
        try {
          await logger(
            client,
            "Bot has been started!\n\nGet started by sending `!help` to see what commands are available."
          );
        } catch (err) {
          console.log(err);
        }
      });

      client.on("message", async (msg) => {
        if (!msg.author && config.pmpermit_enabled === "true") {
          var checkIfAllowed = await pmpermit.handler(msg.from.split("@")[0]); // get status

          if (!checkIfAllowed.permit) {
            // if not permitted
            if (checkIfAllowed.block) {
              await msg.reply(botMsg(checkIfAllowed.msg));
              setTimeout(async () => {
                await (await msg.getContact()).block();
              }, 500);
            } else if (!checkIfAllowed.block) {
              msg.reply(botMsg(checkIfAllowed.msg));
            }
          } else {
            await checkAndApplyAfkMode();
          }
        }

        if (!msg.author && config.pmpermit_enabled !== "true") {
          await checkAndApplyAfkMode();
        }

        async function checkAndApplyAfkMode() {
          const contact = await msg.getContact();
          const afkData = await afkHandler(contact?.name || contact?.pushname);
          if (afkData?.notify) {
            //if user is afk
            const { reason, timediff } = afkData;
            let lastseen = "";
            lastseen += timediff[0] ? `${timediff[0]} days ` : "";
            lastseen += timediff[1] ? `${timediff[1]} hrs ` : "";
            lastseen += timediff[2] ? `${timediff[2]} min ` : "";
            lastseen += `${timediff[3]} sec ago`;
            await msg.reply(
              `${botmark}${afkData.msg}\n\n😊😊😊\n\nI am currently offline...\n\n*Reason*: ${reason}\n*Last Seen*:${lastseen}`
            );
          }
        }
      });

      client.on("message_create", async (msg) => {
        // auto pmpermit
        // console.log("message create called")
        try {
          if (config.pmpermit_enabled == "true") {
            // console.log("pmpermit_enabled")

            let otherChat = await (await msg.getChat()).getContact();
            let authorIsPermited = await pmpermit.isPermitted(otherChat.number);
            // console.log("checking if author permitted...", authorIsPermited)
            if (
              msg.fromMe &&
              msg.type !== "notification_template" &&
              otherChat.isUser &&
              !authorIsPermited &&
              !otherChat.isMe &&
              !msg.body.startsWith("!") &&
              !msg.body.endsWith("_Powered by WhatsBot_")
            ) {
              console.log("is not permitted");
              await pmpermit.permit(otherChat.number);
              await msg.reply(
                `${botmark}You are automatically permitted for message !\n\n_Powered by WhatsBot_`
              );
            }
          }
        } catch (err) {
          console.log("something not right in authorPermit:\n", err);
        }

        if (
          msg.fromMe &&
          !msg.body.startsWith("!") &&
          !msg.body.startsWith(botmark)
        ) {
          console.log("is message incoming: ", incommingInput().isIncomming);

          const args = msg.body.split(" ").map((arg) => arg.toLowerCase());

          const input = incommingInput();

          if (
            input.inputState === INPUTSTATETYPES["reading command"] ||
            input.inputState === INPUTSTATETYPES["waiting for command"]
          ) {
            console.log(input.inputState);
            // updateInputState("schedule", INPUTSTATETYPES["reading command"], false);
            return client.commands
              .get("schedule")
              .execute(client, msg, [input.inputState, ...args]);
          }
          if (input.inputState === INPUTSTATETYPES["confirming command"]) {
            console.log(INPUTSTATETYPES["confirming command"]);
            // updateInputState("schedule", INPUTSTATETYPES["confirming command"], false);
            return client.commands
              .get("schedule")
              .execute(client, msg, [
                INPUTSTATETYPES["confirming command"],
                ...args,
              ]);
          }
          if (input.inputState === INPUTSTATETYPES["updating command"]) {
            console.log(INPUTSTATETYPES["updating command"]);
            // updateInputState("schedule", INPUTSTATETYPES["updating command"], false);
            if (input.args[1] === "edit") {
              if (input.args?.[2]) {
                return client.commands
                  .get("schedule")
                  .execute(client, msg, [
                    INPUTSTATETYPES["updating command"],
                    "edit",
                    input.args?.[2],
                    ...args,
                  ]);
              }
              return client.commands
                .get("schedule")
                .execute(client, msg, [
                  INPUTSTATETYPES["updating command"],
                  "edit",
                  ...args,
                ]);
            }
            return client.commands
              .get("schedule")
              .execute(client, msg, [
                INPUTSTATETYPES["updating command"],
                ...args,
              ]);
          }
        }

        if (msg.fromMe && msg.body.startsWith("!")) {
          callCommand(client, msg, incommingInput(), updateInputState);
        }

        // if(getContactIdByName("muna") === msg.from && msg.body.startsWith("!")){
        //   callCommand(client, msg, incommingInput(), updateInputState)
        // }
      });

      client.on("message_revoke_everyone", async (after, before) => {
        if (before) {
          if (
            before.fromMe !== true &&
            before.hasMedia !== true &&
            before.author == undefined &&
            config.enable_delete_alert == "true"
          ) {
            client.sendMessage(
              before.from,
              botMsg("_You deleted this message_ 👇👇\n\n" + before.body)
            );
          }
        }
      });

      client.on("disconnected", (reason) => {
        console.log("Client was logged out", reason);
        try {
          client.destroy();
          client.initialize();
        } catch (error) {
          logger(client, "Client was logged out, could not reconnect");
        }
      });
    } catch (error) {
      console.log("error", error);
    }
  }

  static async register({ userId, token, http }) {
    console.log("sd", userId, token);

    // const botIsRegistered = await (
    //   await database("BotSessions")
    // ).coll.read({ userId });
    // if (botIsRegistered) {
    //   return botIsRegistered;
    // }

    await registerBotSession({ userId, token, http });
  }

  async connect() {
    try {
      console.log("client initializing...", this.client);

      this.client
        .initialize()
        .then((res) => console.log("client initialize!"))
        .catch((err) => console.log("client error", err));

      this.client.on("auth_failure", (err) => {
        console.error(
          "There is a problem in authentication, Kindly set the env var again and restart the app"
        );
        throw new Error(err);
      });
    } catch (error) {
      throw error;
    }
  }

  async disconnect() {
    try {
      this.client
        .destroy()
        .then((res) => console.log("client disconnected!"))
        .catch((err) => console.log("client error", err));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = { BotService };
