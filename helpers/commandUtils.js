const INPUTSTATETYPES = {
  ["reading command"]: "READINGCOMMAND",
  ["confirming command"]: "COMFIRMINGCOMMAND",
  ["updating command"]: "UPDATINGCOMMAND",
  ["editing time"]: "EDITINGTIME",
  ["confirming time"]: "COMFIRMINGTIME",
  ["editing message"]: "EDITINGMESSAGE",
  ["confirming message"]: "COMFIRMINGMESSAGE",
  ["editing day/date"]: "EDITINGDAYDATE",
  ["confirming day/date"]: "COMFIRMINGDAYDATE",
  ["editing action"]: "EDITINGACTION",
  ["confirming action"]: "COMFIRMINGACTION",
  ["editing target"]: "EDITINGTARGET",
  ["confirming target"]: "COMFIRMINGTARGET",
  ["confirming edit"]: "COMFIRMINGEDIT",
};

module.exports = { INPUTSTATETYPES };
