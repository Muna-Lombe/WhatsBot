//jshint esversion:11
const { MongoClient } = require("mongodb");
const { mongodb_url, redisdb_url } = require("../config");
const redis = require("redis");
const redisClient = redis.createClient();
const fs = require("fs");
const path = require("path");
const sqlite = require("sqlite3");

/**
 *
 * @param {*} collection the name if the collection in the database.
 * @returns '{conn,coll}' - An object with conn and coll properties.
 */
module.exports = async function (collection) {
  function getCollection(conn) {
    return {
      create: (data) => conn.create(data),
      read: (key) => conn.read(key),
      update: (key, value) => conn.update(key, value),
      delete: (key) => conn.delete(key),
    };
  }
  /**
   *
   * @returns '{conn,coll}' - An object with conn and coll properties.
   */
  async function connectToSqlite() {
    const sqliteClient = new SqliteConnection("whatsbot", collection);
    return {
      conn: sqliteClient,
      /**
       * @type {SqliteConnection}
       * @prop {function} create - Create a new record in the collection.
       * @prop {function} read - Read data from the collection.
       * @prop {function} update - Update a record in the collection.
       * @prop {function} delete - Delete a record from the collection.
       */
      coll: getCollection(fsClient),
    };
  }
  /**
   *
   * @returns '{conn,coll}' - An object with conn and coll properties.
   */
  async function connectToFS() {
    const fsClient = new FsConnection("whatsbot", collection);
    return {
      conn: fsClient,
      /**
       * @type {FsConnection}
       * @prop {function} create - Create a new record in the collection.
       * @prop {function} read - Read data from the collection.
       * @prop {function} update - Update a record in the collection.
       * @prop {function} delete - Delete a record from the collection.
       */
      coll: getCollection(fsClient),
    };
  }

  /**
   *
   * @returns '{conn,coll}' - An object with conn and coll properties.
   */
  async function connectToRedis() {
    // redisClient.on("error", (error) => {
    //   console.error("Redis error:", error);
    // });
    const redisClient = new RedisConnection("whatsbot", collection);
    return {
      conn: redisClient,
      /**
       * @type {RedisConnection}
       * @property {function} create - Create a new record in the collection.
       * @property {function} read - Read data from the collection.
       * @property {function} update - Update a record in the collection.
       * @property {function} delete - Delete a record from the collection.
       */
      coll: getCollection(redisClient),
    };
  }

  /**
   *
   * @returns '{conn,coll}' - An object with conn and coll properties.
   */
  async function connectToMongoDB() {
    try {
      // let conn = await MongoClient.connect(mongodb_url, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
      // });
      let conn = new MongoConnection(mongodb_url, "whatsbot", collection);
      return {
        conn,
        /**
         * @type {MongoCollection}
         * @property {function} create - Create a new record in the collection.
         * @property {function} read - Read data from the collection.
         * @property {function} update - Update a record in the collection.
         * @property {function} delete - Delete a record from the collection.
         */
        coll: conn.collection, //.db("whatsbot").collection(collection),
      };
    } catch (e) {
      return {};
    }
  }
  return connectToFS();
};

class RedisConnection {
  constructor(db_name, collection_name) {
    // Connect to a local Redis server
    this.client = redis.createClient({
      url: "redis://localhost:6380", // Example: Connect to a different port
    });
    this.db_name = db_name;
    this.collection = collection_name;

    this.client.on("connect", async () => {
      console.log("Connected to Redis");
      this.verifyCollection(this.collection);
      await this.client.set(this.collection, JSON.stringify([]));
    });
  }
  async connect() {
    this.client.connect();
  }
  async close() {
    this.client.disconnect();
  }

  /**
   * Create a new record in Redis.
   *
   * @param {jsonObject} value - The value to be associated with the key.
   */
  async create(value) {
    const { datalist } = await this.read();
    datalist.push(value);

    await this.client.set(this.collection, JSON.stringify(datalist));
  }

  /**
   * Read the value associated with a given key.
   *
   * @param {json} key - The key to read.
   * @returns {Promise<string>} - The value associated with the key.
   */
  async read(key) {
    const result = await this.client.get(this.collection);
    const data = JSON.parse(result);

    if (!key) return { datalist: data };
    let idx = 0;
    const value = data.filter((el, x) => el.number === key.number && (idx = x));
    return { data: value, datalist: data, idx };
  }

