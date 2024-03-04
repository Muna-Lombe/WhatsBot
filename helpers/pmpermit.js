//jshint esversion:11
//jshint -W033
const fs = require("fs");
const path = require("path");
const database = require("../db");

/**
 * Inserts a new document into the "pmpermit" collection.
 * @param {string} id - The ID of the document to be inserted.
 * @returns {Promise<boolean>} - A promise that resolves to true if the document was inserted successfully, or false if an error occurred.
 */
async function insert(id) {
  let { conn, coll } = await database("pmpermit");
  try {
    await coll.create({ number: id, times: 1, permit: false });
    return true;
  } catch (error) {
    return false;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * Updates the violation count for a given ID in the "pmpermit" collection.
 * @param {string} id - The ID of the user.
 * @param {number} timesvio - The number of times the user has violated.
 * @returns {Promise<boolean>} - A promise that resolves to true if the update is successful, false otherwise.
 */
async function updateviolant(id, timesvio) {
  let { conn, coll } = await database("pmpermit");
  try {
    await coll.update({ number: id }, { $set: { times: timesvio } });
    return true;
  } catch (error) {
    return false;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * Reads the data for a given ID from the "pmpermit" collection in the database.
 * If the data exists and has a permit, it saves the cache for later usage.
 * @param {string} id - The ID to read the data for.
 * @returns {Promise<Object>}  - A Promise object containing the data for the ID.
 * If the data exists and has a permit, the object will have a "found" property set to true.
 * If the data does not exist or does not have a permit, the object will have a "found" property set to false.
 */
async function read(id) {
  let { conn, coll } = await database("pmpermit");
  try {
    let data = await coll.read({ number: id });
    if (data && data.permit) {
      // save the cache for later usage
      fs.writeFileSync(
        path.join(__dirname, `../cache/${id}.json`),
        JSON.stringify({ ...data, found: true })
      );
    }
    return data ? { ...data, found: true } : { found: false };
  } catch (error) {
    return { found: false };
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * Updates the permit status for a given ID in the database and writes the updated information to a cache file.
 * @param {string} id - The ID for which the permit status needs to be updated.
 * @returns {Boolean} - Returns true if the permit status was successfully updated, false otherwise.
 */

async function permit(id) {
  let { conn, coll } = await database("pmpermit");
  try {
    let { matchedCount } = await coll.update(
      { number: id },
      { $set: { times: 1, permit: true } }
    );
    if (!matchedCount)
      await coll.create({ number: id, times: 1, permit: true });
    fs.writeFileSync(
      path.join(__dirname, `../cache/${id}.json`),
      JSON.stringify({ found: true, number: id, times: 1, permit: true })
    );
    return true;
  } catch (error) {
    return false;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * Deletes the cache file for a given ID and updates the permit status to false in the database.
 * @param {string} id - The ID for which the cache file and permit status need to be deleted.
 * @returns {boolean} - Returns true if the cache file and permit status were successfully deleted, false otherwise.
 */
async function deleteCacheAndPermit(id) {
  let { conn, coll } = await database("pmpermit");
  try {
    await coll.update({ number: id }, { $set: { times: 1, permit: false } });
    try {
      fs.unlinkSync(`${__dirname}/../cache/${id}.json`);
      console.log(`Deleting cache file for: ${id}`);
    } catch (nofile) {}
    return true;
  } catch (error) {
    return false;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * Updates the permit status to false in the database and deletes the cache file for a given ID.
 * @param {string} id - The ID for which the permit status needs to be updated to false and the cache file needs to be deleted.
 * @returns {boolean} - Returns true if the permit status was successfully updated and the cache file was deleted, false otherwise.
 */
async function nopermit(id) {
  let { conn, coll } = await database("pmpermit");
  try {
    await coll.update({ number: id }, { $set: { times: 1, permit: false } });

    try {
      fs.unlinkSync(`${__dirname}/../cache/${id}.json`);
      console.log(`Deleting cache file for: ${id}`);
    } catch (nofile) {}

    return true;
  } catch (error) {
    return false;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * Handles the permit status for a given ID.
 * @param {string} id - The ID to check the permit status for.
 * @returns {Promise<Object>} - A Promise object containing the permit status, block status, and message.
 */
async function handler(id) {
  // first check for cache
  let checkPermit;
  try {
    checkPermit = JSON.parse(
      fs.readFileSync(path.join(__dirname, `../cache/${id}.json`), "utf8")
    );
  } catch (error) {
    checkPermit = await read(id);
  }

  if (!checkPermit.found) {
    await insert(id);
    return {
      permit: false,
      block: false,
      msg: `*✋ Wait*\n\n Please wait until I will get back to Online, Kindly don't send another message.\n\n _Powered by WhatsBot_`,
    };
  } else if (checkPermit.found && !checkPermit.permit) {
    if (checkPermit.times > 3) {
      return {
        permit: false,
        block: true,
        msg: `*❌ Blocked*\n\n You have been blocked for spamming.\n\n _Powered by WhatsBot_`,
      };
    } else {
      let updateIt = await updateviolant(id, checkPermit.times + 1);
      if (!updateIt) {
        console.log(
          `That's an error, Possible reason is your MongoDB url is not working ❌`
        );
      }
      return {
        permit: false,
        block: false,
        msg: `*✋ Wait*\n\nPlease wait until I will get back to Online, Kindly don't send another message. You have ${checkPermit.times} warning(s).\n\n _Powered by WhatsBot_`,
      };
    }
  } else {
    return { permit: true, block: false, msg: null };
  }
}

/**
 * Checks if a given ID has permit status.
 * @param {string} id - The ID to check the permit status for.
 * @returns {Promise<boolean>} - Returns true if the ID has permit status, false otherwise.
 */

async function isPermitted(id) {
  try {
    let checkPermit;
    try {
      checkPermit = JSON.parse(
        fs.readFileSync(path.join(__dirname, `../cache/${id}.json`), "utf8")
      );
    } catch (error) {
      checkPermit = await read(id);
    }
    return checkPermit.permit;
  } catch (e) {
    return true;
  }
}

module.exports = {
  handler,
  permit,
  nopermit,
  isPermitted,
};
