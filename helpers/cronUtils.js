// change to regex
const days = {
  monday: ["mon", "mon,", "mon.", "monday", "monday,", "monday."],
  tuesday: ["tue", "tue,", "tue.", "tuesday", "tuesday,", "tuesday."],
  wednesday: ["wed", "wed,", "wed.", "wednesday", "wednesday,", "wednesday."],
  thursday: ["thur", "thur,", "thur.", "thursday", "thursday,", "thursday."],
  friday: ["fri", "fri,", "fri.", "friday", "friday,", "friday."],
  saturday: ["sat", "sat,", "sat.", "saturday", "saturday,", "saturday."],
  sunday: ["sun", "sun,", "sun.", "sunday", "sunday,", "sunday."],
};
const validDays = [
  "month",
  "week",
  ...days.monday,
  ...days.tuesday,
  ...days.wednesday,
  ...days.thursday,
  ...days.friday,
  ...days.saturday,
  ...days.sunday,
];

const validPeriods = ["every", "at", "on", "for", "during"];
const validTimes = [
  "second",
  "seconds",
  "minute",
  "minutes",
  "hour",
  "hours",
  "day",
  "days",
];

const validCronWords = [...validDays, ...validTimes, ...validPeriods];
const reg12 =
  /(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM|am|pm)?|([01]?[0-9]|1[0-2])(AM|PM|am|pm)/g;

const reg24 = /^(?:[01]?[0-9]|2[0-3]):[0-5][0-9]$/g;

const isTimeFormat = (string) => {
  //regex to include 12 hour time format
  // eg. 12:00, 12:00 am, 12:00 pm, 12:00am, 12:00pm, 12am, 12pm
  // this only matches 12:00.
  // fix: 12:00 am, 12:00 pm, 12:00am, 12:00pm, 12am, 12pm

  const reg1 = new RegExp(`(${reg12.source})|(${reg24.source})`, "g");
  const timeRegex = new RegExp(reg1.source, reg1.flags);
  return timeRegex.test(string);
};
const isDay = (string) => {
  return validDays.includes(string?.toLowerCase());
};

const isDays = (string) => {
  return string.split(" ").filter((s) => isDay(s)).length > 1;
};
const isDate = (string) => {
  // Should match the following:
  // 2021-10-20
  // 21-10-2020
  // 21/10/2020
  // 21.10.2020
  // 21 10 2020
  // 21 10 20
  // 20th October 2021
  // October 20th 2021
  // 20 October 2021
  // October 20 2021
  // 20th October
  // October 20th
  // 20 October

  // October 20

  const date = new Date(string);

  return date.toString() !== "Invalid Date" && date;
};
const isDayDate = (string) => {
  return isDay(string) || isDate(string);
};
const isTimePeriod = (string) => {
  return (
    string?.includes("-") &&
    ((isDay(string.split("-")[0]) && isDay(string.split("-")[1])) ||
      (isTimeFormat(string.split("-")[0]) &&
        isTimeFormat(string.split("-")[1])) ||
      (isCronWord(string.split("-")[0]) && isCronWord(string.split("-")[1])))
  );
};
const isPeriod = (string) => {
  return validPeriods.includes(string?.toLowerCase());
};
const isTime = (string) => {
  return validTimes.includes(string?.toLowerCase());
};
const isCronWord = (string) => {
  return validCronWords.includes(string?.toLowerCase());
};
const isMonth = (string) => {
  return new RegExp(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i).test(
    string
  );
};
const isCron = (string) => {
  if (isTime(string)) return "Time";
  if (isDay(string)) return "Day";
  if (isDate(string)) return "Date";
  if (isPeriod(string)) return "Period";
  if (isTimePeriod(string)) return "Period";
  if (isTimeFormat(string)) return "Time";

  return false;
};
// [{action: 'reminder', target: 'Muna', period: 'every', time: '12:00', object:"reminder:text Jim"}]