  /**
   * Update the value associated with a given key.
   *
   * @param {string} key - The key to update.
   * @param {string} value - The new value to set.
   * @example await db.update('my-key', 'new-value')
   */
  async update(key, value) {
    const { data, datalist, idx } = await this.read(key);

    const updatedData = { ...value, ...data };
    datalist[idx] = updatedData;

    await this.client.set(this.collection, JSON.stringify(datalist));
  }

  /**
   * Delete one or more keys from Redis.
   *
   * @param {...string} keys - Variable number of keys to delete.
   * @returns {Promise<number>} - Number of keys deleted.
   */
  async delete(...keys) {
    // const { data, datalist, idx } = await this.read(keys)

    await this.client.del(keys);
  }

  /**
   * Check if a key exists in Redis.
   *
   * @param {string} key - The key to check.
   * @returns {Promise<boolean>} - True if the key exists, false otherwise.
   * @example const exists = await db.exists('my-key')
   *
   */
  async exists(key = this.collection) {
    return await this.client.exists(key);
  }

  /**
   * Verify a collection.
   *
   * @param {string} key - The key to check.
   * @returns {Promise<boolean>} - True if the key exists, false otherwise.
   */
  async verifyCollection(key) {
    for (let index = 0; index < this.client.dbSize + 1; index++) {
      const has = await this.client.exists(key + ":" + index);
      if (has) {
        this.collection = await this.client.get(key + ":" + index);
        // return true
        break;
      }
    }

    return this.collection.includes(":") ? "" : (this.collection = `${key}:1`);
  }
}

class MongoConnection {
  constructor(mongodb_url, db_name, collection_name) {
    this.mongodb_url = mongodb_url;
    this.db_name = db_name;
    this.collection_name = collection_name;
    this.client = null;
    this.collection = null;
  }

  async connect() {
    try {
      this.client = await MongoClient.connect(this.mongodb_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      this.collection = this.client
        .db(this.db_name)
        .collection(this.collection_name);
      return { conn: this.client, coll: this.collection };
    } catch (e) {
      console.error(`Error connecting to MongoDB: ${e}`);
      return {};
    }
  }

  close() {
    if (this.client) {
      this.client.close();
    }
  }

  create(value) {
    if (this.collection) {
      this.collection.insertOne(value);
    }
  }

  read(key) {
    if (this.collection) {
      return this.collection.findOne(key);
    }
    return null;
  }

  update(key, value) {
    if (this.collection) {
      this.collection.updateOne(key, {
        $set: { [Object.keys(value)[0]]: value },
      });
    }
  }

  delete(key) {
    if (this.collection) {
      this.collection.deleteOne({ key });
    }
  }

  exists(key) {
    if (this.collection) {
      return this.collection.countDocuments({ key }) > 0;
    }
    return false;
  }
}

/**
 * A class for filesystem-based data storage using JSON files.
 *
 * @param {string} db_name - The name of the database.
 */
class FsConnection {
  #collection;
  #db_name;

  constructor(db_name, collection_name) {
    this.#db_name = db_name;
    this.#collection = collection_name;

    // initialze
    if (!fs.existsSync(this.#_get_file_path(collection_name))) {
      fs.writeFileSync(
        this.#_get_file_path(collection_name),
        JSON.stringify([])
      );
    }
  }

  /**
   * Get the file path for a collection.
   *
   * @param {string} collection_name - The name of the collection.
   * @returns {string} The file path.
   */
  #_get_file_path(collection_name = this.#collection) {
    const basepath =
      "/home/muna/code/Muna-Lombe/tutorials/javascript/console-apps/whatsapp/using_puppeteer/WhatsBot/db/persisted";

    return path.join(basepath, `/${this.#db_name}_${collection_name}.json`);
  }

  close() {
    // return fs.close();
  }

  /**
   * Create a new record in the collection.
   *
   * @param {string} key - The key to set to.
   * @param {object} data - The data to be stored.
   * @returns {void}
   */
  create(data) {
    console.log("log this data", data);
    const file_path = this.#_get_file_path();
    const { datalist } = this.read();
    data.id ||= datalist.length + 1;
    datalist.push(data);
    console.log("log this datalist", datalist);

    fs.writeFileSync(file_path, JSON.stringify(datalist));
  }

  /**
   * Read data from the collection.
   *
   * @param {string} key - The key to read.
   * @returns {json} The list of records.
   */
  read(key) {
    const file_path = this.#_get_file_path();
    try {
      const datalist = JSON.parse(fs.readFileSync(file_path, "utf8"));
      console.log("reading datalist", datalist);
      if (!key) return { datalist };

      let idx;
      const marker = Object.keys(key)[0];

      const data = datalist.filter((el, x) => {
        idx = x;
        return el[marker] === key[marker];
      });

      return { data, datalist, idx };
    } catch (error) {
      console.log("error", error);
      return [];
    }
  }

