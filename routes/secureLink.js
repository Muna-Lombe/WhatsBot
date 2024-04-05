const { Router } = require("express");
const secureLinkRouter = Router();

secureLinkRouter.get(
  "/",
  express.static("public"),
  require("serve-index")("public", { icons: true })
);

module.exports = { secureLinkRouter };
