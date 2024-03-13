const cron = require("node-cron");
const tasker = require("../helpers/cronTasker.js");
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
  isPeriod,
  isTimePeriod,
  isDays,
} = require("../helpers/cronUtils");
const { botMsg } = require("../helpers/messageUtils");
const { INPUTSTATETYPES } = require("../helpers/commandUtils");
const { boldText, italicsText } = require("../helpers/textUtil");

/**
 *
 * @param {Client} client
 * @param {String} contactName
 * @param {String} message
 */
const sendMessage = async (client, contactId, message) => {
  console.log("Sending message ...");

  const contact = await client.getContactById(contactId);
  const chat = await contact.getChat();

  chat.sendMessage(botMsg(message));
};

const exampleFormat = {
  time: "12am,12pm, 12:00",
  day: "Monday, tuesday, Wed, thur",
  date: "12/12/12, 12-12-12, 12.12.12, 12 december 2012",
  action: "reminder, message",
  target: "Muna, Tom",
};
const scheduleParts = [
  ["action", "target", "time", "day/date", "message/reminder"],
  [
    "action",
    "target",
    "time",
    "day",
    "days",
    "date",
    "period",
    "message",
    "reminder",
  ],
];
const types = {
  action: "a",
  target: "to",
  time: "at",
  "day/date": "on",
  "message/reminder": ":",
};

