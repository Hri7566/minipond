/**
 * TODO save fishermen between server restarts
 * TODO better font
 * TODO clean up commands
 * TODO move helper functions to another file
 */

const { Data } = require("./Data");

const fishList = require("./fishList");

class Command {
  constructor(id, aliases, callback) {
    this.id = id;
    this.aliases = aliases;
    this.callback = callback;
  }
}

const commands = [];
const chanceToCatchFish = 0.2; // 2% chance every
// const fishCatchIntervalTime = 1000; // 1 second
const fishCatchIntervalTime = 500;

// Useful things

function underline(str) {
  // Intertwine characters with underline unicode
  return str.split("").join("\u035f");
}

function getRandomFish() {
  // Get a random fish from the fish list
  return fishList[Math.floor(Math.random() * fishList.length)];
}

const fishermen = new Map();

function getRandomFisherman() {
  // Get a random fisherman
  try {
    const values = Array.from(fishermen.values());
    return values[Math.floor(Math.random() * values.length)];
  } catch (err) {
    // No fisher found
    return undefined;
  }
}

/**
 * Find a fisherman's fishing sack
 * @param {string} fisherId ID of fisherman whose sack we're looking for
 * @returns Found sack or null
 */
async function findSack(fisherId) {
  try {
    return await Data.getSackByUserId(fisherId);
  } catch (err) {
    return null;
  }
}

async function putFishInSack(sackId, fish) {
  // Give a fish to a user by putting it in their sack
  // TODO

  // Get sack this fish belongs to
  const sack = await Data.getSack(sackId);

  // Convert fish to JSON and verify
  const jFish = JSON.parse(sack.fish);
  if (!Array.isArray(jFish)) return false;

  // Add fish to array
  jFish.push(fish);
  return true;
}

const fishInterval = setInterval(async () => {
  // Fishing random chance algorithm
  // Pick random fisherman to give fish

  // Get fisher
  let rFisher = getRandomFisherman();
  if (!rFisher) return void console.log("(DEBUG) no fisher");
  console.log("Picked fisher:", rFisher);

  // Get fisher's user data
  let user = await Data.getUser(rFisher.userId);
  console.log(rFisher.userId, user);
  if (!user) return void console.log("(DEBUG) no fisher's user");

  // Random chance value
  let r = Math.random() * 1;

  if (r < chanceToCatchFish) {
    // TODO give user random fish
    // Get random fish
    const rFish = getRandomFish();

    // Has a sack?
    const sack = await findSack(rFisher.userId);

    if (!sack) {
      // No sack, create one
      sack = await Data.createSackForUser(rFisher.userId, {
        fish: JSON.stringify([])
      });
    }

    const errored = await putFishInSack(sack.id, rFish);

    if (!errored) {
      console.log("(DEBUG) Random chance requirement reached");

      // Remove user from fishermen
      fishermen.delete(rFisher.userId);
    }

    // TODO implement higher chance with items
    // TODO implement items
  }
}, fishCatchIntervalTime);

// Commands

commands.push(
  new Command(
    "help",
    ["/help", "/h", "/commands", "/cmds", "/cmnds", "/cmd", "/cmnd", "/about"],
    (msg, chat) => {
      // Send help text
      chat(
        `${underline(
          "Fishing"
        )}: \t/fish, /cast (starts fishing), /reel (stops fishing), /caught [name] (shows fish you've caught), /eat (eats one of your fish), /give [name] (gives fish to someone else), /give_[number] [name] (give up to 100 at a time), /pick (picks fruit from the tree), /look [object] (look at surroundings), /yeet [item] (yeet items into surroundings), /take [object] (take items from surroundings)"`
      );
    }
  ),

  new Command("fish", ["/fish", "/cast", "/fosh"], (msg, chat) => {
    // Fishing
    let fisherman = fishermen.get(msg.p._id);

    if (fisherman) {
      // User is already fishing, show time
      const started = (Date.now() - fisherman.t) / 1000 / 60;
      return void chat(
        `Friend ${
          msg.p.name
        }: Your lure is already in the water (since ${started.toFixed(
          2
        )} minutes ago).`
      );
    } else {
      // User is not fishing, make them a fisherman
      fishermen.set(msg.p._id, {
        userId: msg.p._id,
        t: Date.now()
      });

      chat(
        `Our friend ${msg.p.name} casts LURE into a water for catching fish.`
      );
    }
  }),

  new Command("fishing", ["/fishing"], (msg, chat) => {
    // Return list of fishermen
    const list = Array.from(fishermen.keys())
      .map(key => {
        const value = fishermen.get(key);
        return `${key}: ${((Date.now() - value.t) / 1000 / 60).toFixed(
          2
        )} minutes`;
      })
      .join(", ");
    chat("Current fishermen by user ID: " + (list ? list : "(none)"));
  })

  // TODO shop
);

module.exports = commands;
