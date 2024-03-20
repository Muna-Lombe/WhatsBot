require("dotenv").config();
const jwt = require("jsonwebtoken");

var token = jwt.sign({ name: "moorhouseENT" }, process.env.SESSION_KEY);
console.log(
  "Use the following JWT to make request to this service -> \n",
  token
);
