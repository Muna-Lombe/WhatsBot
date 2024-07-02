const specChars = {
  "@": "_at_",
  "#": "_hash_",
  $: "_dollar_",
  "%": "_percent_",
  "^": "_caret_",
  "&": "_ampersand_",
  "*": "_asterisk_",
  "(": "_leftparenthesis_",
  ")": "_rightparenthesis_",
  "-": "_dash_",
  "+": "_plus_",
  "=": "_equals_",
  "{": "_leftbrace_",
  "}": "_rightbrace_",
  "[": "_leftbracket_",
  "]": "_rightbracket_",
  "|": "_pipe_",
  "\\": "_backslash_",
  "/": "_forwardslash_",
  ":": "_colon_",
  ";": "_semicolon_",
  "<": "_lessthan_",
  ">": "_greaterthan_",
  ",": "_comma_",
  ".": "_dot_",
  "?": "_questionmark_",
  "!": "_exclamationmark_",
  "~": "_tilde_",
  "`": "_backtick_",
  "'": "_singlequote_",
  '"': "_doublequote_",
};

function stringifyChars(data) {
  const newData = typeof data === "string" ? "" : Array.isArray(data) ? [] : {};
  RegExp.escape = function (s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  };
  for (const key in data) {
    if (typeof data[key] === "string") {
      let newValue = data[key];
      for (const char in specChars) {
        // console.log("char", char, "specChars[char]", specChars[char])

        const reg = new RegExp(RegExp.escape(char), "g");
        newValue = newValue.replace(reg, specChars[char]);
      }
      newData[key] = newValue;
    } else {
      newData[key] = data[key];
    }
  }
  // console.log("ser data", data,"newData", newData)
  return newData;
}
function parseChars(data) {
  RegExp.escape = function (s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  };

  const newData = typeof data === "string" ? "" : Array.isArray(data) ? [] : {};

  // if(typeof data === "string"){
  //   for (const char in specChars) {
  //     const reg = new RegExp(specChars[char], "g");
  //     newData = data.replace(reg, char);
  //   }
  //   // return data;
  // }
  for (const key in data) {
    if (typeof data[key] === "string") {
      let newValue = data[key];
      for (const char in specChars) {
        const reg = new RegExp(specChars[char], "g");
        newValue = newValue.replace(reg, char);
        // console.log("newValue", newValue, "char", char, "specChars[char]", specChars[char])
      }
      newData[key] = newValue;
    } else if (Array.isArray(data[key])) {
      newData[key] = data[key].map((el) => parseChars(el));
    } else if (typeof data[key] === "object") {
      newData[key] = parseChars(data[key]);
    } else {
      newData[key] = data[key];
    }
  }
  // console.log('newData', newData)

  return newData;
}

module.exports = {
  specialChars: {
    serialize: stringifyChars,
    deserialize: parseChars,
  },
};
