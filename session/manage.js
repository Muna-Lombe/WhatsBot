const fs = require("fs");
const AdmZip = require("adm-zip");
const {
  createEncryptStream,
  setPassword,
  createDecryptStream,
} = require("aes-encrypt-stream");
const crypto = require("crypto");
const config = require("../config");
const axios = require("axios");
const { sleep } = require("../helpers/genUtils");
require("dotenv").config();
const path = require("path");
const { botsDb } = require("../services");

let base = `${__dirname}/../.wwebjs_auth/`;

let excludedDir = [
  "session-whatsbot/Default/Cache",
  "session-whatsbot/Default/Code Cache",
  "session-whatsbot/Default/Code Storage",
  "session-whatsbot/Default/blob_storage",
  "session-whatsbot/Default/Service Worker",
];

const managementFunctions = {
  clean: function clean(botId) {
    try {
      // delete dir if exists
      console.log("cleaning stored bot client configurations...");
      if (fs.existsSync(`${_base}${botId ? "session-" + botId : ""}`)) {
        fs.rmSync(`${base}${botId ? "session-" + botId : ""}`, {
          recursive: true,
        });
        console.log("stored bot client configurations cleaned..!");
      }

      console.log("cleaning qrAuth  directory...");
      if (
        fs.existsSync(`${__dirname}/../session/qrAuth/${botId ? botId : ""}`)
      ) {
        fs.readdirSync(
          `${__dirname}/../session/qrAuth/${botId ? botId : ""}`
        ).forEach((fileDir) => {
          fs.rmSync(
            path.join(__dirname, `/qrAuth/${botId ? botId : ""}/${fileDir}`),
            { recursive: true, force: true }
          );
        });
        console.log("qrAuth  directory cleaned");
      }
      if (!botId && commandInput && commandInput.lastCommand) {
        const commandInput = JSON.parse(
          fs.readFileSync(`${__dirname}/../cache/commandInput.json`)
        );
        console.log("cleaning :", commandInput);

        fs.writeFileSync(
          `${__dirname}/../cache/commandInput.json`,
          JSON.stringify({
            lastCommand: "",
            store: {},
          })
        );
      }
      console.log("All client configs cleaned...!");
    } catch (_) {}
  },
  write: async function write(password, botToken) {
    excludedDir.forEach((dir) => {
      try {
        fs.rmSync(`${base}${dir}/`, { recursive: true });
      } catch (_) {}
    });
    const zip = new AdmZip();
    zip.addLocalFolder(base);
    await zip.writeZipPromise(`${__dirname}/temp.zip`);
    setPassword(getCipherKey(password));
    await new Promise((resolve) => {
      createEncryptStream(fs.createReadStream(`${__dirname}/temp.zip`))
        .pipe(
          fs.createWriteStream(`${__dirname}/../${botToken}_session.secure`)
        )
        .on("finish", () => {
          resolve();
        });
    });
    fs.unlinkSync(`${__dirname}/temp.zip`);
  },
  replicate: async function replicate(botId, botToken, _retries = 0) {
    try {
      setPassword(getCipherKey(botId || config.session_key));
      // console.log("dirname:",__dirname);
      fs.appendFileSync(`${__dirname}/temp.zip`, ""); //,()=>{console.log("file created")});

      if (!fs.existsSync(`${__dirname}/temp.zip`)) {
        throw `${__dirname}/temp.zip not found`;
      } else {
        console.log(
          "temp.zip found, \ncreating stream for " +
            `${__dirname}/../${botToken}_session.secure`
        );
      }

      await new Promise((resolve, reject) => {
        try {
          fs.createReadStream(`${__dirname}/../${botToken}_session.secure`)
            .on("error", (error) => {
              console.log("error creating... file must not exist");
              console.log("deleting token entry in database...");
              botsDb.then(({ coll, conn }) => coll.delete({ botId: botId }));
              console.log(
                "Exception Caught: removed token for deleted session"
              );

              throw new Error("session deleted");
              // return;
            })
            .pipe(
              createDecryptStream(fs.createWriteStream(`${__dirname}/temp.zip`))
            )
            .on("finish", () => {
              // console.log("resolving...")
              // console.log("resolved!")
              // const zipfile = new AdmZip(`${__dirname}/temp.zip`);

              // let delay = 0
              // while (delay < 1000) {
              //   delay++
              // }

              resolve();
            });
        } catch (error) {
          // console.log(error.toString())
          // throw error
          reject(error.toString());
        }
      })
        .then(async (res) => {
          // let timeoutCounter = 0;
          // while (timeoutCounter < (2000+_retries)) {
          //   timeoutCounter++
          // }
          // setTimeout(() => {

          await sleep(2000);
          console.log("unziping...");
          let unzip = new AdmZip(`${__dirname}/temp.zip`); //new AdmZip(fs.readFileSync(`${__dirname}/temp.zip`));
          unzip.extractAllToAsync(base, true, false, (err) => {
            if (err) {
              console.log("error caught:", err);
            }
          });
          // }, 5000);
        })
        .catch((err) => {
          console.log("error caught:", err);

          throw err;
        })
        .finally(() => {
          // console.log("finally block");
          try {
            console.log("unlinking...");
            fs.unlinkSync(`${__dirname}/temp.zip`);
          } catch (_) {}
        });
      return { data: { message: "ok" } };
      // console.log("Session files replicated");
    } catch (error) {
      console.log(
        "error caught:",
        `Session file not found, corrupted or password not matched. ${error.toString()}`
      );
      if (error.toString() === "session deleted") {
        return { error: { message: "session deleted" } };
      }
      if (_retries < 10000) {
        console.log("retrying...");
        await replicate(botId, botToken, _retries + 1000);
      } else {
        console.log("retries limit reached!..");
        // throw new Error(`last caught error: ${error.toString()}`);
        return { error: { message: "retry timedout!" } };
      }
    }
  },
  fetchSession: async function fetchSession(botId, botToken) {
    try {
      if (process.env.SESSION_URL) {
        let response = await axios.get(process.env.SESSION_URL, {
          responseType: "arraybuffer",
        });
        fs.writeFileSync(
          `${__dirname}/../${botToken}_session.secure`,
          response.data,
          {
            encoding: "binary",
          }
        );
        console.log("Session file fetched from", process.env.SESSION_URL);
      } else {
        console.log("Using local session");
      }
      return { data: { message: "ok" } };
    } catch (error) {
      throw new Error(
        `Session fetching failed. If you are using Local machine or VPS please remove 'SESSION_URL' from Enviroment Variable. ${error.toString()}`
      );
    }
  },
  deleteAllFilesInDir: async function (dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
          fs.rmSync(path.join(dirPath, file));
        });
      } else {
        throw new Error(
          "Folder does not exist, maybe there is an error is folder name."
        );
      }
    } catch (error) {
      console.log(error.toString());
      return;
      // console.log(error)
    }
  },
  cleanState: async function (botId) {
    try {
      console.log("resetting app state...");
      //clean client configs
      const _this = managementFunctions;
      _this.clean(botId);

      const { coll, conn } = await botsDb;

      const { data: bots } = botId
        ? await coll.read({ botId: botId })
        : await coll.read();

      //remove local session file and db entry
      bots.map((bot) => {
        // remove db entry
        coll.delete({ botId: bot.botId });

        // remove local session file
        const filePath = path.join(
          __dirname,
          "../" + bot.botId.split("_")[2] + "_session.secure"
        );
        if (fs.existsSync(filePath)) {
          fs.rmSync(filePath);
        }
      });

      console.log("local session files removed...!");

      console.log("app state reset...!");
    } catch (error) {
      console.log("resetting not completed...!");
      console.log(error);
    }
  },
};

module.exports = {
  ...managementFunctions,
};

function getCipherKey(password) {
  return crypto.createHash("sha256").update(password).digest();
}
