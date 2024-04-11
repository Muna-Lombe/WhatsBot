const database = require("../db");

// const { conn:sessConn, coll:sessColl } =  database('sessions')
// const { conn: botSessionConn, coll:botSessionColl } =  database('BotSessions')
// const { conn: userConn, coll: userColl } =  database('users')
// const { conn: cronTaskConn, coll: cronTaskColl } =  database('crontasks')

module.exports = {
  botsDb: database("Bots").then(async (db) => {
    await db.coll.create({
      botId: "text",
      status: "text",
      timestamp: "text",
    });
    return db;
  }),
  crontasksDb: database("crontasks").then(async (db) => {
    await db.coll.create({
      taskId: "text",
      task: "text",
    });
    return db;
  }),
  pmpermitsDb: database("pmpermits").then(async (db) => {
    await db.coll.create({
      found: "text",
      number: "text",
      times: "integer",
      permit: "text",
    });
    return db;
  }),
};
