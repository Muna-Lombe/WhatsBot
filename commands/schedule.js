const cron = require("node-cron");
const { buildExpressionFor } = require("../helpers/scheduleWrapper");
const { getContactIdByName } = require("../helpers/findContact");
const { Client } = require("whatsapp-web.js");
const {
  updateInputState,
  incommingInput,
  inputStore,
} = require("../helpers/commandInputState");
const {
  isTime,
  isDayDate,
  isTimeFormat,
  validateCron,
  validCronWords,
  isCronWord,
  isCron,
  isDay,
  isDate,
  format,
} = require("../helpers/cronUtils");
const { botMsg } = require("../helpers/messageUtils");
const { INPUTSTATETYPES } = require("../helpers/commandUtils");

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

  chat.sendMessage(botMsg(message));
};

const exampleFormat = {
  time: "12am,12pm, 12:00",
  day: "Monday, tuesday, Wed, thur",
  date: "12/12/12, 12-12-12, 12.12.12, 12 december 2012",
  action: "reminder, message",
};
const prepareForCronTask = (task) => {
  // console.log("reast", task)
  const { message, reminder, day, date, ...rest } = task;
  rest.action = ["a", rest.action];
  rest.target = ["to", rest.target];
  rest.time = ["at", rest.time];
  // rest.day = ["on", rest.day];
  rest[day ? "day" : "date"] = ["on ", day || date];
  const action = message ? message : reminder;
  1;
  const builtTask = [[...Object.values(rest).flat()], action];
  // console.log("bt", builtTask)
  return builtTask;
};
const sendReminder = async (client, contactName, message) => {
  console.log("Sending reminder...");
  await client.reply(botMsg(message));
};
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

const createCronJob = (msg, task) => {
  // console.log("task", task);
  const [crontask, message] = task;
  // const [cronAction, n0, cronType, n1, cronTarget, ...rest] = crontask
  // try {
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
      acc["rest"] = [];

      // return acc;
    }
    if (parseInt(curr)) {
      acc["rest"] = [...acc["rest"], curr];
      return acc;
    }
    if (curr === "a" || (!isCronWord(curr) && !isTimeFormat(curr))) {
      return acc;
    }

    acc["rest"] = [...acc["rest"], curr];

    return acc;
  }, {});

  const cronTimes = rest.filter((r) => isTimeFormat(r)).join(",");
  const cronDayDate = rest.filter((r) => isDayDate(r)).join("");

  console.log("cronType:", cronType, "cronTarget:", cronTarget, "rest:", rest);

  if (!validateCron(rest)) {
    throw new Error("Invalid cron task");
  }

  const cronExpression = buildExpressionFor(rest);
  console.log("task:", crontask, cronExpression, message);
  console.log("Cron task:", cronType, cronTarget, cronExpression, message);

  const dayDate = {
    [isDate(cronDayDate) ? "date" : "day"]: isDate(cronDayDate)
      ? cronDayDate
      : format.day(cronDayDate),
  };
  updateInputState(
    "schedule",
    {
      inputState: INPUTSTATETYPES["confirming command"],
      isIncomming: true,
      args: [
        "a " + cronType,
        "to " + cronTarget,
        "at " + cronTimes,
        "on " + cronDayDate,
        cronType + ": " + message,
      ],
    },
    {
      action: cronType,
      target: cronTarget,
      time: cronTimes,
      ...dayDate,
      [cronType]: message,
    }
  );

  msg.reply(
    botMsg(`*Please confirm the following task*:\n
        _Time_: ${cronTimes}
        _Day/date_: ${cronDayDate}
        _Action_: ${
          cronTypeMap[cronType] +
          " " +
          cronType +
          "  " +
          (cronTarget ? "to " + cronTarget : "for Me")
        }
        _${cronType}_: '${message}.'\n\n
        To confirm, respond with *yes*. To correct, respond with *edit*. To reject, respond with *no*.
        `)
  );
  return { cronType, cronTarget, cronExpression, message };
  // } catch (error){
  //   // console.error("Error creating cron job:", error)
  //   throw new Error("Error creating cron job");
  // }
};
const editCronJob = (args) => {
  console.log("Editing cron job...");
  // const [crontask, message] = task;

  // args.forEach(arg => {
  //   if(arg.includes("time")){
  //     const time = arg.split(":")[1];
  //     const cronExpression = buildExpressionFor(time);
  //   }
  //   if(arg.includes("day")){
  //     const day = arg.split(":")[1];
  //     const cronDayDate = day;
  //   }
  //   if(arg.includes("action")){
  //     const action = arg.split(":")[1];
  //     const cronType = action;
  //   }
  //   if(arg.includes("target")){
  //     const target = arg.split(":")[1];
  //     const cronTarget = target;
  //   }
  //   if(arg.includes("message")){
  //     const message = arg.split(":")[1];
  //   }
  // })

  // updateInputState('schedule', {
  //   inputState: INPUTSTATETYPES['editing task'],
  //   isIncomming: true,
  //   args:[
  //     {changedProperty:}
  //   ]
  // })
};

