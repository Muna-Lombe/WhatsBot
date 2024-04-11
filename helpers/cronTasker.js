//jshint esversion:11
//jshint -W033
const fs = require("fs");
const path = require("path");
const database = require("../db");
const { crontasksDb } = require("../services");

/**
 * Inserts a new document into the "crontasks" collection.
 * @param {string} id - The ID of the document to be inserted.
 * @param {object} task - The cron task to be inserted.
 * @returns {Promise<boolean>} - A promise that resolves to true if the document was inserted successfully, or false if an error occurred.
 */
async function insert(id, task) {
  const { conn, coll } = await crontasksDb;
  try {
    console.log("inserting...", id, task);
    await coll.insert({ taskId: id, task: JSON.stringify(task) });
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
 * Updates the violation count for a given ID in the "crontasks" collection.
 * @param {string} id - The ID of the user.
 * @param {number} task - The number of times the user has violated.
 * @returns {Promise<boolean>} - A promise that resolves to true if the update is successful, false otherwise.
 */
async function update(id, task) {
  let { conn, coll } = await crontasksDb;
  try {
    await coll.update({ taskId: id }, { task: JSON.stringify(task) });
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
 * Reads the data for a given ID from the "crontasks" collection in the database.
 * If the data exists and has a permit, it saves the cache for later usage.
 * @param {string} id - The ID to read the data for.
 * @returns {Promise<Object>}  - A Promise object containing the data for the ID.
 * If the data exists and has a permit, the object will have a "found" property set to true.
 * If the data does not exist or does not have a permit, the object will have a "found" property set to false.
 */
async function read(id) {
  let { conn, coll } = await crontasksDb;
  try {
    let data = await coll.read({ taskId: id });
    if (data && data[0].task) {
      // save the cache for later usage
      fs.writeFileSync(
        path.join(__dirname, `../cache/${id}.json`),
        JSON.stringify({ ...data, found: true })
      );
    }
    return data ? { ...data[0], found: true } : { found: false };
  } catch (error) {
    return { found: false };
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
async function remove(id) {
  let { conn, coll } = await crontasksDb;
  try {
    await coll.delete({ taskId: id });
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

module.exports = {
  insert,
  read,
  update,
  remove,
};
