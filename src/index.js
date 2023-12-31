const fastify = require("fastify");
const http = require("http");
const { env } = require("./env");
const fs = require("fs");
const mime = require("mime");
const { URL } = require("url");
const path = require("path");
const { WebSocketServer } = require("ws");
const EventEmitter = require("events");
const crypto = require("crypto");
const { Data } = require("./Data");

// Chat history
const chatHistoryFile = "chatHistory.json";
let chatHistory = [];

function loadChatHistory(file = chatHistoryFile) {
  // Load chat history from file
  console.log(`Loading chat history`);
  chatHistory = JSON.parse(fs.readFileSync(file).toString());
}

function saveChatHistory(file = chatHistoryFile) {
  // Save chat history to file
  // console.log(`Saving chat history`);
  fs.writeFileSync(file, JSON.stringify(chatHistory));
}

// Load chat history on startup
try {
  // Create file before trying
  const files = fs.readdirSync(".");

  if (!files.includes(chatHistoryFile)) {
    fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory));
  }

  loadChatHistory();
} catch (err) {
  console.error(`Could not load chat history:`, err);
  process.exit(1);
}

// Save chat history every few seconds
//? Because saving on every message lags,
//? I decided to save on an interval
const chatHistorySaveTime = 5000;
const chatHistorySaveInterval = setInterval(() => saveChatHistory(), 5000);

// Initialize Fastify
const app = fastify();

// File resolution
app.get("*", (req, rep) => {
  try {
    // Get the path itself (no question marks allowed)
    const file = req.url;
    const url = new URL("http://localhost" + file);
    const directPath = url.pathname;
    let sections = directPath.split("/");
    const type = mime.getType(sections[sections.length - 1]);

    // This throws when the path == "/"
    // ...but it's handled with simple logic
    if (type == null) throw "lol";

    if (directPath.includes("..")) {
      rep.code(418);
      rep.send("I'm a teapot");
      return;
    }

    fs.readFile(path.join("./public/", directPath), (err, data) => {
      if (err) {
        const index = fs.readFileSync("public/index.html");
        rep.type("text/html");
        rep.send(index);
      }

      rep.type(type);
      rep.send(data);
    });
  } catch (err) {
    const index = fs.readFileSync("public/index.html");
    rep.type("text/html");
    rep.send(index);
  }
});

// Open salami
app.listen({
  port: env.PORT || 80
});

// Create WebSocket server
const wss = new WebSocketServer({
  server: app.server
});

wss.on("connection", (ws, req) => {
  ws.client = new Client(ws, req);
});

const serverParticipant = {
  name: "fishing",
  _id: "server",
  color: "#8d3f50"
};

function broadcastMessage(msg) {
  // Broadcast a message to all clients
  for (const ws of wss.clients) {
    if (!ws.client) continue;
    if (ws.client.destroyed) continue;
    ws.client.sendArray([msg]);
  }
}

function broadcastChat(str) {
  // Broadcast a chat message
  const chatMessage = {
    m: "a",
    p: serverParticipant,
    a: str,
    t: Date.now()
  };

  // Send message
  broadcastMessage(chatMessage);

  // Save to chat history
  chatHistory.push(chatMessage);
}

// WebSocket Client
class Client extends EventEmitter {
  constructor(ws, req) {
    super();
    this.ws = ws;
    this.bindEventListeners();

    this.ip = req.socket.remoteAddress;

    //? is this vulnerable
    if (
      req.socket.remoteAddress.includes("127.0.0.1") &&
      !!req.headers["x-forwarded-for"]
    ) {
      // TODO debug this
      // console.log(req.headers["x-forwarded-for"]);
      this.ip = req.headers["x-forwarded-for"];
    }

    if (this.ip.startsWith("::ffff:")) {
      this.ip = this.ip.substring("::ffff:".length);
    }

    console.log("(DEBUG) IP:", this.ip);

    this._id = Randy.getIDFromIP(this.ip);

    (async () => {
      this.user = await Data.getUser(this._id);

      if (!this.user) {
        this.user = {
          _id: this._id,
          name: Data.defaultUserData.name,
          color: Randy.getColorFromID(this._id),
          location: "outside"
        };

        await Data.createUser(this.user);
      }

      this.emit("loaded");
    })();
  }

  sendArray(msgs) {
    // Send an array of messages to the client
    try {
      this.ws.send(JSON.stringify(msgs));
    } catch (err) {
      console.error(err);
    }
  }

  destroy() {
    // Render this client unusable
    this.ws.close();
    this.removeAllListeners();
    this.destroyed = true;
  }

  getParticipant() {
    // Get this client's live user data
    if (!this.loaded) {
      return {
        _id: this._id,
        name: "Anonymous",
        color: "#777"
      };
    }

    return {
      _id: this._id,
      name: this.user.name,
      color: this.user.color
    };
  }

  sendChatHistory(history) {
    // Send the last 50 messages to the client
    this.sendArray([
      {
        m: "c",
        c: history.slice(history.length - 50, history.length)
      }
    ]);
  }

  bindEventListeners() {
    // Add all event listeners

    this.ws.on("message", (data, isBinary) => {
      if (isBinary) return;

      try {
        let msgs = JSON.parse(data.toString());

        for (const msg of msgs) {
          this.emit(msg.m, msg);
        }
      } catch (err) {
        console.error(err);
      }
    });

    this.on("loaded", msg => {
      if (msg) return;
      this.loaded = true;
    });

    this.on("hi", msg => {
      // Handshake message handler

      // Send chat history
      this.sendChatHistory(chatHistory);
    });

    this.on("t", msg => {
      // Time message handler

      // Send server's time to client
      const res = {
        m: "t",
        t: Date.now()
      };

      // Optional echo
      if (msg.e) {
        res.e = msg.e;
      }

      this.sendArray([res]);
    });

    this.on("a", msg => {
      // Chat message handler

      // Verify message
      if (!this.loaded) return;
      if (!msg.message) return;

      const res = {
        m: "a",
        p: this.getParticipant(),
        a: msg.message.split("\n").join(" "),
        t: Date.now()
      };

      // Send to every client
      broadcastMessage(res);

      // Add to chat history
      chatHistory.push(res);

      CommandHandler.handleCommand(res);
    });
  }
}

// ID & color generator
class Randy {
  static getRandomID() {
    // Get 24 chars of random hex
    //? maybe switch to UUIDs
    return crypto.randomBytes(12).toString("hex");
  }

  static getIDFromIP(ip) {
    // Get first 24 chars of salted hash of IP
    const hash = crypto.createHash("sha256");
    hash.update("::ffff:");
    hash.update(ip);
    hash.update(env.SALT);
    return hash.digest("hex").substring(0, 24);
  }

  static getColorFromID(id) {
    // Get first 6 chars of salted hash of ID
    const hash = crypto.createHash("sha256");
    hash.update(id);
    hash.update(env.SALT);
    return "#" + hash.digest("hex").substring(0, 6);
  }
}

/**
 * Commands
 */

class CommandHandler {
  static commands = require("./commands");

  static handleCommand(message) {
    let msg = message;
    if (msg.m !== "a") return;

    msg.args = msg.a.split(" ");
    msg.argcat = msg.a.substring(msg.args[0].length).trim();

    // Find which command should be run
    for (const command of this.commands) {
      let usedAlias;

      for (const alias of command.aliases) {
        if (alias == msg.args[0]) {
          usedAlias = alias;
          break;
        }
      }

      if (!usedAlias) continue;

      // Run the command
      command.callback(msg, broadcastChat);
    }
  }
}
