# ViewOnly — Consent-based, View-Only Screen Sharing

A minimal, educational, view-only screen-sharing tool. The viewer can **only
watch** — there is no input channel, no remote control, no data channel at
all. Video flows peer-to-peer over WebRTC (DTLS-SRTP), so it's end-to-end
encrypted by default.

## How it works

- `host.html` / `host.js` — the person sharing their screen. Clicking
  "Start Sharing" triggers the **browser's own** screen-share picker (not
  controllable or hideable by this code). A random session code is
  generated and shown for the viewer to enter.
- `viewer.html` / `viewer.js` — the person watching. They enter the host's
  code, connect, and see a read-only `<video>` element. No input is ever
  sent — the code path to do so doesn't exist.
- Signaling (helping the two browsers find each other) is handled by
  [PeerJS](https://peerjs.com/)'s free public broker — it only sees
  connection metadata, never your video.
- Both sides enforce a hard 2-minute timer and a manual "End" button.

## Deploying on Netlify

1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project → pick the repo**.
3. Build settings: leave the build command blank, set the publish directory
   to `/` (the repo root) — this is a static site, nothing to build.
4. Deploy. You'll get a URL like `https://your-site.netlify.app`.

## Testing

1. Open the Netlify URL on Device A → click **Host** → **Start Sharing** →
   approve the browser's screen-share prompt.
2. Open the Netlify URL on Device B → click **Viewer** → enter Device A's
   session code → **Connect**.
3. Device B sees a live, read-only view of Device A's screen. Either side
   can press **End**, or it auto-disconnects after 2 minutes.

## Limitations / honesty notes

- This is a prototype for learning/testing, not a hardened product. Don't
  use it for anything sensitive without a security review.
- The session code is short and human-shareable, not a cryptographic
  secret — treat it like a meeting ID, not a password. Don't deploy this
  publicly with real users without adding stronger auth and rate limiting.
- PeerJS's public broker is fine for testing; for production use, consider
  self-hosting a PeerServer or your own signaling server.
- The host's screen-share indicator is enforced by the browser/OS and
  cannot be suppressed — that's intentional and is what keeps this
  consent-based.
