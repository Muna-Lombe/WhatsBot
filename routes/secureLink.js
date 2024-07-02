const { Router } = require("express");
const fs = require("fs");

const secureLinkRouter = Router();

secureLinkRouter.get(
  "/qrAuth/:user/:id.:imageType",
  (req, res, next) => next(),
  (req, res) => {
    const { user, id, imageType } = req.params;
    const basepath = process.cwd();
    console.log("params", req.params, basepath);
    if (
      !fs.existsSync(`${basepath}/session/qrAuth/${user}/${id}.${imageType}`)
    ) {
      res.status(404).json({
        error: "Nothing Here",
      });
      return;
    }
    try {
      res.sendFile(
        `${basepath}/session/qrAuth/${user}/${id}.${imageType}`,
        (err) => {
          console.log("err", err);
          if (err) {
            res.status(500).json({
              error: "something wrong backstage",
            });
          }
        }
      );
    } catch (error) {
      console.log("error", error);
    }
  }
);

module.exports = { secureLinkRouter };
