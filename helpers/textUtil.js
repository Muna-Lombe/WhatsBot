module.exports = {
  boldText: (str) => `*${str}*`,
  italicsText: (str) => `_${str}_`,
  strikeThroughText: (str) => `~${str}~`,
  monospaceText: (str) => `\`\`\`${str}\`\`\``,
  codeText: (str) => `\`${str}\``,
  bulletStarText: (str) => `* ${str}`,
  bulletDashText: (str) => `- ${str}`,
  quotedText: (str) => `> ${str}`,
};
