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

// Wait until document is loaded
$(() => {
  cl.start();

  // Page-specific events
  cl.on("connected", () => {
    console.log("Connected");
  });

  $("#chat-input").on("keydown", (evt) => {
    if (evt.originalEvent.key == "Enter") {
      // Submit message & clear
      sendChatMessage($("#chat-input").val());
      $("#chat-input").val("");
    }
  });
});
