# 🎧 AuxParty — Stream Together in 320kbps HIFI

> **Pass the Aux.** Synchronized music streaming for you and your friends with zero subscriptions, zero ads, and 100% uptime.

![AuxParty Banner](https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80)

---

## ✨ Features

- **🚀 100% Uptime & Zero Play Failures:** Streams high-bitrate **320kbps AAC/MP4** directly from enterprise Akamai and Microsoft Azure CDN edges (`Access-Control-Allow-Origin: *`). No volunteer scraper proxies that get rate-limited.
- **👥 Peer-to-Peer Sync Rooms:**
  - Create a room and get a unique 6-character room code (e.g. `AUX-7892`).
  - Friends join via room code or direct shareable URL (`/?room=AUX789`).
  - **Lockstep Sync:** Play/pause, track changes, and scrubber seeks are synchronized in real-time with sub-second latency compensation over WebRTC data channels.
  - **Live Room Chat & Floating Reactions:** Send live floating emojis (🔥, ❤️, ⚡, 🎧, 🎉) and chat while jamming.
- **🟢 Instant Spotify Playlist Import:**
  - Paste any public Spotify playlist URL (e.g. `https://open.spotify.com/playlist/...`).
  - Extracts track metadata and automatically matches songs against the 320kbps streaming engine.
  - 1-click **Play All** or **Add All to Queue**.
- **🌊 Real-time Audio Spectrum Visualizer:** Built with the HTML5 Web Audio API and Canvas. Dynamic frequency equalizer reacts in real-time to the rhythm.
- **📱 Lock-Screen & Media Keys Integration:** Uses the native `navigator.mediaSession` API. Artwork, song titles, and hardware play/pause/skip buttons work right on your phone lock screen and keyboard media keys.
- **🎨 Spotify / Apple Music-grade Dark Aesthetic:** Sleek glassmorphism, responsive grid & list views, up-next queue drawer, and an immersive fullscreen view with dynamic album color blooms.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Real-Time Sync:** WebRTC via PeerJS (P2P mesh, 0 backend servers needed)
- **Audio Engine:** HTML5 Audio + Web Audio API AnalyserNode
- **Cryptography:** CryptoJS (client-side & edge DES-ECB stream decryption)

---

## 🚀 Quick Start (Local)

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd auxparty
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Listen with friends:**
   - Click **"Listen With Friends"** in the top navigation.
   - Click **"Host a Party"** -> Copy your 6-character Room Code or Invite Link.
   - Send the link to your friends. When they join, they'll be in sync with you!

---

## 🌐 Deploy in 1-Click for Free (Vercel)

AuxParty includes built-in serverless edge handlers in `/api`:

1. Push this repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Framework Preset: **Vite**.
4. Click **Deploy**. Done!
