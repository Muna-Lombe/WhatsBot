const { Router } = require("express");
// const { verifyToken } = require("../middlewares/Auth");
const { BotController } = require("../controllers/BotController");

// const botRouter = Router();

const wsRouter = async (socket, message) => {
  console.log("incomming message", message.toString());
  const { event, ...rest } = JSON.parse(message.toString());
  // console.log("event type: ", event);
  if (event === "echo") {
    console.log("Event recieved: ", event);
    socket.send(JSON.stringify({ event: "echo", message: "hello" }));
  }
  if (event === "healthCheck") {
    console.log("Event recieved: ", event);
    await BotController.healthCheck(socket, rest);
    return;
    // socket.send(JSON.stringify({ event: "echo", message: "hello" }));
  }
  if (event === "register") {
    console.log("Event recieved: ", event);

    await BotController.register(socket, rest);
    return;
  }
  if (event === "connect") {
    console.log("Event recieved: ", event);

    await BotController.connect(socket, rest);
    return;
  }
  if (event === "disconnect") {
    console.log("Event recieved: ", event);

    await BotController.disconnect(socket, rest);
    return;
  }
  if (event === "remove") {
    console.log("Event recieved: ", event);

    await BotController.remove(socket, rest);
    return;
  }
};

module.exports = { wsRouter };