const convertTo24HourIfExist = (string) => {
  if (isTimeFormat(string)) {
    // console.log(`Check string:
    // ${string} is format [hour]:[minute][space/am/pm]: ${string.includes(':') && (string.includes('am') || string.includes('pm'))},
    // ${string} is format [hour][am/pm]: ${new RegExp(/([01]?[0-9]|1[0-2])(AM|PM|am|pm)/i).test(string)}
    // `)

    if (
      string.includes(":") &&
      (string.includes("am") || string.includes("pm"))
    ) {
      // console.log('string is format [hour]:[minute][space/am/pm]')

      const time = string.split(":");

      let hour = parseInt(time[0]);
      let minutes = time[1].trim().slice(0, 2);
      let amPm =
        string.includes("am") || string.includes("pm")
          ? string.slice(-2)
          : null;

      if (hour > 12) {
        return `${hour}:${minutes}`;
      }
      if (amPm === "am") {
        return `${hour}:${minutes}`;
      }

      if (amPm === "pm") {
        return `${parseInt(hour) + 12}:${minutes}`;
      }
    }

    // 12am,
    // 12pm
    if (new RegExp(/([01]?[0-9]|1[0-2])(AM|PM|am|pm)/i).test(string)) {
      // console.log('string is format [hour][am/pm]')
      let [hour, amPm] = string.split(/(AM|PM|am|pm)/i);
      // amPm = string?.trim().slice(-2);

      if (hour > 12) {
        return `${hour}:00`;
      }

      if (amPm === "am") {
        return `${hour}:00`;
      }

      if (amPm === "pm") {
        return `${parseInt(hour) + 12}:00`;
      }
    }

    // console.log('string is a time')
    return string;
  }
  return null;
};

const validateCron = (rest) => {
  // let hasTime, hasDay, hasTimeFormat, hasPeriod = false
  const valid = rest.every((word, index, arr) => {
    if (isCron(word)) {
      // console.log("in C")
      return true;
      // if (isTimeFormat(word)) {
      //   // if(arr[index+1] && isPeriod(arr[index+1])){
      //   //   return true
      //   // }
      //   // if(arr[index+1] && isDay(arr[index+1])){
      //   //   return true
      //   // }
      //   return true;

      //   console.log(`in isTF Invalid word: ${word}`);
      // }
      // if (isTime(word)) {
      //   // if(arr[index+1] && isPeriod(arr[index+1])){
      //   //   return true
      //   // }
      //   return true;

      //   console.log(`in isT Invalid word: ${word}`);
      // }
      // if (isDay(word) || isDate(word)) {
      //   // if(arr[index+1] && isPeriod(arr[index+1])){
      //   //   return true
      //   // }
      //   return true;

      //   console.log(`in isD Invalid word: ${word}`);
      // }
      // if (isPeriod(word)) {
      //   // if(arr[index+1] && isTimeFormat(arr[index+1])){
      //   //   return true
      //   // }
      //   // if(arr[index+1] && isDay(arr[index+1])){
      //   //   return true
      //   // }
      //   return true;

      //   console.log(`in isP Invalid word: ${word}`);
      // }
      // if (isTimePeriod(word)) {
      //   // if(arr[index+1] && isTimeFormat(arr[index+1])){
      //   //   return true
      //   // }
      //   // if(arr[index+1] && isDay(arr[index+1])){
      //   //   return true
      //   // }
      //   return true;

      //   console.log(`in isP Invalid word: ${word}`);
      // }
    }
    // console.log(`in IsC Invalid word: ${word}`)
    return false;
  });
  return valid;
};

const reverseLookup = (obj, v) => {
  return Object.keys(obj).filter((o) => obj[o].includes(v))[0];
};
const format = {
  day: (d) => {
    // use regex to match and substitute the day
    // should match the following format:
    // mon, tue., wed,,
    // console.log("day", d)
    const day = reverseLookup(days, d.toLowerCase());
    const fday = day?.[0].toUpperCase() + day?.slice(1);

    return fday;
  },
  period: (p) => {
    return p;
  },
  timeFormat: (tf) => {
    return convertTo24HourIfExist(tf);
  },
};

module.exports = {
  isTimeFormat,
  isDay,
  isDays,
  isDate,
  isDayDate,
  isMonth,
  isPeriod,
  isTimePeriod,
  isTime,
  isCronWord,
  isCron,
  convertTo24HourIfExist,
  validDays,
  validPeriods,
  validTimes,
  validCronWords,
  validateCron,
  format,
};
