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
  exampleFormat,
  scheduleParts,
  types,
  isPeriod,
  isTimePeriod,
  isDays,
  isMonth,
  getMonthIdx,
  validPeriods,
  validTimes,
} = require("../helpers/cronUtils");
const {
  botMsg,
  msgType,
  requiresActionMessage,
  scheduleTaskMessage,
  invalidChoiceMessage,
  choiceMessage,
  optionMessage,
  updatedTaskMessage,
  rejectedTaskMessage,
  scheduledTaskMessage,
  confirmMessage,
  toastMessage,
  warningMessage,
  reminderMessage,
  basicMessage,
  restrictedActionMessage,
} = require("../helpers/messageUtils");
const { INPUTSTATETYPES } = require("../helpers/commandUtils");
const { boldText, italicsText } = require("../helpers/textUtil");

/**
 *
 * @param {Client} client
 * @param {String} contactName
 * @param {String} message
 */
const sendMessage = async (client, contactId, message) => {
  //console.log("Sending message ...");

  const contact = await client.getContactById(contactId);
  const chat = await contact.getChat();
  // basic message
  chat.sendMessage(basicMessage(message));
};
// botMsg
const cronify = (type, str) => {
  const isp =
    str.includes("from") ||
    str.includes("in") ||
    (str.includes("-") && str.split("-").length === 2);

  return isp ? str : types[type] + " " + str;
};
const findBestMatch = (toMatch, matchIn) => {
  toMatch.toLowerCase();
  let result = "";
  for (k of matchIn.keys()) {
    k.toLowerCase();

    if (k.includes(toMatch)) {
      return (result = matchIn.get(k));
    }
  }
  return result;
};

const prepareForCronTask = (task) => {
  // //console.log("reast", task)
  const { message, reminder, day, date, period, days, ...rest } = task;
  rest.action = ["a", rest.action];
  rest.target = ["to", rest.target];
  rest.time = ["at", rest.time];
  // rest.day = ["on", rest.day];
  rest[
    day ? "day" : date ? "date" : period ? "period" : days ? "days" : "day"
  ] = [period ? "" : "on", ...(day || days || date || period).split(" ")];
  const action = message ? message : reminder;

  const builtTask = [[...Object.values(rest).flat()], action];
  // //console.log("bt", builtTask)
  return builtTask;
};

