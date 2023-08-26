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

function putFishInSack(sackId, fish) {
  // Give a fish to a user by putting it in their sack
  // TODO

  Data.getSack(sackId);
}

const fishInterval = setInterval(async () => {
  // Fishing random chance algorithm
  // Pick random fisherman to give fish

  let rFisher = getRandomFisherman();
  let r = Math.random() * 1;

  // Stop here if there is no user
  if (!rFisher) return void console.log("(DEBUG) no fisher");
  console.log("Picked fisher:", rFisher);

  if (r < chanceToCatchFish) {
    // TODO give user random fish
    // Get random fish
    const rFish = getRandomFish();

    // Has a sack?
    const sack = await findSack(rFisher.userId);

    if (!sack) {
      // No sack, create one
      await Data.createSack(rFisher);
    }

    putFishInSack(sack.id, rFish);

    console.log("Random chance requirement reached");

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
      // User is not fishing
      fishermen.set(msg.p._id, {
        userId: msg.p._id,
        t: Date.now()
      });

      chat(
        `Our friend ${msg.p.name} casts LURE into a water for catching fish.`
      );
    }
  })

  // TODO shop
);

module.exports = commands;
