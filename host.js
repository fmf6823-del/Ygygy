// ---- ViewOnly Host ----
// This page only ever SENDS video. It never reads input from the viewer.
// There is no data channel, no remote-control logic of any kind here.

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

function randomCode() {
  // Short, easy-to-share code instead of PeerJS's default long UUID.
  return Math.random().toString(36).slice(2, 10);
}

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
      endSessionCompletely("Session time limit reached (2 minutes).");
    }
  }, 1000);
}

function stopCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = null;
  timerEl.style.display = "none";
}

function initPeer() {
  const code = randomCode();
  peer = new Peer(code, {
    debug: 1,
  });

  peer.on("open", (id) => {
    idBox.textContent = id;
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    setStatus("off", "Connection error — refresh to retry");
  });

  // A viewer is calling us. Only accept one viewer at a time.
  peer.on("call", (call) => {
    if (!localStream) {
      call.close(); // not sharing right now, reject
      return;
    }
    if (activeCall) {
      call.close(); // already have a viewer, reject additional
      return;
    }
    activeCall = call;
    call.answer(localStream); // we send video, we never request theirs

    setStatus("live", "Viewer connected");
    watchingBanner.style.display = "flex";
    startCountdown();

    call.on("close", () => {
      handleViewerDisconnected();
    });
  });
}

function handleViewerDisconnected() {
  activeCall = null;
  watchingBanner.style.display = "none";
  stopCountdown();
  if (localStream) {
    setStatus("waiting", "Sharing — waiting for a viewer");
  }
}

async function startSharing() {
  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 10 },
      audio: false,
    });
  } catch (err) {
    // User cancelled the browser's own share picker, or denied it.
    console.warn("Screen share cancelled:", err);
    return;
  }

  // If the user stops sharing from the browser's own "Stop sharing" control,
  // end everything on our side too.
  localStream.getVideoTracks()[0].addEventListener("ended", () => {
    endSessionCompletely("Screen sharing was stopped.");
  });

  startBtn.style.display = "none";
  endBtn.style.display = "block";
  setStatus("waiting", "Sharing — waiting for a viewer");

  if (!peer) initPeer();
}

function endSessionCompletely(reason) {
  stopCountdown();

  if (activeCall) {
    activeCall.close();
    activeCall = null;
  }
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
endBtn.addEventListener("click", () => endSessionCompletely("Session ended by host."));

initPeer();
