// ---- ViewOnly Viewer ----
// This page only ever RECEIVES video. It has no capability to send input,
// commands, or control of any kind back to the host — there is no data
// channel and no code path that could send clicks/keys/taps.

const SESSION_SECONDS = 120;

const codeInput = document.getElementById("code-input");
const connectBtn = document.getElementById("connect-btn");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const timerEl = document.getElementById("timer");
const video = document.getElementById("remote-video");
const endBtn = document.getElementById("end-btn");

let peer = null;
let activeCall = null;
let countdownInterval = null;
let secondsLeft = SESSION_SECONDS;

function setStatus(dotClass, text) {
  statusDot.className = "dot " + dotClass;
  statusText.textContent = text;
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function startCountdown() {
  secondsLeft = SESSION_SECONDS;
  timerEl.style.display = "block";
  timerEl.textContent = formatTime(secondsLeft);
  timerEl.classList.remove("warn");

  countdownInterval = setInterval(() => {
    secondsLeft -= 1;
    timerEl.textContent = formatTime(secondsLeft);
    if (secondsLeft <= 20) timerEl.classList.add("warn");
    if (secondsLeft <= 0) {
      disconnect("Session time limit reached (2 minutes).");
    }
  }, 1000);
}

function stopCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = null;
  timerEl.style.display = "none";
}

function initPeer() {
  peer = new Peer(undefined, { debug: 1 });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    setStatus("off", "Connection error — check the code and try again");
  });
}

function connect() {
  const hostId = codeInput.value.trim();
  if (!hostId) return;

  if (!peer) initPeer();

  setStatus("waiting", "Connecting…");
  connectBtn.disabled = true;

  // We call the host with an empty stream: we send nothing, we only
  // want to receive their video track back.
  const emptyStream = new MediaStream();
  activeCall = peer.call(hostId, emptyStream);

  if (!activeCall) {
    setStatus("off", "Could not start call — check the code");
    connectBtn.disabled = false;
    return;
  }

  activeCall.on("stream", (remoteStream) => {
    video.srcObject = remoteStream;
    video.style.display = "block";
    endBtn.style.display = "block";
    connectBtn.style.display = "none";
    codeInput.disabled = true;
    setStatus("live", "Watching — view only");
    startCountdown();
  });

  activeCall.on("close", () => {
    disconnect("Host ended the session.");
  });

  activeCall.on("error", (err) => {
    console.error("Call error:", err);
    disconnect("Connection error.");
  });
}

function disconnect(reason) {
  stopCountdown();

  if (activeCall) {
    activeCall.close();
    activeCall = null;
  }
  video.srcObject = null;
  video.style.display = "none";
  endBtn.style.display = "none";
  connectBtn.style.display = "block";
  connectBtn.disabled = false;
  codeInput.disabled = false;

  setStatus("off", reason || "Disconnected");
}

connectBtn.addEventListener("click", connect);
endBtn.addEventListener("click", () => disconnect("Viewing ended by you."));