const cronify = (type, str) => {
  const isp =
    str.includes("from") ||
    str.includes("in") ||
    (str.includes("-") && str.split("-").length === 2);

  return isp ? str : types[type] + " " + str;
};
const prepareForCronTask = (task) => {
  // console.log("reast", task)
  const { message, reminder, day, date, period, days, ...rest } = task;
  rest.action = ["a", rest.action];
  rest.target = ["to", rest.target];
  rest.time = ["at", rest.time];
  // rest.day = ["on", rest.day];
  rest[
    day ? "day" : date ? "date" : period ? "period" : days ? "days" : "day"
  ] = [period ? "" : "on", ...(day || days || date || period).split(" ")];
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

const msgType = {
  notify:
    "Please provide a valid task to schedule. \nUse `!help schedule` for more info.",
  confirm: ({ action, time, message, dayDatePeriod, custom }) => {
    const defaultMessage = `${italicsText(time?.key)}: ${time?.value}
      ${italicsText(dayDatePeriod?.key)}: ${dayDatePeriod?.value}
      ${italicsText(action?.key)}: ${action?.value}
      ${italicsText(message?.key)}: '${message?.value}.'
      `;

    return `${boldText("Please confirm the following task")}:
      ${
        custom
          ? `${italicsText(custom.action)}: ${custom.target}`
          : defaultMessage
      }
      \n\nTo confirm, respond with *yes*. To correct, respond with *edit*. To reject, respond with *no*.`;
  },
  update: ({ dayDatePeriod, message }) => {
    return `okay..., what would you like to change?\n\n
    📝 *Action*\n
    👤 *Target*\n
    ⌚ *Time*\n
    📅 *${dayDatePeriod}*\n
    📧 *${message}*\n\n
    Use *Back* to return to main task.`;
  },
  choose: {
    option: `Please choose an option to confirm, edit or reject the task.\n\nTo confirm, respond with *yes*. To correct, respond with *edit*. To reject, respond with *no*.`,
    aspect: (aspect) => {
      return `Please choose what aspect you would like to change?\n\n
        📝 ${boldText("Action")}\n
        👤 ${boldText("Target")}*\n
        ⌚ ${boldText("Time")}\n
        📅 ${boldText(aspect)}\n
        📧 ${boldText("Message")}`;
    },
  },
  warning: {
    invalidType: ({ invalidValue, type, example, task }) => {
      return `⚠ '${invalidValue}' is not a valid \`${type}\` format\n
       _example - ${example}_ \n\n
       -*${type[0].toUpperCase() + type.slice(1)}*:\n
       _previous ${task.key}_: ${task.value || "19:00"}\n\n
      Please provide the new ${type} to update or use *Back* to return to main task.`;
    },
  },
  toast: ({ text }) => {
    return `${text} \n\nOr use *Back* to return to main task.`;
  },
  error: {
    restrictedAction:
      "*❌ Restricted*\n\nYou are not allowed for perform this action!",
  },
};

const getCronParts = (crontask) => {
  console.log("getCron", crontask);
  return crontask.reduce((acc, curr, x) => {
    // console.log('acc:', acc, 'curr:', curr)

    if (!acc["rest"]) {
      acc["rest"] = [];

      // return acc;
    }
    if (["reminder", "message"].includes(curr)) {
      acc["cronType"] = curr;

      return acc;
    }

    if (isTimePeriod(curr)) {
      // console.log("detected period time")
      acc["rest"] = [...acc["rest"], curr];
      return acc;
    }
    if (["to"].includes(curr)) {
      acc["cronTarget"] = crontask[x + 1];

      return acc;
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
};

const formatPeriod = (arr, joined) => {
  let period = arr;
  if (
    arr.includes("from") ||
    (arr.includes("to") && isDay(arr[arr.indexOf("to") + 1]))
  ) {
    // const toIdx =
    for (let i = 0; i < period.length; i++) {
      if (
        (period[i] === "from" &&
          isDay(period[i + 1]) &&
          period[i + 2] === "to") ||
        (period[i] === "to" && isDay(period[i + 1]))
      ) {
        const from = period[i] === "to" ? period[i - 1] : period[i + 1];
        const to = period[i] === "to" ? period[i + 1] : period[i + 3];
        let t = [from + "-" + to];

        if (period[period.indexOf(from) - 1] === "from") {
          period[period.indexOf(from) - 1] = "";
        }
        if (period[period.indexOf(to) - 1] === "to") {
          period[period.indexOf(to) - 1] = "";
        }
        period[period.indexOf(from)] = "";
        period[period.indexOf(to)] = "";
        period = period.filter((p) => p !== "");
        period = [...period, ...t];
      }
    }
    console.log("period", period);
    return joined ? period.join("") : period;
  }
  return period;
};

const createCronJob = (msg, task) => {
  // console.log("ct", task[0]);
  const [crontask, message] = task;
  // const [cronAction, n0, cronType, n1, cronTarget, ...rest] = crontask
  // try {
  const { cronType, cronTarget, rest } = getCronParts(crontask);

  const cronTimes = rest.filter((r) => isTimeFormat(r)).join(",");
  const cronDayDate = rest
    .filter((r) => isDayDate(r) || isTimePeriod(r))
    .join(" ");

  // console.log("cronType:", cronType, "cronTarget:", cronTarget, "rest:", rest);

  if (!validateCron(rest)) {
    throw new Error("Invalid cron task");
  }

  const cronExpression = buildExpressionFor(rest);
  // console.log("task:", crontask, cronExpression, message);
  console.log("Cron task:", cronType, cronTarget, cronExpression, message);
  const formatDayDate = isDate(cronDayDate)
    ? "date"
    : isDay(cronDayDate)
    ? "day"
    : isDays(cronDayDate)
    ? "days"
    : isTimePeriod(cronDayDate)
    ? "period"
    : "day";

  const dayDate = {
    [formatDayDate]:
      isDate(cronDayDate) || isTimePeriod(cronDayDate)
        ? cronDayDate
        : isDays(cronDayDate)
        ? cronDayDate
            .split(" ")
            .filter((cr) => isDay(cr))
            .map((c, x, r) => (x === r.length - 1 ? "and " + c : c))
            .join(" ")
        : format.day(cronDayDate),
  };
  const dateArg = isDate(cronDayDate)
    ? "on " + cronDayDate
    : isDay(cronDayDate)
    ? "on " + cronDayDate
    : isDays(cronDayDate)
    ? "on " +
      cronDayDate
        .split(" ")
        .filter((cr) => isDay(cr))
        .map((c, x, r) => (x === r.length - 1 ? "and " + c : c))
        .join(" ")
    : isTimePeriod(cronDayDate)
    ? "from " + cronDayDate.replace("-", " to ")
    : "on " + cronDayDate;

  updateInputState(
    "schedule",
    {
      inputState: INPUTSTATETYPES["confirming command"],
      isIncomming: true,
      args: [
        "a " + cronType,
        "to " + cronTarget,
        "at " + cronTimes,
        dateArg,
        cronType + ": " + message,
      ],
    },
    {
      action: cronType,
      target: cronTarget,
      time: cronTimes,
      ...dayDate,
      [cronType]: message,
      expression: cronExpression,
    }
  );

  msg.reply(
    botMsg(
      msgType.confirm({
        action: {
          key: "Action",
          value:
            cronTypeMap[cronType] +
            " " +
            cronType +
            "  " +
            (cronTarget ? "to " + cronTarget : "for Me"),
        },
        time: { key: "Time", value: cronTimes },
        message: { key: cronType, value: message },
        dayDatePeriod: {
          key: formatDayDate[0].toUpperCase() + formatDayDate.slice(1),
          value: isDays(cronDayDate)
            ? cronDayDate
                .split(" ")
                .filter((cr) => isDay(cr))
                .map((c, x, r) => (x === r.length - 1 ? "and " + c : c))
                .join(" ")
            : cronDayDate,
        },
      })
    )
  );
  return { cronType, cronTarget, cronExpression, message };
  // } catch (error){
  //   // console.error("Error creating cron job:", error)
  //   throw new Error("Error creating cron job");
  // }
};
const editCronJob = (client, msg, args) => {
  console.log("Editing cron job...");
  if (args?.[1] === "edit" && args?.[2] && args?.[3]) {
    console.log("updating ", args);
    try {
      if (
        !["reminder", "message"].includes(args[2]) &&
        !["reminder", "message"].includes(args[3]) &&
        !getContactIdByName(args[3]) &&
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
      } else if (
        ["day", "date", "day/date", "days", "period"].includes(args[2])
      ) {
        const store = inputStore("schedule");
        let newStore;
        let dayDate = args.slice(3).join(" ");
        if (
          (args.includes("from") && isDay(args[args.indexOf("from") + 1])) ||
          (args.includes("to") &&
            isDay(args[args.indexOf("to") + 1]) &&
            isDay(args[args.indexOf("to") - 1]))
        ) {
          let period = args.includes("to")
            ? args.slice(args.indexOf("to") - 1)
            : args.slice(args.indexOf("from"));

          dayDate = formatPeriod(period, "joined");
        }
        if (isDay(dayDate)) {
          const { period: t1, date: t2, days: t3, ...rest } = store;
          newStore = {
            ...rest,
            ["day"]: format.day(dayDate),
            complete: true,
          };
        }
        if (isDays(dayDate)) {
          const { period: t1, date: t2, day: t3, ...rest } = store;
          newStore = {
            ...rest,
            ["days"]: dayDate,
            complete: true,
          };
        }
        if (isDate(dayDate)) {
          const { day: t1, period: t2, days: t3, ...rest } = store;
          newStore = {
            ...rest,
            ["date"]: dayDate,
            complete: true,
          };
        }
        if (isTimePeriod(dayDate)) {
          console.log("period", dayDate);
          const { day: t1, date: t2, days: t3, ...rest } = store;
          newStore = {
            ...rest,
            ["period"]: dayDate,
            complete: true,
          };
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
          msgType.warning.invalidType({
            invalidValue: args[3],
            type: args[2],
            example: exampleFormat[args[2]],
            task: {
              key: args[2],
              value: task?.[args[2]],
            },
          })
        )
      );
    }
  }

  if (scheduleParts[1].includes(args[2].toLowerCase())) {
    const aspect = args[2].toLowerCase();

    const store = inputStore("schedule");
    const value = ["day", "days", "date", "day/date", "period"].includes(
      args[2]
    )
      ? store?.["day"] ||
        store?.["days"] ||
        store?.["date"] ||
        store?.["period"]
      : store?.[aspect];

    const title = args[2][0].toUpperCase() + args[2].slice(1);

    return msg.reply(
      botMsg(
        msgType.toast({
          text: `-${boldText(title)}:\n 
              ${italicsText("previous " + args[2])}: ${value || "19:00"}\n\n
              Please provide the new ${args[2]} to update`,
        })
      )
    );
  }
};

const viewCronJobs = async (client, msg, args) => {
  console.log("viewing job");
  const jobs = await tasker.read();

  // console.log("tasks", jobs)
  msg.reply(
    botMsg(
      msgType.toast({
        text: `*Current Scheduled Tasks*\n\n${
          jobs.datalist.length > 0
            ? jobs.datalist
                .map((i, x) => {
                  return `${x + 1}. 
            *${i.task.cronTarget}*
            *${i.task.timestamp}*
            *${i.task.message}*
            *${i.task.cronPeriod}*
            `;
                })
                .join("\n")
            : italicsText("No tasks scheduled")
        }`,
      })
    )
  );
  return;
};
const deleteCronJob = (client, msg, args) => {
  console.log("viewing job");
};
const confirmTask = (
  client,
  cronType,
  cronTarget,
  cronExpression,
  cronPeriod,
  message
) => {
  let scheduledTask;
  if (cron.validate(cronExpression)) {
    scheduledTask = cron.schedule(cronExpression, async () => {
      const lastCronType = cronType;
      console.log("Sending scheduled message...");
      if (lastCronType === "reminder") {
        await sendReminder(msg, "_", message);
      } else if (lastCronType === "message") {
        await sendMessage(client, getContactIdByName(cronTarget), message);
      } else {
        await cronActionMap[cronTypeMap[lastCronType]](
          client,
          cronTarget,
          message
        );
      }
    });

    tasker.insert(scheduledTask.options?.name, {
      timestamp: new Date().toISOString(),
      cronTarget,
      message,
      cronPeriod,
      cronExpression,
    });
  }
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

  // } catch (error) {
  //   throw error
  // }
};

const execute = async (client, msg, args) => {
  if (!msg.fromMe) {
    return msg.reply(botMsg(msgType.error.restrictedAction));
  }
  try {
    if (args[0] === INPUTSTATETYPES["waiting for command"]) {
      if (args.includes("back")) {
        updateInputState(
          "schedule",
          {
            inputState: INPUTSTATETYPES["waiting for command"],
            isIncomming: true,
            args: args.slice(args.indexOf("back")),
          },
          {}
        );
        return msg.reply(
          botMsg(
            `*Schedule a task or check the details of a current task.*\n
                What would you like to do?
                *new task* - add a new task
                *view tasks* - see all current tasks
                *delete task [taskID]* - delete a task
              `
          )
        );
      }
      if (args[1] && args[2]) {
        args[1] = args[1] + " " + args[2];

        args = [...args.slice(0, 2), ...args.slice(3)];
      }
      console.log("waiting for Command, args:", args[1]);

      if (args[1] === "new task") {
        updateInputState("schedule", {
          inputState: INPUTSTATETYPES["reading command"],
          isIncomming: true,
          args: args.slice(args.indexOf("new task")),
        });

        return msg.reply(
          botMsg(
            msgType.toast({
              text:
                "Would you like to schedule a " +
                italicsText("reminder") +
                " or " +
                italicsText("message"),
            })
          )
        );
      }

      if (args[1] === "view tasks") {
        updateInputState("schedule", {
          inputState: INPUTSTATETYPES["waiting for command"],
          isIncomming: true,
          args,
        });

        return viewCronJobs(client, msg, args);
      }

      if (args[1] === "delete task") {
        if (!args[2] || !new RegExp(/[0-9]/).test(args[2]))
          return msg.reply(
            botMsg(
              msgType.toast({
                text: "Please include the task Id in the command, e.g. `delete task 1`",
              })
            )
          );

        updateInputState("schedule", {
          inputState: INPUTSTATETYPES["reading command"],
          isIncomming: true,
          args,
        });
        return msg.reply(
          botMsg(
            msgType.confirm({
              custom: {
                action: "delete",
                target: "task" + args[2],
              },
            })
          )
        );
      }
    }
    if (args[0] === INPUTSTATETYPES["reading command"]) {
      if (args.includes("back")) {
        updateInputState(
          "schedule",
          {
            inputState: INPUTSTATETYPES["waiting for command"],
            isIncomming: true,
            args: args.slice(args.indexOf("back")),
          },
          {}
        );
        return msg.reply(
          botMsg(
            `*Schedule a task or check the details of a current task.*\n
                What would you like to do?
                *new task* - add a new task
                *view tasks* - see all current tasks
                *delete task [taskID]* - delete a task
              `
          )
        );
      }
      // check which schedule parts are not included in the args
      const tskLen = incommingInput()?.args.length;

      let newArgs = formatPeriod(args.slice(1)).join(" ");
      console.log("new, ", newArgs);
      const storePart =
        scheduleParts[0][tskLen] === "message/reminder"
          ? inputStore("schedule").action
          : scheduleParts[0][tskLen] === "day/date"
          ? isCron(newArgs).toLowerCase()
          : scheduleParts[0][tskLen];
      newArgs = cronify(scheduleParts[0][tskLen], newArgs);

      updateInputState(
        "schedule",
        {
          inputState: INPUTSTATETYPES["reading command"],
          isIncomming: true,
          args: [
            args[0],
            ["message", "reminder"].includes(storePart)
              ? storePart + newArgs
              : newArgs,
          ],
        },
        { [storePart]: args.slice(1).join(" ") }
      );
      const nextPart = scheduleParts[0][tskLen + 1];

      const translatePart = {
        action: "reminder or message",
        target:
          "Who would you like to send the " +
          inputStore("schedule").action +
          " to?",
        time:
          "What time would you like to schedule the " +
          inputStore("schedule").action +
          "?",
        "day/date":
          "Which day or date would you like to schedule the " +
          inputStore("schedule").action +
          "?",
        "message/reminder":
          "What " +
          inputStore("schedule").action +
          " would you like to schedule?",
      };
      if (tskLen + 1 < scheduleParts[0].length) {
        return msg.reply(
          botMsg(
            msgType.toast({
              text: translatePart[nextPart],
            })
          )
        );
      }
      updateInputState("schedule", {
        inputState: INPUTSTATETYPES["confirming command"],
        isIncomming: true,
        args: incommingInput()?.args,
      });
      const store = inputStore("schedule");
      return msg.reply(
        botMsg(
          msgType.confirm({
            action: {
              key: "Action",
              value: store.action,
            },
            time: {
              key: "Time",
              value: store.time,
            },
            message: {
              key: store.action,
              value: store[store.action],
            },
            dayDatePeriod: {
              key: store.hasOwnProperty("day")
                ? "Day"
                : store.hasOwnProperty("days")
                ? "Days"
                : store.hasOwnProperty("date")
                ? "Date"
                : store.hasOwnProperty("period")
                ? "Period"
                : "Day",
              value:
                store[
                  store.hasOwnProperty("day")
                    ? "day"
                    : store.hasOwnProperty("days")
                    ? "days"
                    : store.hasOwnProperty("date")
                    ? "date"
                    : store.hasOwnProperty("period")
                    ? "period"
                    : "day"
                ],
            },
          })
        )
      );
    }

    if (args[0] === INPUTSTATETYPES["confirming command"]) {
      // updateInputState('schedule', {inputState:INPUTSTATETYPES['confirming command'], isIncomming:true, args})
      if (args[1] === "yes") {
        msg.reply(botMsg("okay..., task scheduled! "));
        let { action, target, message, day, days, date, period, expression } =
          inputStore("schedule");

        expression ||= buildExpressionFor(
          getCronParts(prepareForCronTask(inputStore("schedule"))[0]).rest
        );
        confirmTask(
          client,
          action,
          target,
          expression,
          day || days || date || period,
          message
        );
        return;
      }
      if (args[1] === "no") {
        msg.reply(botMsg("okay..., task rejected!"));
        return;
      }
      if (args[1] === "edit") {
        const store = inputStore("schedule");
        const dayDatePeriod = store?.day
          ? "Day"
          : store?.days
          ? "Days"
          : store?.date
          ? "Date"
          : store?.period
          ? "Period"
          : "Day";

        updateInputState("schedule", {
          inputState: INPUTSTATETYPES["updating command"],
          isIncomming: true,
          args,
        });
        return msg.reply(
          botMsg(
            msgType.update({
              dayDatePeriod,
              message: store.hasOwnProperty("message") ? "message" : "reminder",
            })
          )
        );
      }

      return msg.reply(botMsg(msgType.choose.option));
    }

    if (args[0] === INPUTSTATETYPES["updating command"]) {
      updateInputState("schedule", {
        inputState: INPUTSTATETYPES["updating command"],
        isIncomming: true,
        args,
      });
      if (args.includes("back")) {
        // console.log("back", args)
        updateInputState("schedule", {
          inputState: INPUTSTATETYPES["updating command"],
          isIncomming: true,
          args: args.slice(args.indexOf("back")),
        });

        const task = prepareForCronTask(inputStore("schedule"));
        // console.log("back", task)
        return scheduleNewTask(client, msg, task);
      }
      if (args?.[1] === "edit") {
        return editCronJob(client, msg, args);
      }

      return msg.reply(
        botMsg(
          msgType.choose.aspect(args[2][0].toUpperCase() + args[2].slice(1))
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

        let [crontask, message] = [
          task.split("\n")[0].split(" "),
          task.split("\n")[1].split(":")[1],
        ];

        // for(let i = 0; i < crontask.length; i++){
        //   if((crontask[i] === 'from' && isDay(crontask[i+1]) && crontask[i+2] === 'to') || (crontask[i] === 'to' && isDay(crontask[i+1]))){
        //     const from = crontask[i] === 'to' ? crontask[i-1] : crontask[i+1];
        //     const to = crontask[i] === 'to' ? crontask[i+1] : crontask[i+3];
        //     crontask = [...crontask.slice(0,i), from+"-"+to, ...crontask.slice(i+4)]
        //   }
        // }

        crontask = formatPeriod(crontask);

        return scheduleNewTask(client, msg, [crontask, message]);
      } else {
        throw new Error("task invalid");
      }
    }

    updateInputState(
      "schedule",
      {
        inputState: INPUTSTATETYPES["waiting for command"],
        isIncomming: true,
        args,
      },
      {}
    );
    return msg.reply(
      botMsg(
        `*Schedule a task or check the details of a current task. * \n
          What would you like to do?
          *new task* - add a new task
          *view tasks* - see all current tasks
          *delete task [taskID]* - delete a task
          `
      )
    );
  } catch (error) {
    console.error("Error in task format:", error);
    return msg.reply(botMsg(msgType.notify));
  }
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
