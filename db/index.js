//jshint esversion:11
const { MongoClient } = require("mongodb");
const { mongodb_url, redisdb_url } = require("../config");
const redis = require("redis");
const redisClient = redis.createClient();
const fs = require("fs");
const path = require("path");
const sqlite = require("sqlite3");
const { ServerApiVersion } = require("mongodb");
const { specialChars } = require("../helpers/dataParsers");

/**
 *
 * @param {*} collection the name if the collection in the database.
 * @returns '{conn,coll}' - An object with conn and coll properties.
 */
module.exports = async function (collection) {
  function getCollection(conn) {
    return {
      create: (data) => conn.create(data),
      insert: (data) => conn.insert(data),
      read: (key) => conn.read(key),
      upsert: (key, value) => conn.upsert(key, value),
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
    await sqliteClient.connect();
    return {
      conn: sqliteClient,
      /**
       * @type {SqliteConnection}
       * @prop {function} create - Create a new record in the collection.
       * @prop {function} read - Read data from the collection.
       * @prop {function} upsert - Update or insert a record in the collection.
       * @prop {function} update - Update a record in the collection.
       * @prop {function} delete - Delete a record from the collection.
       */
      coll: getCollection(sqliteClient),
    };
  }
  /**
   *
   * @returns '{conn,coll}' - An object with conn and coll properties.
   */
  async function connectToFS() {
    const fsClient = new FsConnection("whatsbot", collection);
    await fsClient.connect();
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
    await redisClient.connect();
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
      const mongoClient = new MongoConnection(
        mongodb_url,
        "whatsbot",
        collection
      );
      await mongoClient.connect();

      return {
        conn: mongoClient,
        /**
         * @type {MongoConnection}
         * @property {function} create - Create a new record in the collection.
         * @property {function} read - Read data from the collection.
         * @property {function} update - Update a record in the collection.
         * @property {function} delete - Delete a record from the collection.
         */
        coll: getCollection(mongoClient), //.db("whatsbot").collection(collection),
      };
    } catch (e) {
      return {};
    }
  }
  return await connectToSqlite();
};

