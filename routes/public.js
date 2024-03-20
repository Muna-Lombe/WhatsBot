const { Router } = require("express");
const express = require("express");

const publicRouter = Router();

// public directory will be publicly available

publicRouter.get(
  "/",
  express.static("public"),
  require("serve-index")("public", { icons: true })
);

module.exports = { publicRouter };
