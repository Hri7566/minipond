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
};

function broadcastChat(str) {
  for (const ws of wss.clients) {
    if (!ws.client.destroyed) {
      ws.client.sendChatMessage(serverParticipant, str);
    }
  }
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

    console.log(this.ip);
  }

  sendArray(msgs) {
    try {
      this.ws.send(JSON.stringify(msgs));
    } catch (err) {
      console.error(err);
    }
  }

  destroy() {
    this.ws.close();
    this.removeAllListeners();
    this.destroyed = true;
  }

  bindEventListeners() {
    this.ws.on("message", (data, isBinary) => {
      if (isBinary) return;

      try {
        let msgs = JSON.parse(data.toString());

        for (const msg of msgs) {
          this.emit(msg.m, msg);
        }
      } catch (err) {}
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

    this.on("a", (msg) => {});
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
