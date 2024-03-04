const { CronExpressionBuilder, CronValidators } = require("natural-cron");
const { CronTimeUnit } = require("natural-cron/dist/cjs/interfaces");
const { validate } = require("node-cron");
const builder = new CronExpressionBuilder();

function buildExpressionFor(naturalLanguageStringArray = []) {
  const validCronWords = [
    "every",
    "at",
    "on",
    "for",
    "during",
    "minute",
    "minutes",
    "hour",
    "day",
    "month",
    "week",
    "monday",
    "monday,",
    "tuesday",
    "tuesday,",
    "wednesday",
    "wednesday,",
    "thursday",
    "thursday,",
    "friday",
    "friday,",
    "saturday",
    "saturday,",
    "sunday",
    "sunday,",
  ];
  const reg12 =
    /(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM|am|pm)?|([01]?[0-9]|1[0-2])(AM|PM|am|pm)/g;

  const reg24 = /^(?:[01]?[0-9]|2[0-3]):[0-5][0-9]$/g;

  const isTime = (string) => {
    //regex to include 12 hour time format
    // eg. 12:00, 12:00 am, 12:00 pm, 12:00am, 12:00pm, 12am, 12pm
    // this only matches 12:00.
    // fix: 12:00 am, 12:00 pm, 12:00am, 12:00pm, 12am, 12pm

    const reg1 = new RegExp(`(${reg12.source})|(${reg24.source})`, "g");
    const timeRegex = new RegExp(reg1.source, reg1.flags);
    return timeRegex.test(string);
  };
  const convertTo24HourIfExist = (string) => {
    if (isTime(string)) {
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
        // amPm = string.trim().slice(-2);

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

  console.log("naturalLanguageStringArray", naturalLanguageStringArray);
  const parts = naturalLanguageStringArray
    .flatMap((part, idx, arr) => {
      part = part.toLowerCase();

      const newPart = validCronWords.includes(part.toLowerCase())
        ? part.replace(/,/g, "")
        : isTime(part)
        ? convertTo24HourIfExist(part)
        : "";
      if (isTime(part) && arr[idx - 1] !== "at") {
        console.log("at time", newPart);
        return ["at", newPart];
      }
      return (arr = newPart);
    })
    .filter((part) => part?.length > 0);

  // // Define mappings for natural language to cron values
  const dayOfWeekMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const expressionTypes = {
    minutes: "atMinutes",
    hours: "atHours",
    every: ["every", "everyX"],
    time: "atTime",
    "every day": "atTime",
    day: "atTime",
    "monday-friday": "onWeekdays",
    "monday to friday": "onWeekdays",
    "from monday to friday": "onWeekdays",
    on: "onDaysOfMonth",
  };

  const cronTimeMap = {
    minutes: "Minute",
    hours: "Hour",
    days: "DayOfMonth",
    months: "Month",
    weeks: "DayOfWeek",
  };

  console.log("parts", parts);

  // Handle different types of natural language inputs
  const chainExpression = () => {
    if (parts.includes("every")) {
      const evryIdx = parts.indexOf("every");
      if (parts.includes("day")) {
        const time = parts[parts.indexOf("at") + 1];
        builder.every("day").atTime(time);
      }
      if (dayOfWeekMap[parts[parts.indexOf("every") + 1]]) {
        const time = parts[parts.indexOf("at") + 1];
        const days = parts.slice(
          parts.indexOf("every") + 1,
          parts.indexOf("at")
        );
        // console.log(days)
        builder
          .atTime(time)
          .onWeekDays(days.map((day) => dayOfWeekMap[day.toLowerCase()]));
      }
      if (parts.includes("hour")) {
        builder.every("hour");
      }
      if (parts.includes("minutes") || parts.includes("minute")) {
        if (parts.includes("minutes")) {
          const minutes = parts[parts.indexOf("every") + 1];
          builder.everyX(parseInt(minutes), CronTimeUnit.Minute);
        } else {
          builder.every("minute");
        }
      }
    } else if (parts.includes("on")) {
      let time, days;
      if (parts.includes("for")) {
        time = parts[parts.indexOf("for") + 1];
        days = parts.slice(parts.indexOf("on") + 1, parts.indexOf("for"));
      }
      if (parts.includes("at")) {
        time = parts[parts.indexOf("at") + 1];
        days = parts.slice(parts.indexOf("on") + 1, parts.indexOf("at"));
      }

      // console.log('days', days);
      builder
        .atTime(time)
        .onWeekDays(days.map((day) => dayOfWeekMap[day.toLowerCase()]));
    } else if (parts.includes("during")) {
      const time = parts[parts.indexOf("at") + 1];
      const months = parts.slice(parts.indexOf("during") + 1);
      builder.atTime(time).duringMonths(months);
    }

    // Compile and return the cron expression
    return builder.compile();
  };
  try {
    const expression = chainExpression();
    return expression;
  } catch (error) {
    console.error(`Error converting to cron: ${error.message}`);
    return null;
  }
}

module.exports = {
  buildExpressionFor,
};
