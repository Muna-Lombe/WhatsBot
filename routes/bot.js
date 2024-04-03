const { Router } = require("express");
// const { verifyToken } = require("../middlewares/Auth");
const { BotController } = require("../controllers/BotController");

// const botRouter = Router();

const wsRouter = async (socket, message) => {
  console.log("mess", message.toString());
  const { event, ...rest } = JSON.parse(message.toString());
  console.log("event s2", event);
  if (event === "echo") {
    socket.send(JSON.stringify({ event: "echo", message: "hello" }));
  }
  if (event === "register") {
    await BotController.register(socket, rest);
    return;
  }
  if (event === "connect") {
    await BotController.connect(socket, rest);
    return;
  }
  if (event === "disconnect") {
    await BotController.disconnect(socket, rest);
    return;
  }
};

module.exports = { wsRouter };
