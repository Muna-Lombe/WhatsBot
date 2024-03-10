const { botMsg } = require("./messageUtils");

async function callCommand(client, msg, input, updateInputState) {
  let args = msg.body.slice(1).trim().split(/ +/g);
  let command = args.shift().toLowerCase();

  console.log({ command, args });
  if (input.lastCommand === command && isIncommingInput().isIncomming) {
    updateInputState(command, {
      inputState: "closed",
      isIncomming: false,
      args: [],
    });
  }

  if (client.commands.has(command)) {
    try {
      await client.commands.get(command).execute(client, msg, args);
    } catch (error) {
      console.log(error);
    }
  } else {
    await client.sendMessage(
      msg.to,
      botMsg(
        "No such command found. Type !help to get the list of available commands"
      )
    );
  }
}
module.exports = {
  callCommand,
};
