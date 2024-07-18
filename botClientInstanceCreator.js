//jshint esversion:11
const express = require("express");
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
const pmpermit = require("./helpers/pmpermit");
/**
 * Configuration object for the application.
 * @type {object}
 */
const config = require("./config");
const fs = require("fs");
/**
 * Logger module for logging messages.
 * @type {object}
 */
const logger = require("./logger");
const { afkHandler } = require("./helpers/afkWrapper");
const {
  incommingInput,
  updateInputState,
} = require("./helpers/commandInputState");
const { getContactIdByName } = require("./helpers/findContact");
const { callCommand } = require("./helpers/commandWrapper");
const { botMsg } = require("./helpers/messageUtils");
const { INPUTSTATETYPES } = require("./helpers/commandUtils");
const { timeStamp } = require("console");
const { botsDb } = require("./services");
const botmark = "​";

const buildClient = (_this, client) => {
  _this.client =
    client ||
    new Client({
      // webVersionCache:{
      //   remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1013620109-alpha.html',
      //   type: 'remote'
      // },
      puppeteer: {
        headless: true,
        args: ["--no-sandbox"],
      },
      authStrategy: new LocalAuth({ clientId: _this.botId }),
    });
  _this.client.commands = new Map();
  _this.client.removeListener("qr", _this.client._qrListener || (() => {}));
  _this.client.removeListener(
    "authenticated",
    _this.client._authenticatedListener || (() => {})
  );
  _this.client.removeListener(
    "auth_failure",
    _this.client._authFailureListener || (() => {})
  );
  _this.client.removeListener(
    "ready",
    _this.client._readyListener || (() => {})
  );

  const commandsList = fs.readdirSync("./commands", { withFileTypes: false });
  // commandsList?.forEach((files) => {
  // if (err) return console.error(e)
  console.log("loading commands...");
  commandsList.forEach((commandFile) => {
    if (commandFile.endsWith(".js")) {
      let commandName = commandFile.replace(".js", "");
      const command = require(`./commands/${commandName}`);
      // console.log("command", command)
      _this.client.commands.set(commandName, command);
    }
    // })
  });

  console.log("commands loaded : ", _this.client.commands.size > 1);
  _this.ensureCommandsLoaded = async () => {
    if (_this.client.commands.size > 0) return;
    // const _this = _this;
    const commandsList = fs.readdirSync("./commands", {
      withFileTypes: false,
    });
    // commandsList?.forEach((files) => {
    // if (err) return console.error(e)
    console.log("reloading loading commands", commandsList);
    commandsList.forEach((commandFile) => {
      if (commandFile.endsWith(".js")) {
        let commandName = commandFile.replace(".js", "");
        const command = require(`./commands/${commandName}`);
        // console.log("command", command)
        _this.client.commands.set(commandName, command);
      }
      // })
    });
    console.log("commands loaded: ", _this.client.commands.size);
  };
  if (_this.listeners) {
    console.log("adding listeners");

    _this.addListeners(_this.listeners);
  }
  console.log("botclient initializing...");

  return _this;
};
class BotClientInstance {
  constructor({ botId, ws, client, listeners = [] }) {
    this.botId = botId;
    this.ws = ws;
    this.listeners = listeners;
    this.client = buildClient(this, client).client;
    //   client ||
    //   new Client({
    //     puppeteer: {
    //       headless: true,
    //       args: ["--no-sandbox"],
    //     },
    //     authStrategy: new LocalAuth({ clientId: this.botId }),
    //   });

    // this.client.commands = new Map();
    // this.client.removeListener("qr", this.client._qrListener || (() => {}));
    // this.client.removeListener(
    //   "authenticated",
    //   this.client._authenticatedListener || (() => {})
    // );
    // this.client.removeListener(
    //   "auth_failure",
    //   this.client._authFailureListener || (() => {})
    // );
    // this.client.removeListener(
    //   "ready",
    //   this.client._readyListener || (() => {})
    // );

    // const commandsList = fs.readdirSync("./commands", { withFileTypes: false });
    // // commandsList?.forEach((files) => {
    // // if (err) return console.error(e)
    // console.log("loading commands...");
    // commandsList.forEach((commandFile) => {
    //   if (commandFile.endsWith(".js")) {
    //     let commandName = commandFile.replace(".js", "");
    //     const command = require(`./commands/${commandName}`);
    //     // console.log("command", command)
    //     this.client.commands.set(commandName, command);
    //   }
    //   // })
    // });

    // console.log("commands loaded : ", this.client.commands.size > 1);
    // this.ensureCommandsLoaded = async () => {
    //   if (this.client.commands.size > 0) return;
    //   const _this = this;
    //   const commandsList = fs.readdirSync("./commands", {
    //     withFileTypes: false,
    //   });
    //   // commandsList?.forEach((files) => {
    //   // if (err) return console.error(e)
    //   console.log("reloading loading commands", commandsList);
    //   commandsList.forEach((commandFile) => {
    //     if (commandFile.endsWith(".js")) {
    //       let commandName = commandFile.replace(".js", "");
    //       const command = require(`./commands/${commandName}`);
    //       // console.log("command", command)
    //       _this.client.commands.set(commandName, command);
    //     }
    //     // })
    //   });
    //   console.log("commands loaded: ", _this.client.commands.size);
    // };
    // if (this.listeners) {
    //   console.log("adding listeners");

    //   this.addListeners(this.listeners);
    // }
    // console.log("botclient initializing...");
  }
  async start() {
    try {
      // await this.ensureCommandsLoaded();
      const delayedThrow = (n) => {
        const timeout = setTimeout(() => {
          // throw new Error(`BotInitialization Timeout (${n}): botclient not initialized!`);
        }, 10000);
        return timeout;
      };

      let timedOutThrow = delayedThrow(1);

      this.client
        .initialize()
        .then((res) => {
          console.log("client initialized!");
          console.log("resetting timeout 1...");
          clearTimeout(timedOutThrow);
          timedOutThrow = delayedThrow(2);
        })
        .catch((err) => {
          console.log("client error", err);
          // this.client.logout();
          setTimeout(() => {
            // this.client.login(this.config.token);
            console.log("attempting initialize again...");
            // this.client.resetState()
            this.client.destroy();
            this.client = buildClient(this).client;
            this.client.initialize();
          }, 500);
        });

      this.client.on("auth_failure", () => {
        console.error(
          "There is a problem in authentication, Kindly set the env var again and restart the app"
        );
        this.ws.send(
          JSON.stringify({
            event: "connect",
            status: "error",
            message: "bot failed to authenticate",
          })
        );
      });

      this.client.on("authenticated", async (session) => {
        console.log("session authenticated:", session);
        console.log("resetting timeout 2...");
        clearTimeout(timedOutThrow);
        timedOutThrow = delayedThrow(3);

        this.ws.send(
          JSON.stringify({
            event: "connect",
            status: "pending",
            data: {
              botId: this.botId,
            },
          })
        );
      });

      this.client.on("ready", async () => {
        console.log("resetting timeout 3...");
        clearTimeout(timedOutThrow);

        const { conn, coll } = await botsDb;
        console.log("Bot has been started");
        coll.update(
          { botId: this.botId },
          { status: "running", timeStamp: new Date() }
        );
        const contactsMap = new Map();
        (await this.client.getContacts()).forEach((c) => {
          contactsMap.set(c.pushname, c);
          // console.log("id._serialized", c.pushname, c.id._serialized);
          // if(["8613758279354", "79656229755", "79687698040"].includes(c.id.user)){
          //   contactsMap.set(c.pushname, c)
          // }
        });
        this.client.contacts = contactsMap;

        console.log("contacts", this.client.contacts.size);
        await logger(
          this.client,
          "Bot has been started!\n\nGet started by sending `!help` to see what commands are available."
        );
        this.ws.send(
          JSON.stringify({
            event: "connect",
            status: "bot started",
            data: {
              botId: this.botId,
            },
          })
        );
      });
    } catch (err) {
      console.log(err);
      // clearInterval(healthCheck);
      botsDb.then(({ conn, coll }) =>
        coll.update(
          { botId: this.botId },
          { status: "stopped", timeStamp: new Date() }
        )
      );

      this.ws.send(
        JSON.stringify({
          event: "connect",
          status: "error",
          message: err.message,
        })
      );
    }
  }
  async checkHealth() {
    try {
      this.healthCheck = setInterval(async () => {
        await coll.update(
          { botId: this.botId },
          { status: "running", timeStamp: new Date() }
        );

        await this.ws.ping(
          JSON.stringify({
            event: "health-check",
            status: "ok",
            botId: this.botId,
          })
        );
      }, 1000 * 60 * 5);
    } catch (err) {
      console.log(err);
      clearInterval(this.healthCheck);
      botsDb.then(({ conn, coll }) =>
        coll.update(
          { botId: this.botId },
          { status: "stopped", timeStamp: new Date() }
        )
      );

      this.ws.send(
        JSON.stringify({
          event: "connect",
          status: "error",
        })
      );
    }
  }
  async connection() {
    try {
      const state = await this.client.sendMessage("you", "healthCheck...");
      //"MIGHTBECONNECTED"//await this.client.getState();
      const info = this.client.info;

      return {
        state,
        info,
      };
    } catch (error) {
      console.log(error);
      return {
        error: error.message.includes(
          "Cannot read properties of null (reading 'evaluate')"
        )
          ? "Bot not started..."
          : "No Connection",
      };
    }
  }
  async stop() {
    await coll.update(
      { botId: this.botId },
      { status: "stopped", timeStamp: new Date() }
    );

    this.client.destroy();
  }
  addListeners(customListeners) {
    // this.client.on("message", async (msg) => {
    //   if (!this.client.contacts.has(msg.from)) return

    //   if (!msg.author && config.pmpermit_enabled === "true") {
    //     var checkIfAllowed = await pmpermit.handler(msg.from.split("@")[0]); // get status

    //     if (!checkIfAllowed.permit) {
    //       // if not permitted
    //       if (checkIfAllowed.block) {
    //         await msg.reply(botMsg(checkIfAllowed.msg));
    //         setTimeout(async () => {
    //           await (await msg.getContact()).block();
    //         }, 500);
    //       } else if (!checkIfAllowed.block) {
    //         msg.reply(botMsg(checkIfAllowed.msg));
    //       }
    //     } else {
    //       await checkAndApplyAfkMode();
    //     }
    //   }

    //   if (!msg.author && config.pmpermit_enabled !== "true") {
    //     await checkAndApplyAfkMode();
    //   }

    //   async function checkAndApplyAfkMode() {
    //     const contact = await msg.getContact();
    //     const afkData = await afkHandler(contact?.name || contact?.pushname);
    //     if (afkData?.notify) {
    //       //if user is afk
    //       const { reason, timediff } = afkData;
    //       let lastseen = "";
    //       lastseen += timediff[0] ? `${timediff[0]} days ` : "";
    //       lastseen += timediff[1] ? `${timediff[1]} hrs ` : "";
    //       lastseen += timediff[2] ? `${timediff[2]} min ` : "";
    //       lastseen += `${timediff[3]} sec ago`;
    //       await msg.reply(
    //         `${botmark}${afkData.msg}\n\n😊😊😊\n\nI am currently offline...\n\n*Reason*: ${reason}\n*Last Seen*:${lastseen}`
    //       );
    //     }
    //   }
    // });

    // this.client.on("message_create", async (msg) => {
    //   // auto pmpermit
    //   // console.log("message create called")
    //   if (!this.client.contacts.has(msg.from)) return

    //   try {
    //     if (config.pmpermit_enabled == "true") {
    //       // console.log("pmpermit_enabled")

    //       let otherChat = await (await msg.getChat()).getContact();
    //       let authorIsPermited = await pmpermit.isPermitted(otherChat.number);
    //       // console.log("checking if author permitted...", authorIsPermited)
    //       if (
    //         msg.fromMe &&
    //         msg.type !== "notification_template" &&
    //         otherChat.isUser &&
    //         !authorIsPermited &&
    //         !otherChat.isMe &&
    //         !msg.body.startsWith("!") &&
    //         !msg.body.endsWith("_Powered by WhatsBot_")
    //       ) {
    //         console.log("is not permitted");
    //         await pmpermit.permit(otherChat.number);
    //         await msg.reply(
    //           `${botmark}You are automatically permitted for message !\n\n_Powered by WhatsBot_`
    //         );
    //       }
    //     }
    //   } catch (err) {
    //     console.log("something not right in authorPermit:\n", err);
    //   }

    //   if (
    //     msg.fromMe &&
    //     !msg.body.startsWith("!") &&
    //     !msg.body.startsWith(botmark)
    //   ) {
    //     console.log("is message incoming: ", incommingInput().isIncomming);

    //     const args = msg.body.split(" ").map((arg) => arg.toLowerCase());

    //     const input = incommingInput();

    //     if (
    //       input.inputState === INPUTSTATETYPES["reading command"] ||
    //       input.inputState === INPUTSTATETYPES["waiting for command"]
    //     ) {
    //       console.log(input.inputState);
    //       // updateInputState("schedule", INPUTSTATETYPES["reading command"], false);
    //       return this.client.commands
    //         .get("schedule")
    //         .execute(this.client,msg, [input.inputState, ...args]);
    //     }
    //     if (input.inputState === INPUTSTATETYPES["confirming command"]) {
    //       console.log(INPUTSTATETYPES["confirming command"]);
    //       // updateInputState("schedule", INPUTSTATETYPES["confirming command"], false);
    //       return this.client.commands
    //         .get("schedule")
    //         .execute(this.client,msg, [INPUTSTATETYPES["confirming command"], ...args]);
    //     }
    //     if (input.inputState === INPUTSTATETYPES["updating command"]) {
    //       console.log(INPUTSTATETYPES["updating command"]);
    //       // updateInputState("schedule", INPUTSTATETYPES["updating command"], false);
    //       if (input.args[1] === "edit") {
    //         if (input.args?.[2]) {
    //           return this.client.commands
    //             .get("schedule")
    //             .execute(this.client,msg, [
    //               INPUTSTATETYPES["updating command"],
    //               "edit",
    //               input.args?.[2],
    //               ...args,
    //             ]);
    //         }
    //         return this.client.commands
    //           .get("schedule")
    //           .execute(this.client,msg, [
    //             INPUTSTATETYPES["updating command"],
    //             "edit",
    //             ...args,
    //           ]);
    //       }
    //       return this.client.commands
    //         .get("schedule")
    //         .execute(this.client,msg, [INPUTSTATETYPES["updating command"], ...args]);
    //     }
    //   }

    //   if (msg.fromMe && msg.body.startsWith("!")) {

    //     callCommand(this.client,msg, incommingInput(), updateInputState);
    //   }

    //   if(getContactIdByName("muna") === msg.from && msg.body.startsWith("!")){
    //     callCommand( msg, incommingInput(), updateInputState)
    //   }
    // });

    // this.client.on("message_revoke_everyone", async (after, before) => {
    //   if (!this.client.contacts.has(msg.from)) return

    //   if (before) {
    //     if (
    //       before.fromMe !== true &&
    //       before.hasMedia !== true &&
    //       before.author == undefined &&
    //       config.enable_delete_alert == "true"
    //     ) {
    //       this.client.sendMessage(
    //         before.from,
    //         botMsg("_You deleted this message_ 👇👇\n\n" + before.body)
    //       );
    //     }
    //   }
    // });

    // this.client.on("disconnected", async (reason) => {
    //   if (!this.client.contacts.has(msg.from)) return

    //   console.log("Client was logged out", reason);
    //   try {
    //     await this.client.destroy();
    //     this.client.initialize();
    //   } catch (error) {
    //     logger("Client was logged out, could not reconnect");
    //   }
    // });

    // custom listeners
    if (customListeners.length > 0) {
      customListeners.forEach((ls) => {
        let [event, listener] = [ls.eventName, ls.callback(this)];
        // console.log("listener", event, ls.callback(this))
        this.client.addListener(event, listener);
      });
    }
    console.log(
      "current listeners count: ",
      [
        this.client.listeners("message"),
        this.client.listeners("message_create"),
        this.client.listeners("message_revoke_everyone"),
        this.client.listeners("disconnected"),
      ].length
    );
  }
  listernersArray() {
    return this.listeners;
  }
}

module.exports = {
  BotClientInstance,
};
