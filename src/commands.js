const { Data } = require("./Data");

class Command {
  constructor(id, aliases, callback) {
    this.id = id;
    this.aliases = aliases;
    this.callback = callback;
  }
}

const commands = [];
const chanceToCatchFish = 0.2; // 2% chance every
const fishCatchIntervalTime = 1000; // 1 second

function underline(str) {
  // Intertwine characters with underline unicode
  return str.split("").join("\u035f");
}

const fishermen = new Map();

const fishInterval = setInterval(() => {
  // Fishing random chance algorithm
  // for generating fish for people
  // who are fishing

  let rUser = fishermen.get(Math.floor(Math.random() * [...fishermen].length));
  let r = Math.random() * 1;

  if (r < chanceToCatchFish) {
    // TODO give user random fish
    // TODO implement higher chance with items
  }
}, fishCatchIntervalTime);

commands.push(
  new Command(
    "help",
    ["/help", "/h", "/commands", "/cmds", "/cmnds", "/cmd", "/cmnd", "/about"],
    (msg, chat) => {
      chat(
        `${underline(
          "Fishing"
        )}: \t/fish, /cast (starts fishing), /reel (stops fishing), /caught [name] (shows fish you've caught), /eat (eats one of your fish), /give [name] (gives fish to someone else), /give_[number] [name] (give up to 100 at a time), /pick (picks fruit from the tree), /look [object] (look at surroundings), /yeet [item] (yeet items into surroundings), /take [object] (take items from surroundings)"`
      );
    }
  ),
  new Command("fish", ["/fish", "/cast", "/fosh"], (msg, chat) => {
    let got = fishermen.get(msg.p._id);
    if (got) {
      // User is already fishing
      return void chat("Your LURE has been in the water for: ");
    } else {
      // User is not fishing
      fishermen.set(msg.p._id, {
        t: Date.now(),
      });

      chat(
        `Our friend ${msg.p.name} casts LURE into a water for catching fish.`
      );
    }
  })
  // TODO shop
);

module.exports = commands;