  /**
   * Update a record in the collection.
   *
   * @param {object} - The key to update.
   * @param {object} - The new value to set.
   * @returns {void}
   */
  update(key, value) {
    const file_path = this.#_get_file_path();
    const { data, datalist, idx } = this.read(key);
    const updated_data = {
      ...data,
      ...value,
    };
    datalist[idx] = updated_data;
    fs.writeFileSync(file_path, JSON.stringify(datalist));
  }

  /**
   * Delete a record from the collection.
   *
   * @param {string} collection_name - The name of the collection.
   * @param {object} key - The key to find the record to delete.
   * @returns {void}
   */
  delete(key) {
    const file_path = this.#_get_file_path(this.#collection);
    const { datalist: existing_data } = this.read(this.#collection);
    const marker = Object.keys(key)[0];
    const updated_data = existing_data.filter(
      (item) => item[marker] !== key[marker]
    );

    fs.writeFileSync(file_path, JSON.stringify(updated_data));
    // fs.unlinkSync(file_path);
  }
}

/**
 * A class for sqlite3-based data storage.
 *
 * @param {string} db_name - The name of the database.
 * @param {string} collection_name - The name of the table.
 */
class SqliteConnection {
  #collection;
  #db_name;

  constructor(db_name, collection_name) {
    this.#db_name = db_name;
    this.#collection = collection_name;

    // initialze sqlitedb
    this.db = new sqlite.Database(
      this.#_get_file_path(),
      sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE,
      (err) => {
        if (err) {
          console.error(err.message);
        }
        console.log("Connected to the SQLite database.");
      }
    );
  }

  /**
   * Get the file path for a collection.
   *
   * @param {string} collection_name - The name of the collection.
   * @returns {string} The file path.
   */
  #_get_file_path(collection_name = this.#collection) {
    const basepath =
      "/home/muna/code/Muna-Lombe/tutorials/javascript/console-apps/whatsapp/using_puppeteer/WhatsBot/db/persisted";

    return path.join(basepath, `/${this.#db_name}_${collection_name}.json`);
  }

  close() {
    // return fs.close();
    return this.db.close();
  }

  /**
   * Create a new record in the collection.
   *
   * @param {string} key - The key to set to.
   * @param {object} data - The data to be stored.
   * @returns {void}
   */
  create(data) {
    this.db.serialize(() => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS ${
          this.#collection
        } (id INTEGER PRIMARY KEY, name TEXT, number TEXT)`
      );
      this.db.run(
        `INSERT INTO ${this.#collection} (name, number) VALUES (?, ?)`,
        [data.name, data.number],
        function (err) {
          if (err) {
            return console.log(err.message);
          }
          // get the last insert id
          console.log(`A row has been inserted with rowid ${this.lastID}`);
        }
      );
    });
  }

  /**
   * Read data from the collection.
   *
   * @param {string} key - The key to read.
   * @returns {json} The list of records.
   */
  read(key) {
    this.db.serialize(() => {
      this.db.each(
        `SELECT id, name, number FROM ${this.#collection}`,
        (err, row) => {
          if (err) {
            console.error(err.message);
          }
          console.log(row.id + "\t" + row.name + "\t" + row.number);
        }
      );
    });
  }

  /**
   * Update a record in the collection.
   *
   * @param {object} - The key to update.
   * @param {object} - The new value to set.
   * @returns {void}
   */
  update(key, value) {
    this.db.serialize(() => {
      this.db.run(
        `UPDATE ${this.#collection} SET name = ? WHERE id = ?`,
        [value.name, key.id],
        function (err) {
          if (err) {
            return console.error(err.message);
          }
          console.log(`Row(s) updated: ${this.changes}`);
        }
      );
    });
  }

  /**
   * Delete a record from the collection.
   *
   * @param {string} collection_name - The name of the collection.
   * @param {object} key - The key to find the record to delete.
   * @returns {void}
   */
  delete(key) {
    this.db.serialize(() => {
      this.db.run(
        `DELETE FROM ${this.#collection} WHERE id = ?`,
        [key.id],
        function (err) {
          if (err) {
            return console.error(err.message);
          }
          console.log(`Row(s) deleted ${this.changes}`);
        }
      );
    });
  }
}
