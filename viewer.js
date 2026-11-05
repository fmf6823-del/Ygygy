// ---- ViewOnly Viewer (patched) ----
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
let connectTimeout = null;

function setStatus(dotClass, text) {
  statusDot.className = "dot " + dotClass;
  statusText.textContent = text;
  console.log("[VIEWER]", text);
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
    if (secondsLeft <= 0) disconnect("Time limit reached.");
  }, 1000);
}

function stopCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = null;
  timerEl.style.display = "none";
}

function initPeer() {
  return new Promise((resolve, reject) => {
    peer = new Peer(undefined, { debug: 2 });
    peer.on("open", () => resolve());
    peer.on("error", (err) => {
      console.error("[VIEWER] peer error:", err);
      reject(err);
    });
  });
}

async function connect() {
  const hostId = codeInput.value.trim().toLowerCase();
  if (!hostId) { setStatus("off", "Enter a code first"); return; }

  connectBtn.disabled = true;
  setStatus("waiting", "Connecting to server…");

  try {
    if (!peer) await initPeer();
  } catch (e) {
    setStatus("off", "Could not reach server. Refresh & retry.");
    connectBtn.disabled = false;
    return;
  }

  setStatus("waiting", "Calling host…");
  const emptyStream = new MediaStream();
  activeCall = peer.call(hostId, emptyStream);

  if (!activeCall) {
    setStatus("off", "Bad code — try again");
    connectBtn.disabled = false;
    return;
  }

  connectTimeout = setTimeout(() => {
    if (!video.srcObject) {
      disconnect("Host didn't respond. Check the code / host is sharing.");
    }
  }, 15000);

  activeCall.on("stream", (remoteStream) => {
    clearTimeout(connectTimeout);
    video.srcObject = remoteStream;
    video.style.display = "block";
    endBtn.style.display = "block";
    connectBtn.style.display = "none";
    codeInput.disabled = true;
    setStatus("live", "Watching — view only");
    startCountdown();
  });

  activeCall.on("close", () => disconnect("Host ended the session."));
  activeCall.on("error", (err) => {
    console.error("[VIEWER] call error:", err);
    disconnect("Connection error: " + (err.type || "unknown"));
  });
}

function disconnect(reason) {
  clearTimeout(connectTimeout);
  stopCountdown();
  if (activeCall) { activeCall.close(); activeCall = null; }
  video.srcObject = null;
  video.style.display = "none";
  endBtn.style.display = "none";
  connectBtn.style.display = "block";
  connectBtn.disabled = false;
  codeInput.disabled = false;
  setStatus("off", reason || "Disconnected");
}

connectBtn.addEventListener("click", connect);
endBtn.addEventListener("click", () => disconnect("Ended by you."));
