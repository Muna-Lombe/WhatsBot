const { inputStore } = require("./commandInputState");
const { italicsText, boldText } = require("./textUtil");

const botmark = "​";

function botMsgWrapper(msg) {
  const tag = "_Powered by WhatsBot_";
  return botmark + msg + "\n\n" + (msg.endsWith(tag) ? "" : tag);
}
const questionFor = () => ({
  action: "reminder or message",
  target:
    "Who would you like to send the " + inputStore("schedule")?.action + " to?",
  time:
    "What time would you like to schedule the " +
    inputStore("schedule")?.action +
    "?",
  "day/date":
    "Which day or date would you like to schedule the " +
    inputStore("schedule")?.action +
    "?",
  "message/reminder":
    "What " + inputStore("schedule")?.action + " would you like to schedule?",
});

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
    return `${text} \n\n Use *Back* to return to main task.`;
  },
  error: {
    restrictedAction:
      "*❌ Restricted*\n\nYou are not allowed for perform this action!",
  },
};
const reminderMessage = (message) => botMsgWrapper(message);
const basicMessage = (message) => botMsgWrapper(message);
const warningMessage = ({ invalidValue, type, task, exampleFormat }) =>
  botMsgWrapper(
    msgType.warning.invalidType({
      invalidValue,
      type,
      example: exampleFormat,
      task,
    })
  );
const toastMessage = ({ nextPart, text }) =>
  botMsgWrapper(
    msgType.toast({
      text: nextPart ? questionFor()[nextPart] : text,
    })
  );

const confirmMessage = ({ store, custom }) =>
  botMsgWrapper(
    custom
      ? msgType.confirm({
          custom,
        })
      : msgType.confirm({
          action: {
            key: "Action",
            value: store.action,
          },
          time: {
            key: "Time",
            value: store.time,
          },
          message: {
            key: store.message.key,
            value: store.message.value,
          },
          dayDatePeriod: {
            key: store.dayDatePeriod.key,
            value: store.dayDatePeriod.value,
          },
        })
  );

const scheduledTaskMessage = (txt = "task scheduled!") =>
  botMsgWrapper("okay..., " + txt + " ");
const rejectedTaskMessage = (txt = "okay..., task rejected!") =>
  botMsgWrapper(txt);
const updatedTaskMessage = ({ store, dayDatePeriod }) =>
  botMsgWrapper(
    msgType.update({
      dayDatePeriod: dayDatePeriod,
      message: store.hasOwnProperty("message") ? "message" : "reminder",
    })
  );
const optionMessage = () => botMsgWrapper(msgType.choose.option);
const choiceMessage = ({ args }) =>
  botMsgWrapper(
    msgType.choose.aspect(args[2][0].toUpperCase() + args[2].slice(1))
  );
const invalidChoiceMessage = () =>
  botMsgWrapper(
    "Please provide a valid task to schedule. \nUse `!help schedule` for more info."
  );
const scheduleTaskMessage = () =>
  botMsgWrapper(
    `*Schedule a task or check the details of a current task. * \n
          What would you like to do?
          *new task* - add a new task
          *view tasks* - see all current tasks
          *delete task [taskID]* - delete a task
          `
  );

const restrictedActionMessage = () =>
  botMsgWrapper(msgType.error.restrictedAction);
const requiresActionMessage = () => botMsgWrapper(msgType.notify);

module.exports = {
  botMsg: botMsgWrapper,
  reminderMessage,
  basicMessage,
  warningMessage,
  toastMessage,
  confirmMessage,
  scheduledTaskMessage,
  rejectedTaskMessage,
  updatedTaskMessage,
  invalidChoiceMessage,
  optionMessage,
  choiceMessage,
  scheduleTaskMessage,
  restrictedActionMessage,
  requiresActionMessage,
  msgType,
};