const sendReminder = async (client, contactName, message) => {
  //console.log("Sending reminder...");
  await client.reply(
    // reminder message
    reminderMessage(message)
  );
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

const cmdValidFor = {
  "new task": (arg, currPart, client) => {
    let validTasktype = ["reminder", "message"].includes(arg);
    let validContact = client.contacts.has(arg);
    let validTimeOrPeriod = isTimeFormat(arg) || isTimePeriod(arg);
    let validDatetype = isDayDate(arg);

    // if(!validContact){
    //   return {status:"invalid", error: "The target is not a contact"}
    // }
    // if(!validTasktype){
    //   return {status:"invalid", error: "The task is not valid"}
    // }
    // if(!validTimeOrPeriod){
    //   return {status:"invalid", error: "The time period is not valid"}
    // }
    // if(!validDatetype){
    //   return {status:"invalid", error: "The date is not valid"}
    // }
    // return {status:"valid", error:null}
    switch (currPart) {
      case "action":
        break;
      case "day/date":
        break;
      case "target":
        break;
      case "time":
        break;
      case "message/reminder":
        break;

      default:
        break;
    }
    if (!validContact) {
      return { status: "invalid", error: "The target is not a contact" };
    }
    if (!validTasktype) {
      return { status: "invalid", error: "The task is not valid" };
    }
    if (!validTimeOrPeriod) {
      return { status: "invalid", error: "The time period is not valid" };
    }
    if (!validDatetype) {
      return { status: "invalid", error: "The date is not valid" };
    }
    return { status: "valid", error: null };
  },
  "view tasks": (arg, client) => !isNaN(arg),
  "restart tasks": (arg, client) => !isNaN(arg),
  "delete task": (arg, client) => !isNaN(arg),
};
const getCronParts = (crontask) => {
  //console.log("getCron", crontask);
  const accParts = crontask.reduce((acc, curr, x) => {
    // //console.log('acc:', acc, 'curr:', curr)

    if (!acc["rest"]) {
      acc["rest"] = [];

      // return acc;
    }
    if (["reminder", "message"].includes(curr)) {
      acc["cronType"] = curr;

      return acc;
    }

    if (isTimePeriod(curr)) {
      // //console.log("detected period time")
      acc["rest"] = [...acc["rest"], curr];
      return acc;
    }

    if (!isNaN(curr) && isMonth(curr + 1)) {
      // //console.log("detected period time")
      return acc;
    }
    if (isMonth(curr)) {
      // //console.log("detected period time")
      if (!isNaN(crontask[x - 1]) && !isNaN(crontask[x + 1])) {
        acc["rest"] = [
          ...acc["rest"],
          crontask[x - 1] +
            "/" +
            getMonthIdx(curr).toString() +
            "/" +
            crontask[x + 1],
        ];
        return acc;
      }
      acc["rest"] = [...acc["rest"], getMonthIdx(curr).toString()];
      return acc;
    }

    if (!isNaN(curr) || isMonth(curr - 1)) {
      // //console.log("detected period time")
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
  //console.log("getCronParts acc:", accParts)
  return accParts;
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
    //console.log("period", period);
    return joined ? period.join("") : period;
  }
  return period;
};

const createCronJob = (msg, task) => {
  // //console.log("ct", task[0]);
  const [crontask, message] = task;
  // const [cronAction, n0, cronType, n1, cronTarget, ...rest] = crontask
  // try {
  const { cronType, cronTarget, rest } = getCronParts(crontask);

  const cronTimes = rest.filter((r) => isTimeFormat(r)).join(",");
  const cronDayDate = rest
    .filter((r) => isDayDate(r) || isTimePeriod(r))
    .join(" ");

  // //console.log("cronType:", cronType, "cronTarget:", cronTarget, "rest:", rest);

  if (!validateCron(rest)) {
    throw new Error("Invalid cron task");
  }

  const cronExpression = buildExpressionFor(rest);
  // //console.log("task:", crontask, cronExpression, message);
  //console.log("Cron task:", cronType, cronTarget, cronExpression, message);
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
      lastAction: "new task",
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
  // //console.log("in createCronJob", cronType, cronTarget, cronExpression, cronDayDate, formatDayDate[0].toUpperCase() + formatDayDate.slice(1), message)
  msg.reply(
    // confirm message
    confirmMessage({
      store: {
        action:
          cronTypeMap[cronType] +
          " " +
          cronType +
          "  " +
          (cronTarget ? "to " + cronTarget : "for Me"),
        time: cronTimes,
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
      },
    })
  );
  return { cronType, cronTarget, cronExpression, message };
  // } catch (error){
  //   // console.error("Error creating cron job:", error)
  //   throw new Error("Error creating cron job");
  // }
};
const editCronJob = async (client, msg, args) => {
  //console.log("Editing cron job...");
  if (args?.[1] === "edit" && args?.[2] && args?.[3]) {
    //console.log("updating ", args);
    try {
      if (
        !["reminder", "message"].includes(args[2]) &&
        !["reminder", "message"].includes(args[3]) &&
        !client.contacts.has(args[3]) &&
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
          //console.log("store", newStore);
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
          //console.log("period", dayDate);
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
      //console.log("some err", error);
      const task = inputStore("schedule");

      return msg.reply(
        // warning message
        warningMessage({
          invalidValue: args.at(-1),
          type: args[2],
          task: {
            key: args[2],
            value: task?.[args[2]],
          },
          exampleFormat: exampleFormat(args[2]),
        })
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
      // toast message
      toastMessage({
        text: `-${boldText(title)}:\n 
            ${italicsText("previous " + args[2])}: ${value || "19:00"}\n\n
            Please provide the new ${args[2]} to update`,
      })
    );
  }
};

const viewCronJobs = async (client, msg, args) => {
  //console.log("viewing job");
  const { datalist: data } = await tasker.read();
  const runningTasks = cron.getTasks();

  const jobStateFor = (i) => {
    return isDate(i.task.cronPeriod) - new Date() < 0
      ? "expired"
      : runningTasks.has(i.taskId)
      ? "running"
      : "not running";
  };

  //console.log('pretasks', JSON.stringify(data))

  const jobs =
    data?.map((j, x) => {
      const status = jobStateFor(j);
      if (status === "expired") {
        tasker.update({ key: { id: j.id }, update: { status: status } });
      }
      return {
        ...j,
        status: status,
      };
    }) || [];

  //console.log("tasks", JSON.stringify(jobs));
  jobs?.sort((a, b) => b.status[0].charCodeAt(0) - a.status[0].charCodeAt(0));
  //console.log("sorted tasks", JSON.stringify(jobs));
  msg.reply(
    // toast message
    toastMessage({
      text: `*Current Scheduled Tasks*\n\n${
        jobs?.length > 0
          ? jobs
              ?.map((i, x) => {
                return `${x + 1}.        Task ${i.id} - *\`${i.status}\`*
            To who: \*${i.task.cronTarget}\*
            Message: ${i.task.message}
            Day or Date: \*${i.task.cronPeriod}\*
            `;
              })
              .join("\n") +
            `\n\nTo restart a task that is not running, use the command *restart tasks [taskId]* `
          : italicsText("No tasks scheduled")
      }
        `,
    })
  );
  return;
};
const restartCronJob = async (client, msg, jobId) => {
  //console.log("reading restart")
  const { datalist } = await tasker.read({ id: parseInt(jobId) });
  const job = datalist[0];
  const runningTasks = cron.getTasks();

  if (!job.task) {
    return msg.reply(
      // scheduled message
      toastMessage({ text: `task id '${jobId}' is not correct` })
    );
  }
  if (job.status === "expired") {
    //console.log("expired...")
    return msg.reply(
      // scheduled message
      toastMessage({
        text: `this task has already expired and cannot be restarted. Create a new task instead using the command\n!schedule.`,
      })
    );
  }
  if (runningTasks.size > 0 && runningTasks.has(job.taskId)) {
    return msg.reply(
      // scheduled message
      toastMessage({ text: "task is already running" })
    );
  }
  const newTask = cron.schedule(job?.task?.cronExpression, async () => {
    const lastCronType = job?.task?.hasOwnProperty("message")
      ? "message"
      : "reminder";
    //console.log('Sending scheduled message...')
    if (lastCronType === "reminder") {
      await sendReminder(msg, "_", message);
    } else if (lastCronType === "message") {
      await sendMessage(
        client,
        "+" + findBestMatch(job?.task.cronTarget, client.contacts).number,
        job?.task.message
      );
    } else {
      await cronActionMap[cronTypeMap[lastCronType]](
        client,
        job?.task.cronTarget,
        job?.task.message
      );
    }
  });

  //console.log("task restarted: ", newTask.options.scheduled)
  await tasker.update({
    key: { id: jobId },
    update: { taskId: newTask.options.name },
  });
  return msg.reply(
    // scheduled message
    toastMessage({ text: "task restarted!" })
  );
};
const deleteCronJob = async (client, msg, args) => {
  //console.log("deleting job", args);
  const deleted = await tasker.remove(args[1]);
  return deleted
    ? msg.reply(
        // scheduled message
        scheduledTaskMessage("task deleted!")
      )
    : msg.reply(
        // rejected message
        rejectedTaskMessage("task not deleted!")
      );
};
const confirmNewTask = (
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
      //console.log("Sending scheduled message...");
      if (lastCronType === "reminder") {
        await sendReminder(msg, "_", message);
      } else if (lastCronType === "message") {
        await sendMessage(
          client,
          "+" + findBestMatch(cronTarget, client.contacts).number,
          message
        );
      } else {
        await cronActionMap[cronTypeMap[lastCronType]](
          client,
          cronTarget,
          message
        );
      }
    });

    const status = "running";
    tasker.insert(scheduledTask.options?.name, status, {
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

const noAction = (client, msg, args) => {
  return msg.reply(
    // requires action message
    requiresActionMessage()
  );
};

const navigateToDeleteTask = (msg, args) => {
  if (!args[2] || !new RegExp(/[0-9]/).test(args[2])) {
    return msg.reply(
      // toast message
      toastMessage({
        text: "Please include the task Id in the command, e.g. `delete task 1`",
      })
    );
  }

  updateInputState("schedule", {
    inputState: INPUTSTATETYPES["reading command"],
    isIncomming: true,
    args,
    lastAction: "delete task",
  });
  return msg.reply(
    // confirm message
    confirmMessage({
      custom: {
        action: "delete",
        target: "task " + args[2],
      },
    })
  );
};

const navigateToViewTasks = (client, msg, args) => {
  updateInputState("schedule", {
    inputState: INPUTSTATETYPES["waiting for command"],
    isIncomming: true,
    args,
    lastAction: "view tasks",
  });

  return viewCronJobs(client, msg, args);
};

const navigateToRestartTasks = (client, msg, args) => {
  if (isNaN(parseInt(args[1].at(-1)))) {
    updateInputState("schedule", {
      inputState: INPUTSTATETYPES["reading command"],
      isIncomming: true,
      args,
      lastAction: "restart tasks",
    });

    return msg.reply(
      // confirm message
      toastMessage({
        text: "Please add the task id",
      })
    );
  }
  updateInputState("schedule", {
    inputState: INPUTSTATETYPES["confirming command"],
    isIncomming: true,
    args,
    lastAction: "restart tasks",
  });

  return msg.reply(
    // confirm message
    confirmMessage({
      custom: {
        action: "restart",
        target: "task " + args[1],
      },
    })
  );
};

const navigateToNewtask = (msg, args) => {
  updateInputState("schedule", {
    inputState: INPUTSTATETYPES["reading command"],
    isIncomming: true,
    args: args.slice(args.indexOf("new task")),
    lastAction: "new task",
  });
  return msg.reply(
    // toast message
    toastMessage({
      text:
        "Would you like to schedule a " +
        italicsText("reminder") +
        " or " +
        italicsText("message"),
    })
  );
};
const navigateBack = (msg, args) => {
  updateInputState(
    "schedule",
    {
      inputState: INPUTSTATETYPES["waiting for command"],
      isIncomming: true,
      args: args.slice(args.indexOf("back")),
      lastAction: "back",
    },
    {}
  );
  return msg.reply(
    // schedule message
    scheduleTaskMessage()
  );
};
const actionRouter = (client, msg, args) => {
  if (args[0 === "new task"]) {
    return scheduleNewTask(client, msg, args);
  }
  if (args[0] === "view") {
    return viewCronJobs(client, msg, args);
  }
  if (args[0] === "delete") {
    return deleteCronJob(client, msg, args);
  }

  return noAction(client, msg, args);
};
const waitingForCommand = (client, msg, args) => {
  //console.log("in waiting for command")
  if (args.includes("back")) {
    return navigateBack(msg, args);
  }
  if (args[1] && args[2]) {
    args[1] = args[1] + " " + args[2];

    args = [...args.slice(0, 2), ...args.slice(3)];
  }
  //console.log("waiting for Command, args:", args);

  if (args[1] === "new task") {
    // startNewTaskSession(()=>navigateToNewTask(msg, args))
    return navigateToNewtask(msg, args);
  }

  if (args[1] === "view tasks") {
    // startViewTasksSession(()=>navigateToViewTasks(client, msg, args))
    return navigateToViewTasks(client, msg, args);
  }

  if (args[1] === "restart tasks") {
    // startRestartTasksSession(()=>navigateToRestartTasks(client, msg, args))
    return navigateToRestartTasks(client, msg, args);
  }

  if (args[1] === "delete task") {
    // startDeleteTaskSession(()=>navigateToDeleteTask( msg, args))
    return navigateToDeleteTask(msg, args);
  }
};
const readingCommand = (client, msg, args) => {
  //console.log('in reading command', args)
  const { lastAction, args: actionArgs } = incommingInput();

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
      // schedule message
      scheduleTaskMessage()
    );
  }

  if (args[1] === "yes" || args[1] === "edit" || args[1] === "no") {
    return confirmingCommand(client, msg, args);
  }

  if (lastAction === "new task") {
    // check if args has errors
    const task = inputStore("schedule");

    // check which schedule parts are not included in the args
    const tskLen = incommingInput()?.args.length;
    const currPart = scheduleParts[0][tskLen];

    const containsInvalid = (action, currPart, input) => {
      return input.some((i) => !cmdValidFor[action](i, currPart, client));
    };

    const { validity: status, error } = containsInvalid("new task", [
      args.slice(1),
    ]);

    // handle invalid actions
    if (validity === "invalid") {
      console.log("invalid args", args);
      return msg.reply(
        warningMessage({
          invalidValue: args.at(-1),
          type: args[2],
          task: {
            key: args[2],
            value: task?.[args[2]],
          },
          exampleFormat: exampleFormat[args[2]] || "new task",
        })
      );
    }

    let newArgs = formatPeriod(args.slice(1)).join(" ");
    //console.log("new, ", newArgs);
    const storePart =
      scheduleParts[0][tskLen] === "message/reminder"
        ? inputStore("schedule").action
        : scheduleParts[0][tskLen] === "day/date"
        ? isCron(newArgs)?.toLowerCase()
        : scheduleParts[0][tskLen];
    newArgs = cronify(scheduleParts[0][tskLen], newArgs);

    // update part added
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
    // //console.log("schedPart", scheduleParts[0], [tskLen + 1]);

    const nextPart = scheduleParts[0][tskLen + 1];

    // reply to add next part
    if (tskLen + 1 < scheduleParts[0].length) {
      return msg.reply(
        // toast message
        toastMessage({ nextPart: nextPart })
      );
    }
    // update no more incomming parts
    updateInputState("schedule", {
      inputState: INPUTSTATETYPES["confirming command"],
      isIncomming: true,
      args: incommingInput()?.args,
    });
    const store = inputStore("schedule");
    // //console.log("going to confirm")
    return msg.reply(
      // confirm message
      confirmMessage({ store })
    );
  }

  if (lastAction === "view tasks") {
  }

  if (lastAction === "delete tasks") {
  }

  //
  if (lastAction === "restart tasks" && !isNaN(parseInt(args[1]))) {
    return navigateToRestartTasks(client, msg, args);
  }
};

const confirmingCommand = (client, msg, args, command) => {
  const { lastAction, args: actionArgs } = incommingInput();

  updateInputState("schedule", {
    inputState: INPUTSTATETYPES["waiting for command"],
    isIncomming: true,
    args,
  });
  //console.log('in confirming command')//, args, actionArgs, lastAction)
  if (args.at(-1) === "yes") {
    const handleTaskConfirmationByAction = (cmd) => {
      // cmds: new task, view task, delete task
      if (cmd === "new task") {
        msg.reply(
          // scheduled message
          scheduledTaskMessage()
        );
        // return scheduleNewTask(client, msg, args);
        let { action, target, message, day, days, date, period, expression } =
          inputStore("schedule");

        expression ||= buildExpressionFor(
          getCronParts(prepareForCronTask(inputStore("schedule"))[0]).rest
        );
        return confirmNewTask(
          client,
          action,
          target,
          expression,
          day || days || date || period,
          message
        );
      }
      if (cmd === "view tasks") {
        return viewCronJobs(client, msg, args);
      }
      if (cmd === "delete task") {
        args[1] = actionArgs.at(-1);

        return deleteCronJob(client, msg, args);
      }
      if (cmd === "restart tasks") {
        args[1] = actionArgs.at(-1);

        return restartCronJob(client, msg, args[1]);
      }
      return noAction(client, msg);
    };
    return handleTaskConfirmationByAction(lastAction);
  }
  if (args.at(-1) === "no") {
    msg.reply(
      // rejected message
      rejectedTaskMessage()
    );
    return;
  }
  if (args.at(-1) === "edit") {
    return; //console.log("args", args)
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
      // update message
      updatedTaskMessage({ store, dayDatePeriod })
    );
  }
  //console.log("no confirmation found")
  return msg.reply(
    // option message

    optionMessage()
  );
};

const updatingCommand = (client, msg, args) => {
  //console.log('in updating command')
  updateInputState("schedule", {
    inputState: INPUTSTATETYPES["updating command"],
    isIncomming: true,
    args,
  });
  if (args.includes("back")) {
    // //console.log("back", args)
    updateInputState("schedule", {
      inputState: INPUTSTATETYPES["updating command"],
      isIncomming: true,
      args: args.slice(args.indexOf("back")),
    });

    const task = prepareForCronTask(inputStore("schedule"));
    // //console.log("back", task)
    return scheduleNewTask(client, msg, task);
  }
  if (args?.[1] === "edit") {
    return editCronJob(client, msg, args);
  }

  return msg.reply(
    // choose message
    choiceMessage(args)
  );
};

const execute = async (client, msg, args) => {
  if (!msg.fromMe) {
    return msg.reply(
      // restricted action message
      restrictedActionMessage()
    );
  }
  try {
    if (args[0] === INPUTSTATETYPES["waiting for command"]) {
      return waitingForCommand(client, msg, args);
    }
    if (args[0] === INPUTSTATETYPES["reading command"]) {
      return readingCommand(client, msg, args);
    }

    if (args[0] === INPUTSTATETYPES["confirming command"]) {
      return confirmingCommand(client, msg, args);
    }

    if (args[0] === INPUTSTATETYPES["updating command"]) {
      return updatingCommand(client, msg, args);
    }

    if (args.length > 1) {
      if (args.includes("reminder") || args.includes("message")) {
        const task = args.join(" "); //msg.body.slice(10).trim()
        if (!task) {
          // invalid message
          return msg.reply(invalidChoiceMessage());
        }

        let [crontask, message] = [
          task.split("\n")[0].split(" "),
          task.split("\n")[1].split(":")[1],
        ];

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
    // schedule message
    return msg.reply(scheduleTaskMessage());
  } catch (error) {
    console.error("Error in task format:", error);
    // requires action message

    return msg.reply(requiresActionMessage());
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
