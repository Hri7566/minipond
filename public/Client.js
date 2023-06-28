// Utility event class (supports once!)
class EventEmitter {
  constructor() {
    this._events = {};
  }

  on(evtn, func) {
    if (!this._events[evtn]) this._events[evtn] = [];

    this._events[evtn].push({
      once: false,
      func,
    });
  }

  off(evtn, func) {
    if (!this._events[evtn]) return;

    for (const ev of this._events[evtn]) {
      if (ev.func == func) {
        this._events[evtn].splice(this._events[evtn].indexOf(ev), 1);
      }
    }
  }

  once(evtn, func) {
    // Kinda repeating myself, but it will do
    if (!this._events[evtn]) this._events[evtn] = [];

    this._events[evtn].push({
      once: true,
      func,
    });
  }

  emit(evtn, ...args) {
    if (!this._events[evtn]) return;

    for (const ev of this._events[evtn]) {
      ev.func(...args);

      if (ev.once) {
        this.off(evtn, ev.func);
      }
    }
  }
}

// WebSocket Client
class Client extends EventEmitter {
  constructor(uri) {
    super();
    this.uri = uri;
    this.ws = undefined;
    this.started = false;

    this.bindEventListeners();
  }

  start() {
    // Start the client
    if (this.started) return false;
    this.started = true;
    this.connect();
    return true;
  }

  stop() {
    // Stop the client
    if (!this.started) return false;

    if (this.ws) {
      delete this.ws;
    }

    return true;
  }

  connect() {
    // Connect to the websocket server
    if (!this.started) return;

    this.emit("status", "Connecting...");
    this.ws = new WebSocket(this.uri);

    // Add WebSocket listeners
    this.ws.addEventListener("open", () => {
      this.emit("connected");

      // Send handshake message
      this.sendArray([{ m: "hi" }]);

      this.pingInterval = setInterval(() => {
        // Ping server every 20s
        this.sendArray([{ m: "t", e: Date.now() }]);
      }, 20000);
    });

    this.ws.addEventListener("close", () => {
      clearInterval(this.pingInterval);
      setTimeout(() => {
        this.connect();
      }, 1000);
    });

    this.ws.addEventListener("message", (evt) => {
      try {
        const messages = JSON.parse(evt.data);

        for (const msg of messages) {
          /**
           * "m" for message type...
           * not very sophisticated,
           * but an old service i
           * used had this, and,
           * even though it's a bad
           * habit, i still use it
           * to this day...
           * "security by obscurity"
           */

          this.emit(msg.m, msg);
        }
      } catch (err) {
        console.error(err);
      }
    });

    this.ws.addEventListener("error", (error) => {
      this.emit("wserror", error);
    });
  }

  bindEventListeners() {}

  sendArray(msgs) {
    if (!this.ws) return;
    if (this.ws.readyState == WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msgs));
    }
  }
}
