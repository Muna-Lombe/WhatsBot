// elevate the priviledge of a contact
function elevatePriviledge(contactId, action, priviledge) {
  if (action === "make") {
    contactId.makeAdmin();
  } else if (action === "revoke") {
    contactId.removeAdmin();
  } else if (action === "invite") {
    contactId.invite();
  } else if (action === "ban") {
    contactId.remove();
  }
}

const elevate = (contactId) => {
  return {
    makeAdmin: () => console.log("make admin", contactId),
    removeAdmin: () => console.log("remove admin", contactId),
    invite: () => console.log("invite", contactId),
    remove: () => console.log("remove", contactId),
  };
};

module.exports = elevatePriviledge;
