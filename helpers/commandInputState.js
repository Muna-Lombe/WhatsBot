const fs = require("fs");
const { INPUTSTATETYPES } = require("./commandUtils");

const commandInputState = () =>
  JSON.parse(fs.readFileSync("./cache/commandInput.json"));

function incommingInput() {
  // { lastCommand:'command', [command]: { isIncomming: false, inputState: 'state', args: ['arg1', 'arg2', 'arg3'] } }
  const state = commandInputState();

  return state[state?.lastCommand] || {};
  // Object.keys(commandInputState).filter(command => commandInputState[command].isIncomming);
}

function inputStore(command) {
  const state = commandInputState();

  // console.log("store", state["store"])
  return state["store"][command];
}

function readingCommand(command, comState, state, store) {
  state["args"].shift();
  const staleState = comState[command];
  state["args"].unshift(...(staleState?.args || ""));
  comState.lastCommand = command;
  comState[command] = { ...staleState, ...state };
  if (store) {
    if (store.complete) {
      const { complete, ...rest } = store;
      comState["store"] = { [command]: rest };
    } else {
      comState["store"] = {
        [command]: { ...comState?.store?.[command], ...store },
      };
    }
  } else {
    comState["store"] = { ...comState.store };
  }
  console.log("red", comState);

  fs.writeFileSync("./cache/commandInput.json", JSON.stringify(comState));
}

function confirmingCommand(command, comState, state, store) {
  const staleState = comState[command];
  comState.lastCommand = command;
  comState[command] = { ...state };
  if (store) {
    if (store.complete) {
      const { complete, ...rest } = store;
      comState["store"] = { [command]: rest };
    } else {
      comState["store"] = {
        [command]: { ...comState?.store?.[command], ...store },
      };
    }
  } else {
    comState["store"] = { ...comState.store };
  }
  console.log("cfm", comState);

  fs.writeFileSync("./cache/commandInput.json", JSON.stringify(comState));
}

function updatingCommand(command, comState, state, store) {
  const staleState = comState[command];
  comState.lastCommand = command;
  comState[command] = { ...staleState, ...state };
  if (store) {
    if (store.complete) {
      const { complete, ...rest } = store;
      comState["store"] = { [command]: rest };
    } else {
      comState["store"] = {
        [command]: { ...comState?.store?.[command], ...store },
      };
    }
  } else {
    comState["store"] = { ...comState.store };
  }
  console.log("upd", comState);

  fs.writeFileSync("./cache/commandInput.json", JSON.stringify(comState));
}

function updateInputState(
  command,
  state = { inputState: "reading input", isIncomming: true, args: ["arg1"] },
  store
) {
  // console.log("state: " , state, store)
  const comState = commandInputState();

  if (state.inputState === INPUTSTATETYPES["reading command"]) {
    readingCommand(command, comState, state, store);
  }
  if (state.inputState === INPUTSTATETYPES["confirming command"]) {
    confirmingCommand(command, comState, state, store);
  }
  if (state.inputState === INPUTSTATETYPES["updating command"]) {
    updatingCommand(command, comState, state, store);
  }
}

module.exports = { incommingInput, updateInputState, inputStore };
