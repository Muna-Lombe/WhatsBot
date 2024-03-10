//jshint esversion:8
const { MessageMedia } = require("whatsapp-web.js");
const { download } = require("../../helpers/song");
const { botMsg } = require("../../helpers/messageUtils");

const execute = async (client, msg, args) => {
  const botmark = "​";

  if (msg.hasQuotedMsg) {
    msg.delete(true);
    let quotedMsg = await msg.getQuotedMessage();
    let getdata = await download(args[0], quotedMsg.id.id);
    if (getdata.status) {
      await client.sendMessage(
        msg.to,
        new MessageMedia(
          getdata.content.image.mimetype,
          getdata.content.image.data,
          getdata.content.image.filename
        ),
        { caption: botMsg(getdata.content.text) }
      );
    } else {
      await client.sendMessage(msg.to, botMsg(getdata.content));
    }
  } else {
    await client.sendMessage(
      msg.to,
      botMsg(
        "```Search for the song with !song and then reply to the query result with this command```"
      )
    );
  }
};

module.exports = {
  name: "Download Song",
  description: "Download selected song from the list",
  command: "!dldsong",
  commandType: "plugin",
  isDependent: true,
  help: "use !help song to learn about this command",
  execute,
};
