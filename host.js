// ---- ViewOnly Host (patched) ----
const SESSION_SECONDS = 120;

const idBox = document.getElementById("session-id");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const startBtn = document.getElementById("start-btn");
const endBtn = document.getElementById("end-btn");
const watchingBanner = document.getElementById("watching-banner");
const timerEl = document.getElementById("timer");

let peer = null;
let localStream = null;
let activeCall = null;
let countdownInterval = null;
let secondsLeft = SESSION_SECONDS;
let peerReady = false;

function makeCode() {
  return Math.random().toString(36).slice(2, 8);
}

function setStatus(dotClass, text) {
  statusDot.className = "dot " + dotClass;
  statusText.textContent = text;
  console.log("[HOST]", text);
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
    if (secondsLeft <= 0) endSessionCompletely("Session time limit reached.");
  }, 1000);
}

function stopCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = null;
  timerEl.style.display = "none";
}

function createPeerWithRetry(attempt = 0) {
  const code = makeCode();
  idBox.textContent = "connecting…";
  peerReady = false;

  const p = new Peer(code, { debug: 2 });

  p.on("open", (id) => {
    peer = p;
    peerReady = true;
    idBox.textContent = id;
    setStatus("waiting", "Ready — code shown above");
  });

  p.on("error", (err) => {
    console.error("[HOST] peer error:", err.type, err);
    if (err.type === "unavailable-id" && attempt < 5) {
      p.destroy();
      createPeerWithRetry(attempt + 1);
      return;
    }
    setStatus("off", "Connection error: " + (err.type || "unknown"));
  });

  p.on("call", (call) => {
    if (!localStream) {
      call.close();
      console.warn("[HOST] rejected call — not sharing");
      return;
    }
    if (activeCall) {
      call.close();
      console.warn("[HOST] rejected call — already have a viewer");
      return;
    }
    activeCall = call;
    call.answer(localStream);
    setStatus("live", "Viewer connected");
    watchingBanner.style.display = "flex";
    startCountdown();

    call.on("close", () => {
      activeCall = null;
      watchingBanner.style.display = "none";
      stopCountdown();
      if (localStream) setStatus("waiting", "Sharing — waiting for a viewer");
    });
    call.on("error", (e) => console.error("[HOST] call error", e));
  });
}

async function startSharing() {
  if (!peerReady) {
    setStatus("off", "Still connecting to server… try again in a second");
    return;
  }
  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 10 },
      audio: false,
    });
  } catch (err) {
    console.warn("[HOST] share cancelled", err);
    return;
  }

  localStream.getVideoTracks()[0].addEventListener("ended", () => {
    endSessionCompletely("Screen sharing stopped.");
  });

  startBtn.style.display = "none";
  endBtn.style.display = "block";
  setStatus("waiting", "Sharing — waiting for a viewer");
}

function endSessionCompletely(reason) {
  stopCountdown();
  if (activeCall) { activeCall.close(); activeCall = null; }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  watchingBanner.style.display = "none";
  startBtn.style.display = "block";
  endBtn.style.display = "none";
  setStatus("off", reason || "Session ended");
}

startBtn.addEventListener("click", startSharing);
endBtn.addEventListener("click", () => endSessionCompletely("Ended by host."));

createPeerWithRetry();
