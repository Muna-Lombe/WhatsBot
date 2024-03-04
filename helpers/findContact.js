const getContactIdByName = (contactName) => {
  const contacts = {
    aigul: "+7 968 769-80-40",
    muna: "+7 965 622-97-55",
  };

  return (
    contacts[contactName.toLowerCase()].replace(/\D/g, "").replace(/^7/, "7") +
    "@c.us"
  );
};

module.exports = { getContactIdByName };
