const config = require("../config");
const { afkHandler } = require("../helpers/afkWrapper");
const {
  incommingInput,
  updateInputState,
} = require("../helpers/commandInputState");
const { INPUTSTATETYPES } = require("../helpers/commandUtils");
const { botMsg } = require("../helpers/messageUtils");
const pmpermit = require("../helpers/pmpermit");
const { callCommand } = require("../helpers/commandWrapper");
const logger = require("../logger");
const fs = require("fs");
const path = require("path");
const { clean } = require("../session/manage");
const { botsDb } = require("../services");
const botmark = "​";

const messagelistener = {
  eventName: "message",
  callback: (_this) => {
    return async (msg) => {
      console.log("receiving msg", msg.from);
      // if (!_this.client.contacts.has(msg.from)) return
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
    };
  },
};

const createMessageListener = {
  eventName: "message_create",
  callback: (_this) => {
    return async (msg) => {
      // auto pmpermit
      // console.log("message create called")
      // if (!_this.client.contacts.has(msg.from)) return

      try {
        if (config.pmpermit_enabled == "true") {
          // console.log("pmpermit_enabled")

          let otherChat = await (await msg.getChat()).getContact();
          let authorIsPermited = await pmpermit.isPermitted(otherChat.number);
          // console.log("checking if author permitted...", authorIsPermited)
          if (
            !msg.fromMe &&
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
          return _this.client.commands
            .get("schedule")
            .execute(_this.client, msg, [input.inputState, ...args]);
        }
        if (input.inputState === INPUTSTATETYPES["confirming command"]) {
          console.log(INPUTSTATETYPES["confirming command"]);
          // updateInputState("schedule", INPUTSTATETYPES["confirming command"], false);
          return _this.client.commands
            .get("schedule")
            .execute(_this.client, msg, [
              INPUTSTATETYPES["confirming command"],
              ...args,
            ]);
        }
        if (input.inputState === INPUTSTATETYPES["updating command"]) {
          console.log(INPUTSTATETYPES["updating command"]);
          // updateInputState("schedule", INPUTSTATETYPES["updating command"], false);
          if (input.args[1] === "edit") {
            if (input.args?.[2]) {
              return _this.client.commands
                .get("schedule")
                .execute(_this.client, msg, [
                  INPUTSTATETYPES["updating command"],
                  "edit",
                  input.args?.[2],
                  ...args,
                ]);
            }
            return _this.client.commands
              .get("schedule")
              .execute(_this.client, msg, [
                INPUTSTATETYPES["updating command"],
                "edit",
                ...args,
              ]);
          }
          return _this.client.commands
            .get("schedule")
            .execute(_this.client, msg, [
              INPUTSTATETYPES["updating command"],
              ...args,
            ]);
        }
      }

      if (msg.fromMe && msg.body.startsWith("!")) {
        console.log("comm", msg.body);
        callCommand(_this.client, msg, incommingInput(), updateInputState);
      }

      // if(getContactIdByName("muna") === msg.from && msg.body.startsWith("!")){
      //   callCommand(_this.client,  msg, incommingInput(), updateInputState)
      // }
    };
  },
};

const revokeAllListener = {
  eventName: "message_revoke_everyone",
  callback: (_this) => {
    return async (after, before) => {
      if (before) {
        if (
          before.fromMe !== true &&
          before.hasMedia !== true &&
          before.author == undefined &&
          config.enable_delete_alert == "true"
        ) {
          _this.client.sendMessage(
            before.from,
            botMsg("_You deleted this message_ 👇👇\n\n" + before.body)
          );
        }
      }
    };
  },
};

const disconnectListener = {
  eventName: "disconnected",
  callback: (_this) => {
    return async (reason) => {
      const { coll, conn } = await botsDb;
      console.log("Client was logged out", reason);
      console.log("retrying to login...");
      _this.ws.send(
        JSON.stringify({
          status: "error",
          message: "Client was logged out, reconnecting...",
        })
      );
      try {
        let reconnectSuccess = false;
        setInterval(async () => {
          await _this.client.destroy();
          _this.client.initialize();
          reconnectSuccess = true;
        }, 500);

        if (!reconnectSuccess)
          throw new Error("Client was logged out, could not reconnect");
      } catch (error) {
        console.log("still error", error);
        // clean state for current id

        await coll.delete({ botId: _this.botId });
        if (
          fs.existsSync(
            path.join(__dirname, "../.wwebjs_auth/session-" + _this.botId)
          )
        ) {
          fs.rmSync(
            path.join(__dirname, "../.wwebjs_auth/session-" + _this.botId),
            { recursive: true }
          );
        }
        if (
          fs.existsSync(
            path.join(
              __dirname,
              "../" + _this.botId.split("_")[2] + "_session.secure"
            )
          )
        ) {
          fs.rmSync(
            path.join(
              __dirname,
              "../" + _this.botId.split("_")[2] + "_session.secure"
            )
          );
        }
        // logger(_this.client, error);
      }
    };
  },
};

const listenersArray = [
  messagelistener,
  createMessageListener,
  revokeAllListener,
  disconnectListener,
];

module.exports = {
  listenersArray,
};
