const { italicsText, boldText } = require("./textUtil");

const botmark = "​";

function botMsgWrapper(msg) {
  const tag = "_Powered by WhatsBot_";
  return botmark + msg + "\n\n" + (msg.endsWith(tag) ? "" : tag);
}
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

module.exports = {
  botMsg: botMsgWrapper,
  msgType,
};
