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
require("dotenv").config();

let base = `${__dirname}/../.wwebjs_auth/`;

let excludedDir = [
  "session-whatsbot/Default/Cache",
  "session-whatsbot/Default/Code Cache",
  "session-whatsbot/Default/Code Storage",
  "session-whatsbot/Default/blob_storage",
  "session-whatsbot/Default/Service Worker",
];

module.exports = {
  clean: function clean() {
    try {
      // delete dir if exists
      if (fs.existsSync(`${__dirname}/../.wwebjs_auth`)) {
        fs.rmSync(`${__dirname}/../.wwebjs_auth`, { recursive: true });
        console.log("Session directory cleaned");
      }
      const commandInput = JSON.parse(
        fs.readFileSync(`${__dirname}/../cache/commandInput.json`)
      );
      console.log("cleaning :", commandInput);
      if (commandInput && commandInput.lastCommand) {
        fs.writeFileSync(
          `${__dirname}/../cache/commandInput.json`,
          JSON.stringify({})
        );
      }
    } catch (_) {}
  },
  write: async function write(password, userId) {
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
        .pipe(fs.createWriteStream(`${__dirname}/../${userId}_session.secure`))
        .on("finish", () => {
          resolve();
        });
    });
    fs.unlinkSync(`${__dirname}/temp.zip`);
  },
  replicate: async function replicate(userId) {
    try {
      setPassword(getCipherKey(config.session_key));
      // console.log("dirname:",__dirname);
      fs.appendFileSync(`${__dirname}/temp.zip`, ""); //,()=>{console.log("file created")});

      await new Promise((resolve) => {
        fs.createReadStream(`${__dirname}/../${userId}_session.secure`)
          .pipe(
            createDecryptStream(fs.createWriteStream(`${__dirname}/temp.zip`))
          )
          .on("finish", () => {
            // console.log("resolving...")
            // console.log("resolved!")
            // const zipfile = new AdmZip(`${__dirname}/temp.zip`);
            setTimeout(() => {
              let unzip = new AdmZip(`${__dirname}/temp.zip`); //new AdmZip(fs.readFileSync(`${__dirname}/temp.zip`));
              unzip.extractAllToAsync(base, true, false, (err) => {
                if (err) {
                  console.log("error caught:", err);
                }
              });
            }, 1000);
            resolve();
          });
      });

      // console.log("Session files replicated");
    } catch (error) {
      throw new Error(
        `Session file not found, corrupted or password not matched. ${error.toString()}`
      );
    } finally {
      try {
        fs.unlinkSync(`${__dirname}/temp.zip`);
      } catch (_) {}
    }
  },
  fetchSession: async function fetchSession(userId) {
    try {
      if (process.env.SESSION_URL) {
        let response = await axios.get(process.env.SESSION_URL, {
          responseType: "arraybuffer",
        });
        fs.writeFileSync(
          `${__dirname}/../${userId}_session.secure`,
          response.data,
          {
            encoding: "binary",
          }
        );
        console.log("Session file fetched from", process.env.SESSION_URL);
      } else {
        console.log("Using local session");
      }
    } catch (error) {
      throw new Error(
        `Session fetching failed. If you are using Local machine or VPS please remove 'SESSION_URL' from Enviroment Variable. ${error.toString()}`
      );
    }
  },
};

function getCipherKey(password) {
  return crypto.createHash("sha256").update(password).digest();
}
