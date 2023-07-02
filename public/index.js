// Create & connect a client to the WebSocket server
const protocol = window.location.protocol == "https:" ? "wss:" : "ws:";
const port = window.location.port;
const cl = new Client(
  `${protocol}//${window.location.hostname}:${window.location.port}`
);

function sendChatMessage(str) {
  // Send message to server
  cl.sendArray([
    {
      m: "a",
      message: str,
    },
  ]);
}

function renderChatMessage(msg) {
  // Add chat message to #chat-list
  const li = $(
    `<li><span class="name"></span> <span class="message"></span></li>`
  );

  li.find(".name").text(msg.p.name + ":");
  li.find(".message").text(msg.a);
  li.css("color", msg.p.color || "white");

  $("#chat ul").append(li);

  console.log(msg);
}

// Wait until document is loaded
$(() => {
  cl.start();

  // Page-specific events
  cl.on("connected", () => {
    console.log("Connected");
  });

  cl.on("a", (msg) => {
    // Render chat message
    renderChatMessage(msg);
  });

  $("#chat-input").on("keydown", (evt) => {
    if (evt.originalEvent.key == "Enter") {
      // Submit message & clear
      sendChatMessage($("#chat-input").val());
      $("#chat-input").val("");
    }
  });

  // Chat history
  cl.on("c", (msg) => {
    console.log(msg);
    if (!msg.c) return;

    for (const a of msg.c) {
      // Pretend to receive this chat message
      renderChatMessage(a);
    }
  });
});
