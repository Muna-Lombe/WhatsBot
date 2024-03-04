const cron = require("node-cron");
const { buildExpressionFor } = require("../helpers/scheduleWrapper");
const { getContactIdByName } = require("../helpers/findContact");
const { Client } = require("whatsapp-web.js");

/**
 *
 * @param {Client} client
 * @param {String} contactName
 * @param {String} message
 */
const sendMessage = async (client, contactName, message) => {
  console.log("Sending message ...");
  const contactId = getContactIdByName(contactName);
  const contact = await client.getContactById(contactId);
  const chat = await contact.getChat();

  chat.sendMessage(message);
};

const sendReminder = async (client, contactName, message) => {
  console.log("Sending reminder...");
  await client.reply(message);
};

const scheduleNewTask = (client, msg, task) => {
  // Example: Schedule a message to be sent every minute
  // send a message every 2 minutes
  // send a reminder to [contact-name] every day at 9am
  // reminder: [message]
  // 'every 2 minutes'

  const [crontask, message] = task;
  // const [cronAction, n0, cronType, n1, cronTarget, ...rest] = crontask

  const { cronType, cronTarget, rest } = crontask.reduce((acc, curr, x) => {
    // console.log('acc:', acc, 'curr:', curr)

    if (["reminder", "message"].includes(curr)) {
      acc["cronType"] = curr;

      return acc;
    }
    if (["to"].includes(curr)) {
      acc["cronTarget"] = crontask[x + 1];

      return acc;
    }

    if (!acc["rest"]) {
      acc["rest"] = [curr];

      return acc;
    }

    acc["rest"] = [...acc["rest"], curr];

    return acc;
  }, {});

  // console.log('cronType:', cronType, 'cronTarget:', cronTarget, 'rest:', rest)
  const cronExpression = buildExpressionFor(rest);
  const cronTypeMap = {
    reminder: "set",
    message: "send",
    reply: "send",
    like: "send",
  };
  const cronActionMap = {
    send: sendMessage,
    set: sendReminder,
    add: sendMessage,
  };
  console.log("Cron task:", cronType, cronTarget, cronExpression, message);
  cron.schedule(cronExpression, async () => {
    const lastCronType = cronType;
    console.log("Sending scheduled message...");
    if (lastCronType === "reminder") {
      await sendReminder(msg, "_", message);
    } else if (lastCronType === "mesag") {
      await sendMessage(client, cronTarget, message);
    } else {
      await cronActionMap[cronTypeMap[lastCronType]](
        client,
        cronTarget,
        message
      );
    }
  });
};

const execute = async (client, msg, args) => {
  if (!msg.fromMe) {
    return msg.reply(
      "*❌ Restricted*\n\nYou are not allowed for perform this action!\n\n _Powered by WhatsBot_"
    );
  }

  if (args.length > 1) {
    if (args.includes("reminder") || args.includes("message")) {
      const task = args.join(" "); //msg.body.slice(10).trim()
      if (!task) {
        return msg.reply("Please provide a task to schedule.");
      }
      // console.log("task", task);
      try {
        const newTask = [
          task.split("\n")[0].split(" "),
          task.split("\n")[1].split(":")[1],
        ];

        console.log("New task:", newTask);
        return scheduleNewTask(client, msg, newTask);
      } catch (error) {
        console.error("Error in task format:", error);
      }
    }

    return msg.reply(
      "Please provide a valid task to schedule. \nUse `!help schedule` for more info."
    );
  }

  return msg.reply("Please provide a task to schedule.");
};

module.exports = {
  name: "Task scheduler",
  description:
    "Schedules a task to be executed at a later time. *Currently supports sending messages only!*",
  command: "!schedule",
  commandType: "admin",
  isDependent: false,
  execute,
  help: '`*Task  scheduler*\n\nSchedule a task to execute at a later time. \n⚠Currently supports sending messages only⚠.`\n\n*!schedule [task]*\n\nExample: *!schedule a reminder for 9:00am\nReminder: You have a call today!*\n-- This will send a reminder to the chat at 9:00am every day with the message "You have a call today!"\n\n*!schedule a message to [contact-name] for 9:00am\nMessage: You have a call today!*\n-- This will send a message to the contact at 9:00am every day with the message "You have a call today!"\n\n *!schedule a reminder for 9:00am\nReply: Good morning!*\n-- This will send a reply to the chat at 9:00am every day with the message "Good morning!"\n\n *Powered By WhatsBot*',
};
