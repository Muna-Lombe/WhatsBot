const { CronExpressionBuilder, CronValidators } = require("natural-cron");
const { CronTimeUnit } = require("natural-cron/dist/cjs/interfaces");
const { validate } = require("node-cron");
const {
  validCronWords,
  convertTo24HourIfExist,
  isTimeFormat,
  isDay,
  isDate,
  isMonth,
} = require("./cronUtils");

function buildExpressionFor(naturalLanguageStringArray = []) {
  const functionToCheckIfSomethingIsACronPart = (arg) => {
    // sctructure of a cron
    // [action][target][period][time][day]
    // eg. every 5 minutes
  };

  console.log("naturalLanguageStringArray", naturalLanguageStringArray);
  const parts = naturalLanguageStringArray
    .flatMap((part, idx, arr) => {
      part = part.toLowerCase();

      const newPart = validCronWords.includes(part.toLowerCase())
        ? part.replace(/[,.]/g, "")
        : isTimeFormat(part)
        ? convertTo24HourIfExist(part)
        : "";
      if (isMonth(part)) {
        return part;
      }
      if (isDate(part)) {
        const [day, month, _] = part.split(/[-./ ]/);
        return `[${day}, ${month}]`;
      }
      if (
        isTimeFormat(part) &&
        arr[idx - 1] !== "for" &&
        arr[idx - 1] !== "at" &&
        arr[idx - 1] !== "every"
      ) {
        console.log(`check:
        is for: ${arr[idx - 1] !== "for"}, 
        is at: ${arr[idx - 1] !== "at"}, 
        included 'at' before ${part}`);
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

  const monthOfYearMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  const matchMonth = (month) => {
    return Object.keys(monthOfYearMap).filter((key) =>
      key.includes(month.toLowerCase())
    )[0];
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

  // Handle different types of natural language date and time inputs
  // for example "tomorrow", "Monday", "next week", "next wednesday", "14/02/2022", "14th February 2022"
  // it should use the date-fns library to convert these into a date object
  // then use the date object to build the cron expression
  // then return the cron expression

  const handleDates = (parts) => {
    const date = new Date();

    if (isDate(parts[0])) {
      const [day, month, year] = parts[0].split(/[-./ ]/);
      date.setDate(day);
      date.setMonth(month);
      date.setFullYear(year);
    }
    if (parts.includes("tomorrow")) {
      date.setDate(date.getDate() + 1);
    }
    if (parts.includes("next")) {
      if (isDay(parts[parts.indexOf("next") + 1])) {
        const day = parts[parts.indexOf("next") + 1];
        date.setDate(date.getDate() + 7);
      }
      if (parts.includes("week")) {
        date.setDate(date.getDate() + 7);
      }
      if (parts.includes("month")) {
        date.setMonth(date.getMonth() + 1);
      }
      if (parts.includes("year")) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
    if (parts.includes("today")) {
      date.setDate(date.getDate());
    }

    return date;
  };

  // Handle different types of natural language inputs
  const chainExpression = () => {
    const builder = new CronExpressionBuilder();

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
      // if (isTimeFormat(parts[evryIdx + 1])) {
      //   const time = parts[evryIdx + 1];
      //   builder.every("day").atTime(time);
      // }
    }
    if (parts.includes("on")) {
      let time, days;

      if (parts.includes("every")) {
        const everytime = parts[parts.indexOf("every") + 1];
        const everydays = parts
          .slice(parts.indexOf("on") + 1)
          .filter((day) => isDay(day));

        builder
          .atTime(everytime)
          .onWeekDays(everydays.map((day) => dayOfWeekMap[day.toLowerCase()]));
      }
      if (parts.includes("for") || parts.includes("at")) {
        if (parts.includes("for")) {
          time = parts[parts.indexOf("for") + 1];
          days = parts
            .slice(parts.indexOf("on") + 1)
            .filter((day) => isDay(day));
        }
        if (parts.includes("at")) {
          time = parts[parts.indexOf("at") + 1];
          days = parts
            .slice(parts.indexOf("on") + 1)
            .filter((day) => isDay(day));
        }

        // console.log('days', days);
        builder.atTime(time);
        days.length > 1 &&
          builder.onWeekDays(
            days.map((day) => dayOfWeekMap[day.toLowerCase()])
          );
      }

      try {
        if (Array.isArray(JSON.parse(parts[parts.indexOf("on") + 1]))) {
          const [day, month] = JSON.parse(parts[parts.indexOf("on") + 1]);
          builder
            .onDaysOfMonth([parseInt(day)])
            .duringMonths([parseInt(month)]);
        }
      } catch (error) {}
    }
    if (parts.includes("during")) {
      const time = parts[parts.indexOf("at") + 1];
      const months = parts
        .slice(parts.indexOf("during") + 1)
        .map((month) =>
          isNaN(month) ? monthOfYearMap[matchMonth(month)] : parseInt(month)
        );
      builder.atTime(time).duringMonths(months);
    }

    // console.log("builder: ", builder)
    // Compile and return the cron expression
    return builder.compile();
  };
  try {
    const expression = chainExpression();
    if (!validate(expression)) {
      throw new Error("expession is not valid: " + expression);
    }
    return expression;
  } catch (error) {
    console.error(`Error converting to cron: ${error.message}`);
    return null;
  }
}

module.exports = {
  buildExpressionFor,
};
