const { Router } = require("express");
const { publicRouter } = require("./publicRoute");
const { botRouter } = require("./botRoute.js");
const { secureLinkRouter } = require("./secureLinkRoute");

const router = Router();

// routes

router.use("/public", publicRouter);
router.use("/securelink", secureLinkRouter);

module.exports = { router };
