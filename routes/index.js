const { Router } = require("express");
const { publicRouter } = require("./public");
const { botRouter } = require("./bot");
const { secureLinkRouter } = require("./secureLink");

const router = Router();

// routes

router.use("/public", publicRouter);
router.use("/securelink", botRouter);

module.exports = { router };
