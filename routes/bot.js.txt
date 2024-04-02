const { Router } = require("express");
const express = require("express");
const { BotService } = require("../services/BotService");
const { BotController } = require("../controllers/BotController");

const botRouter = Router();

// public directory will be publicly available

botRouter.post(
  "/register",
  (req, res, next) => {
    console.log("post regitersing...");
    return next();
  },
  BotController.register
);

botRouter.post(
  "/connect",
  (req, res, next) => {
    return next();
  },
  BotController.connect
);
botRouter.post(
  "/disconnect",
  (req, res, next) => {
    return next();
  },
  BotController.disconnect
);

module.exports = { botRouter };
