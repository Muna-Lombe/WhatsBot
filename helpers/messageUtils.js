const botmark = "​";

function botMsgWrapper(msg) {
  const tag = "_Powered by WhatsBot_";
  return botmark + msg + "\n\n" + (msg.endsWith(tag) ? "" : tag);
}

module.exports = {
  botMsg: botMsgWrapper,
};
