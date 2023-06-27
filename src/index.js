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
const { PrismaClient } = require("@prisma/client");

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
  port: env.PORT || 80,
});

// Create WebSocket server
const wss = new WebSocketServer({
  server: app.server,
});

wss.on("connection", (ws, req) => {
  ws.client = new Client(ws, req);
});

const serverParticipant = {
  name: "fishing",
  _id: "server",
  color: "#8d3f50",
};

function broadcastMessage(msg) {
  for (const ws of wss.clients) {
    if (!ws.client) continue;
    if (ws.client.destroyed) continue;
    ws.client.sendArray([msg]);
  }
}

function broadcastChat(str) {
  broadcastMessage({
    m: "a",
    p: serverParticipant,
    a: str,
    t: Date.now(),
  });
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
      console.log(req.headers["x-forwarded-for"]);
      this.ip = req.headers["x-forwarded-for"];
    }

    this._id = Randy.getIDFromIP(this.ip);

    (async () => {
      this.user = await Data.getUser(this._id);

      if (!this.user) {
        this.user = {
          _id: this._id,
          name: Data.defaultUserData.name,
          color: Randy.getColorFromID(this._id),
        };
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
        color: "#777",
      };
    }

    return {
      _id: this._id,
      name: this.user.name,
      color: this.user.color,
    };
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

    this.on("loaded", (msg) => {
      if (msg) return;
      this.loaded = true;
    });

    this.on("t", (msg) => {
      // Send server's time to client
      const res = {
        m: "t",
        t: Date.now(),
      };

      if (msg.e) {
        res.e = msg.e;
      }

      this.sendArray([res]);
    });

    this.on("a", (msg) => {
      if (!this.loaded) return;
      if (!msg.message) return;

      const res = {
        m: "a",
        p: this.getParticipant(),
        a: msg.message.split("\n").join(" "),
        t: Date.now(),
      };

      broadcastMessage(res);

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
 * Data
 */

// Prisma setup
const prisma = new PrismaClient();

// Data handler
class Data {
  static defaultUserData = {
    name: "Anonymous",
    color: "#777",
  };

  static async createUser(user) {
    await prisma.user.create({
      data: {
        id: user._id,
        name: user.name,
        color: user.color || "#777",
        flags: user.flags || {},
      },
    });
  }

  static async getUser(_id) {
    const user = await prisma.user.findUnique({
      where: {
        id: _id,
      },
    });

    return user;
  }

  static async updateUser(_id, user) {
    await prisma.user.update({
      where: {
        id: _id,
      },
      data: {
        id: user._id,
        name: user.name,
        color: user.color,
        flags: user.flags,
      },
    });
  }

  static async deleteUser(_id) {
    await prisma.user.delete({
      where: {
        id: _id,
      },
    });
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
