const { Router } = require("express");
const { publicRouter } = require("./public");
const { botRouter } = require("./bot");

const router = Router();

// routes

router.use("/public", publicRouter);
router.use("/api/bot", botRouter);

module.exports = { router };