const scheduleNewTask = (client, msg, task) => {
  // Example: Schedule a message to be sent every minute
  // send a message every 2 minutes
  // send a reminder to [contact-name] every day at 9am
  // reminder: [message]
  // 'every 2 minutes'
  // const partsMap ={

  // }
  // try {
  const { cronType, cronTarget, cronExpression, message } = createCronJob(
    msg,
    task
  );

  const scheduleConfirmed = false;
  if (scheduleConfirmed) {
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
  }
  // } catch (error) {
  //   throw error
  // }
};

const execute = async (client, msg, args) => {
  if (!msg.fromMe) {
    return msg.reply(
      botMsg(
        "*❌ Restricted*\n\nYou are not allowed for perform this action!\n\n _Powered by WhatsBot_"
      )
    );
  }
  try {
    if (args[0] === INPUTSTATETYPES["reading command"]) {
      updateInputState("schedule", {
        inputState: INPUTSTATETYPES["reading command"],
        isIncomming: true,
        args,
      });

      return msg.reply(botMsg("okay..., what's next?"));
    }

    if (args[0] === INPUTSTATETYPES["confirming command"]) {
      // updateInputState('schedule', {inputState:INPUTSTATETYPES['confirming command'], isIncomming:true, args})
      if (args[1] === "yes") {
        return msg.reply(botMsg("okay..., task scheduled!"));
      }
      if (args[1] === "no") {
        return msg.reply(botMsg("okay..., task rejected!"));
      }
      if (args[1] === "edit") {
        const store = inputStore("schedule");

        updateInputState("schedule", {
          inputState: INPUTSTATETYPES["updating command"],
          isIncomming: true,
          args,
        });
        return msg.reply(
          botMsg(
            `okay..., what would you like to change?\n\n📝 *Action*\n👤 *Target*\n⌚ *Time*\n📅 *Day/date*\n📧 *${
              store.hasOwnProperty("message") ? "message" : "reminder"
            }*\n\nUse *Back* to return to main task.`
          )
        );
      }

      return msg.reply(
        botMsg(
          "Please choose an option to confirm, edit or reject the task.\n\nTo confirm, respond with *yes*. To correct, respond with *edit*. To reject, respond with *no*."
        )
      );
    }

    if (args[0] === INPUTSTATETYPES["updating command"]) {
      updateInputState("schedule", {
        inputState: INPUTSTATETYPES["updating command"],
        isIncomming: true,
        args,
      });
      if (args.includes("back")) {
        updateInputState("schedule", {
          inputState: INPUTSTATETYPES["updating command"],
          isIncomming: true,
          args: args.slice(args.indexOf("back")),
        });
        // return msg.reply(botMsg("okay..., what aspect would you like to change?\n\n📝 *Action*\n👤 *Target*\n⌚ *Time*\n📅 *Day/date*\n📧 *Message*"))
        const task = prepareForCronTask(inputStore("schedule"));
        return scheduleNewTask(client, msg, task);
      }
      if (args?.[1] === "edit" && args?.[2] && args?.[3]) {
        console.log("updating ", args);
        try {
          if (
            !["reminder", "message"].includes(args[2]) &&
            !["reminder", "message"].includes(args[3]) &&
            !isCron(args[3])
          ) {
            throw new Error("Invalid cron task");
          }
          if (args[2] === "action") {
            const store = inputStore("schedule");
            let newStore;
            if (args[3] === "message") {
              const { reminder, ...rest } = store;
              const other = rest;
              newStore = {
                ...other,
                [args[2]]: args[3],
                [args[3]]: reminder,
                complete: true,
              };
            }
            if (args[3] === "reminder") {
              const { message, ...rest } = store;

              const other = rest;
              newStore = {
                ...other,
                [args[2]]: args[3],
                [args[3]]: message,
                complete: true,
              };
              console.log("store", newStore);
            }

            updateInputState(
              "schedule",
              {
                inputState: INPUTSTATETYPES["updating command"],
                isIncomming: true,
                args,
              },
              newStore
            );
          } else if (["day", "date", "day/date"].includes(args[2])) {
            const store = inputStore("schedule");
            let newStore;
            if (isDay(args[3])) {
              const { date: text, ...rest } = store;
              newStore = {
                ...rest,
                [args[2]]: format.day(args[3]),
                complete: true,
              };
            }
            if (isDate(args[3])) {
              const { day: text, ...rest } = store;
              newStore = { ...rest, [args[2]]: args[3], complete: true };
            }
            updateInputState(
              "schedule",
              {
                inputState: INPUTSTATETYPES["updating command"],
                isIncomming: true,
                args,
              },
              newStore
            );
          } else {
            updateInputState(
              "schedule",
              {
                inputState: INPUTSTATETYPES["updating command"],
                isIncomming: true,
                args,
              },
              { [args[2]]: args.slice(3).join(" ") }
            );
          }

          const task = prepareForCronTask(inputStore("schedule"));

          return scheduleNewTask(client, msg, task);
        } catch (error) {
          console.log("some err", error);
          const task = inputStore("schedule");
          return msg.reply(
            botMsg(
              `⚠ '${args[3]}' is not a valid \`${
                args[2]
              }\` format\n _example - ${exampleFormat[args[2]]}_ \n\n-*${
                args[2][0].toUpperCase() + args[2].slice(1)
              }*:\n _previous ${args[2]}_: ${
                task?.[args[2]] || "19:00"
              }\n\nPlease provide the new ${
                args[2]
              } to update or use *Back* to return to main task.`
            )
          );
        }
      }

      if (
        [
          "action",
          "target",
          "time",
          "day",
          "date",
          "day/date",
          "message",
          "reminder",
        ].includes(args[2].toLowerCase())
      ) {
        const aspect = ["day", "date", "day/date"].includes(args[2])
          ? "day"
          : args[2].toLowerCase();
        const store = inputStore("schedule");
        const title = args[2][0].toUpperCase() + args[2].slice(1);

        return msg.reply(
          botMsg(
            `-*${title}*:\n _previous ${args[2]}_: ${
              store?.[aspect] || "19:00"
            }\n\nPlease provide the new ${
              args[2]
            } to update or use *Back* to return to main task.`
          )
        );
      }

      return msg.reply(
        botMsg(
          "Please choose what aspect you would like to change?\n\n📝 *Action*\n👤 *Target*\n⌚ *Time*\n📅 *Day/date*\n📧 *Message*"
        )
      );
    }

    if (args.length > 1) {
      if (args.includes("reminder") || args.includes("message")) {
        const task = args.join(" "); //msg.body.slice(10).trim()
        if (!task) {
          return msg.reply(
            botMsg(
              "Please provide a valid task to schedule. \nUse `!help schedule` for more info."
            )
          );

          // return msg.reply(botMsg("Please provide a task to schedule."));
        }
        // console.log("task", task);

        const newTask = [
          task.split("\n")[0].split(" "),
          task.split("\n")[1].split(":")[1],
        ];

        // console.log("New task:", newTask);
        return scheduleNewTask(client, msg, newTask);
      }
    }
  } catch (error) {
    console.error("Error in task format:", error);
    return msg.reply(
      botMsg(
        "Please provide a valid task to schedule. \nUse `!help schedule` for more info."
      )
    );
  }

  updateInputState("schedule", {
    inputState: INPUTSTATETYPES["reading command"],
    isIncomming: true,
    args,
  });
  return msg.reply(botMsg("Sure, what task would you like to schedule?"));
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