class RedisConnection {
  #schema;
  #validate;
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
   * Create a new record in the collection.
   * @param {object} data - The data to be stored.
   * @returns {void}
   */
  async create(data) {
    this.#schema = Object.entries(data)
      .map(([k, v], x) => k + " " + v.toUpperCase())
      .join(",");
    this.#validate = (data) => {
      return Object.keys(data).every((key) => {
        return this.#schema.includes(key);
      });
    };
  }

  /**
   * Create a new record in Redis.
   *
   * @param {jsonObject} value - The value to be associated with the key.
   */
  async insert(value) {
    if (!this.#validate(value)) throw new Error("Invalid data");

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
  #schema;
  #validate;
  constructor(mongodb_url, db_name, collection_name) {
    this.mongodb_url = mongodb_url;
    this.db_name = db_name;
    this.collection_name = collection_name;
    this.client = null;
    this.collection = null;

    this.client = new MongoClient(this.mongodb_url, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  async connect() {
    try {
      await this.client.connect();
      this.collection = this.client
        .db(this.db_name)
        .collection(this.collection_name);
      console.log("connected...", this.collection.dbName);
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

  /**
   * Create a new record in the collection.
   * @param {object} data - The data to be stored.
   * @returns {void}
   */
  async create(data) {
    this.#schema = Object.entries(data)
      .map(([k, v], x) => k + " " + v.toUpperCase())
      .join(",");
    this.#validate = (data) => {
      return Object.keys(data).every((key) => {
        return this.#schema.includes(key);
      });
    };
  }
  /**
   * Inserts a record into the collection.
   * @param {Object} data
   * @returns {Promise}
   */
  insert(data) {
    if (!this.#validate(data)) throw new Error("Invalid data");

    if (this.collection) {
      console.log("create document...", data);
      return this.collection.insertOne(data);
    }
    return null;
  }

  read(key) {
    if (this.collection) {
      console.log("reading document...", key);

      return this.collection.findOne(key).then((res) => ({ data: [res] }));
    }
    return null;
  }

  update(key, value) {
    if (this.collection) {
      console.log("updating document...", key, value);

      return this.collection.updateOne(key, {
        $set: { [Object.keys(value)[0]]: value },
      });
    }
    return null;
  }

  delete(key) {
    if (this.collection) {
      console.log("deleting document...", key);

      return this.collection.deleteOne({ key });
    }
    return null;
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
  #schema;
  #validate;

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
  async connect() {
    try {
      if (!fs.existsSync(this.#_get_file_path(collection_name))) {
        fs.writeFileSync(
          this.#_get_file_path(collection_name),
          JSON.stringify([])
        );
      }
      console.log("connected...", this.#db_name);
    } catch (e) {
      console.error(`Error connecting to MongoDB: ${e}`);
      return {};
    }
  }

  close() {
    // return fs.close();
  }

  /**
   * Create a new record in the collection.
   * @param {object} data - The data to be stored.
   * @returns {void}
   */
  async create(data) {
    this.#schema = Object.entries(data)
      .map(([k, v], x) => k + " " + v.toUpperCase())
      .join(",");
    this.#validate = (data) => {
      return Object.keys(data).every((key) => {
        return this.#schema.includes(key);
      });
    };
  }
  /**
   * Inserts a record into the collection.
   * @param {Object} data
   * @returns {Promise}
   */
  async insert(data) {
    if (!this.#validate(data)) throw new Error("Invalid data");
    const file_path = this.#_get_file_path();
    const { datalist } = this.read();
    data.id ||= datalist.length + 1;
    datalist.push(data);

    fs.writeFileSync(file_path, JSON.stringify(datalist));
    return data;
  }

  /**
   * Read data from the collection.
   *
   * @param {string} key - The key to read.
   * @returns {json} The list of records.
   */
  async read(key) {
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
  async update(key, value) {
    const file_path = this.#_get_file_path();
    const { data, datalist, idx } = this.read(key);
    const updated_data = {
      ...data,
      ...value,
    };
    datalist[idx] = updated_data;
    fs.writeFileSync(file_path, JSON.stringify(datalist));
    return value;
  }

  /**
   * Delete a record from the collection.
   *
   * @param {string} collection_name - The name of the collection.
   * @param {object} key - The key to find the record to delete.
   * @returns {void}
   */
  async delete(key) {
    const file_path = this.#_get_file_path(this.#collection);
    const { datalist: existing_data } = this.read(this.#collection);
    const marker = Object.keys(key)[0];
    const updated_data = existing_data.filter(
      (item) => item[marker] !== key[marker]
    );

    fs.writeFileSync(file_path, JSON.stringify(updated_data));
    return key;
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
    this.db = null;

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

    this.db.create = function (data) {
      var that = this;

      data = specialChars.serialize(data);
      const schema = Object.entries(data)
        .map(([k, v], x) => k + " " + v.toUpperCase())
        .join(",");

      that.run(
        `CREATE TABLE IF NOT EXISTS ${collection_name} (id INTEGER PRIMARY KEY,${schema})`
      );
      return new Promise(function (resolve, reject) {
        that.all(
          "SELECT * FROM sqlite_master WHERE type='table' AND name=?",
          [collection_name],
          function (error, rows) {
            if (error) reject(error);
            else resolve({ data: rows });
          }
        );
      });
    };
    this.db.insert = function (data) {
      var that = this;

      data = specialChars.serialize(data);
      return new Promise(function (resolve, reject) {
        that.run(
          `INSERT INTO ${collection_name} (${Object.keys(data).join(
            ","
          )}) VALUES (${Object.values(data)
            .map((v) => "?")
            .join(",")})`,
          [...Object.values(data)],
          function (err) {
            var localThis = this;
            if (err) {
              reject(err);
            }
            resolve({
              data: specialChars.deserialize({
                id: localThis?.lastID || 1,
                ...data,
              }),
            });
          }
        );
      });
    };

    this.db.query = function (sql, params) {
      var that = this;
      params = specialChars.serialize(params);

      return new Promise(function (resolve, reject) {
        that.all(sql, params, function (error, rows) {
          if (error) reject(error);
          else {
            rows = specialChars.deserialize(rows);
            // console.log("rows", rows);
            resolve({ data: rows });
          }
        });
      });
    };
    this.db.upsert = function (sql, params) {
      var that = this;
      params = specialChars.serialize(params);

      return new Promise(function (resolve, reject) {
        that.run(sql, params, function (error) {
          if (error) reject(error);
          else resolve({ data: this.get(this.lastID, (err, row) => {}) });
        });
      });
    };
    this.db.update = function (sql, params) {
      var that = this;
      params = specialChars.serialize(params);

      return new Promise(function (resolve, reject) {
        that.run(sql, params, function (error) {
          if (error) reject(error);
          else resolve({ data: this.get(this.lastID, (err, row) => {}) });
        });
      });
    };
    this.db.delete = function (sql, params) {
      var that = this;

      console.log("params", params);
      return new Promise(function (resolve, reject) {
        that.run(sql, params, function (error) {
          if (error) reject(error);
          else resolve({ data: { changes: this.changes } });
        });
      });
    };
  }

  /**
   * Get the file path for a collection.
   *
   * @param {string} collection_name - The name of the collection.
   * @returns {string} The file path.
   */
  #_get_file_path(collection_name = this.#collection) {
    const basepath = __dirname;

    return path.join(basepath, `/persisted/${this.#db_name}.db`);
  }

  async connect() {
    // return fs.close();
    await this.db.wait(() => {});
  }
  async close() {
    await this.db.close(() => {});
  }
  /**
   * Create a schema the collection.
   * @param {object} data - The data to be stored.
   * @returns {Promise<void>}
   */
  async create(schema) {
    // this.db.serialize(() => {
    // this.db.run(
    //   `CREATE TABLE IF NOT EXISTS ${this.#collection} (id INTEGER PRIMARY KEY, userId TEXT, hashedPassWord TEXT, phoneNumberId TEXT, timestamp TEXT)`
    // );
    return this.db.create(schema);
  }
  /**
   * Inserts a record into the collection.
   * @param {Promise<object>} data - The data to insert into a new record.
   * @returns {Promise<object>} {data} - An object of the new record.
   */
  async insert(data) {
    return this.db.insert(data);
    // return this.db.run(
    //   `INSERT INTO ${this.#collection} (userId, hashedPassWord, timestamp) VALUES (?, ?, ?)`,
    //   [data.userId, data.hashedPassWord, data.timestamp],
    //   function (err) {
    //     if (err) {
    //       return console.log(err.message);
    //     }
    //     // get the last insert id
    //     console.log(`A row has been inserted with rowid ${that.lastID}`);
    //     return this.get(this.lastID, (err, row)=>{})
    //   }
    // );
    // });
  }

  /**
   * Read data from the collection.
   *
   * @param key {string} key - The key to read.
   * @returns {Promise<object>} {data[]} An array of records.
   */
  async read(key) {
    const queryOne = [
      `SELECT * FROM ${this.#collection}${
        key ? " WHERE " + Object.keys(key)[0] + "= ?" : ""
      }`,
      key ? [Object.values(key || {})[0]] : [],
    ];
    const queryAll = `SELECT * FROM ${this.#collection}`;

    // console.log("query", key, queryOne, queryAll);
    const result = key
      ? await this.db.query(queryOne[0], queryOne[1])
      : await this.db.query(queryAll);
    // const result =
    //   // this.db.serialize(() => {
    //   this.db.query(
    //     `SELECT * FROM ${this.#collection} WHERE ${Object.keys(key)[0]} = ?`,
    //     [Object.values(key)[0]]
    //   )
    // console.log('key', result)
    return result;
  }
  /**
   * Upsert a record in the collection.
   *
   * @param key {object} - The key to upsert.
   * @param value {object} - The new value to set.
   * @returns {Promise<object>} - {data} - The data of the upserted record.
   */
  async upsert(key, value) {
    const upserted = {};
    const upsertOne = [
      `UPDATE SET ${Object.keys(value)[0]} = ? 
        WHERE id = ?
        VALUES('Alice','704-555-1212','2018-05-08')
        ON CONFLICT(name) 
        DO INSERT INTO ${this.#collection} (${Object.keys(value)[0]}) 
        VALUES (?)`,
      [
        // `UPDATE IIF(EXISTS(SELECT 1 FROM ${this.#collection} WHERE id = ?), ${this.#collection} SET ${Object.keys(value)[0]} = ? WHERE id = ?, INSERT INTO ${this.#collection} (userId) VALUES (?)) `,
        // `INSERT INTO ${this.#collection} (userId) VALUES (?)`,
        (Object.values(value)[0], key?.id),
      ],
    ];
    const upsertAll = [
      `UPDATE IIF(EXISTS(SELECT 1 FROM ${this.#collection}), ${
        this.#collection
      } SET ${Object.keys(value)[0]} = ? WHERE id = ?, INSERT INTO ${
        this.#collection
      } (userId) VALUES (?)) `,
      `INSERT INTO ${this.#collection} (userId) VALUES (?)`,
      [Object.values(value)[0]],
    ];

    // this.db.serialize(() => {
    return key
      ? await this.db.upsert(upsertOne[0], upsertOne[1])
      : await this.db.upsert(upsertAll[0], upsertAll[1]);
  }
  /**
   * Update a record in the collection.
   *
   * @param key {object} - The key to update.
   * @param value {object} - The new value to set.
   * @returns {Promise<object>} - {data} - The data of the updated record.
   */
  async update(key, value) {
    const updated = {};

    const updateOne = [
      `UPDATE ${this.#collection} SET ${Object.keys(value)[0]} = ? WHERE ${
        Object.keys(key)[0]
      } = ?`,
      [Object.values(value)[0], Object.values(key)[0]],
    ];
    const updateAll = [
      `UPDATE ${this.#collection} SET ${Object.keys(value)[0]} = ?`,
      [Object.values(value)[0]],
    ];
    // this.db.serialize(() => {
    return key
      ? await this.db.update(updateOne[0], updateOne[1])
      : await this.db.update(updateAll[0], updateAll[1]);

    // this.db.run(
    //   `UPDATE ${this.#collection} SET userId = ? WHERE id = ?`,
    //   [value.userId, key.id],
    //   function (err) {
    //     if (err) {
    //       return console.error(err.message);
    //     }
    //     console.log(`Row(s) updated: ${this.changes}`);
    //     updated["data"] = {id:key.id, userId: value.userId}
    //   }
    // );
    // });
    // return updated;
  }

  /**
   * Delete a record from the collection.
   *
   * @param {string} collection_name - The name of the collection.
   * @param {object} key - {key:value} The key to find the record to delete.
   * @returns {Promise<void>}
   */
  async delete(key) {
    // this.db.serialize(() => {
    return this.db.delete(
      `DELETE FROM ${this.#collection} WHERE ${Object.keys(key)[0]} = ?`,
      [Object.values(key)[0]]
    );
    // this.db.run(`DELETE FROM ${this.#collection} WHERE id = ?`, [key.id], function (err) {
    //   if (err) {
    //     return console.error(err.message);
    //   }
    //   console.log(`Row(s) deleted ${this.changes}`);
    // });
    // });
  }
}
