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
const { router } = require("../routes");

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

async function createBotSession({ userId, botId }) {
  const client = new Client({
    puppeteer: { headless: true, args: ["--no-sandbox"] },
    authStrategy: new LocalAuth({ clientId: botId }),
  });

  client.commands = new Map();

  fs.readdir("./commands", (err, files) => {
    if (err) return console.error(e);
    files.forEach((commandFile) => {
      if (commandFile.endsWith(".js")) {
        let commandName = commandFile.replace(".js", "");
        const command = require(`./commands/${commandName}`);
        this.client.commands.set(commandName, command);
      }
    });
  });
  console.log("creating bot session for user: ", userId);
  const { conn: botSession } = await database("BotSessions");
  botSession.create({ userId, token, phoneNumberId });
  return client;
}

class BotService {
  constructor() {
    this.client;
    this.client.on("ready", async () => {
      console.log("Bot has been started");
      try {
        await logger(
          this.this.client,
          "Bot has been started!\n\nGet started by sending `!help` to see what commands are available."
        );
      } catch (err) {
        console.log(err);
      }
    });

    this.client.on("message", async (msg) => {
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

    this.client.on("message_create", async (msg) => {
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
          return this.client.commands
            .get("schedule")
            .execute(this.client, msg, [input.inputState, ...args]);
        }
        if (input.inputState === INPUTSTATETYPES["confirming command"]) {
          console.log(INPUTSTATETYPES["confirming command"]);
          // updateInputState("schedule", INPUTSTATETYPES["confirming command"], false);
          return this.client.commands
            .get("schedule")
            .execute(this.client, msg, [
              INPUTSTATETYPES["confirming command"],
              ...args,
            ]);
        }
        if (input.inputState === INPUTSTATETYPES["updating command"]) {
          console.log(INPUTSTATETYPES["updating command"]);
          // updateInputState("schedule", INPUTSTATETYPES["updating command"], false);
          if (input.args[1] === "edit") {
            if (input.args?.[2]) {
              return this.client.commands
                .get("schedule")
                .execute(this.client, msg, [
                  INPUTSTATETYPES["updating command"],
                  "edit",
                  input.args?.[2],
                  ...args,
                ]);
            }
            return this.client.commands
              .get("schedule")
              .execute(this.client, msg, [
                INPUTSTATETYPES["updating command"],
                "edit",
                ...args,
              ]);
          }
          return this.client.commands
            .get("schedule")
            .execute(this.client, msg, [
              INPUTSTATETYPES["updating command"],
              ...args,
            ]);
        }
      }

      if (msg.fromMe && msg.body.startsWith("!")) {
        callCommand(this.client, msg, incommingInput(), updateInputState);
      }

      // if(getContactIdByName("muna") === msg.from && msg.body.startsWith("!")){
      //   callCommand(this.client, msg, incommingInput(), updateInputState)
      // }
    });

    this.client.on("message_revoke_everyone", async (after, before) => {
      if (before) {
        if (
          before.fromMe !== true &&
          before.hasMedia !== true &&
          before.author == undefined &&
          config.enable_delete_alert == "true"
        ) {
          this.client.sendMessage(
            before.from,
            botMsg("_You deleted this message_ 👇👇\n\n" + before.body)
          );
        }
      }
    });

    this.client.on("disconnected", (reason) => {
      console.log("Client was logged out", reason);
      try {
        this.client.destroy();
        this.client.initialize();
      } catch (error) {
        logger(this.client, "Client was logged out, could not reconnect");
      }
    });
  }

  static async register({ userId, token, url }) {
    console.log(userId, token);

    const botIsRegistered = await (
      await database("BotSessions")
    ).coll.read({ userId });
    if (botIsRegistered) {
      return botIsRegistered;
    }

    return await registerBotSession({ userId, token, url });
  }

  async initialize({ userId, botId }) {
    this.client = createBotSession({ userId, botId });
  }

  async connect({ userId, botId }) {
    try {
      console.log("client initializing...");

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
