//jshint esversion:8
const { MessageMedia } = require("whatsapp-web.js");
const { botMsg } = require("../../helpers/messageUtils");

const execute = async (client, msg) => {
  msg.delete(true);
  let quotedMsg = await msg.getQuotedMessage();
  if (quotedMsg.hasMedia) {
    let attachmentData = await quotedMsg.downloadMedia();
    await client.sendMessage(
      msg.to,
      new MessageMedia(
        attachmentData.mimetype,
        attachmentData.data,
        attachmentData.filename
      ),
      { sendMediaAsSticker: true, caption: botmark }
    );
  } else {
    await client.sendMessage(
      msg.to,
      botMsg(`🙇‍♂️ *Error*\n\n` + "```No image found to make a Sticker```")
    );
  }
};

module.exports = {
  name: "Sticker Maker",
  description: "generates sticker from image",
  command: "!sticker",
  commandType: "plugin",
  isDependent: false,
  help: `*Sticker Maker*\n\nCreate sticker from Image.\n\nReply an image with *!sticker* to get a sticker of that image.`,
  execute,
};
