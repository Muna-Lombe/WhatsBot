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
async function insert(id, status, task) {
  const { conn, coll } = await crontasksDb;
  try {
    console.log("inserting...", id, task);
    await coll.insert({ taskId: id, status, task: JSON.stringify(task) });
    return true;
  } catch (error) {
    return false;
  } finally {
    if (conn) {
      console.log("state", await coll.read());

      // await conn.close();
    }
  }
}

/**
 * Updates the violation count for a given ID in the "crontasks" collection.
 * @param {Object} key - The key to find the task by.
 * @param {Object} update - The data to update.
 * @returns {Promise<boolean>} - A promise that resolves to true if the update is successful, false otherwise.
 */
async function update({ key, update }) {
  let { conn, coll } = await crontasksDb;
  try {
    await coll.update(key, update);
    return true;
  } catch (error) {
    return false;
  } finally {
    if (conn) {
      console.log("state", await coll.read());

      // await conn.close();
    }
  }
}

/**
 * Reads the data for a given ID from the "crontasks" collection in the database.
 * If the data exists and has a permit, it saves the cache for later usage.
 * @param {Object} id - The ID to read the data for.
 * @returns {Promise<Object>}  - A Promise object containing the data for the ID.
 * If the data exists and has a permit, the object will have a "found" property set to true.
 * If the data does not exist or does not have a permit, the object will have a "found" property set to false.
 */
async function read(id) {
  let { conn, coll } = await crontasksDb;
  const taskId = id ? { taskId: id } : null;
  try {
    let { data } = await coll.read(id || null);
    // console.log("data", data)
    if (data && data[0]?.task && id) {
      // save the cache for later usage
      fs.writeFileSync(
        path.join(__dirname, `../cache/${id}.json`),
        JSON.stringify({ datalist: data, found: true })
      );
    }
    return data
      ? {
          datalist: data?.length
            ? data.map((d) => ({ ...d, task: JSON.parse(d.task) }))
            : data,
          found: true,
        }
      : { found: false };
  } catch (error) {
    console.log("tasker error", error);
    return { found: false };
  } finally {
    if (conn) {
      console.log("state", coll.read());
      // await conn.cslose();
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
    const deleted = await coll.delete({ taskId: parseInt(id) });
    console.log("task deleted", deleted.data.changes);
    if (!deleted?.data?.changes) {
      throw "not deleted";
    }
    try {
      fs.unlinkSync(`${__dirname}/../cache/${id}.json`);
      console.log(`Deleting cache file for: ${id}`);
    } catch (nofile) {}
    return true;
  } catch (error) {
    return false;
  } finally {
    if (conn) {
      console.log("state", await coll.read());

      // await conn.close();
    }
  }
}

module.exports = {
  insert,
  read,
  update,
  remove,
};
