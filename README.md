# ACC Premier League

A lightweight web app for managing and displaying a community football tournament: group standings, fixtures, and knockout bracket — with a simple admin panel backed by Firebase.

**Live Demo:** [https://accpremierleague.netlify.app](https://accpremierleague.netlify.app)

---

## ✨ Features

* **Public site**

  * Group A & Group B **standings** (auto‑calculated points, wins/draws/losses, goal difference).
  * Group **fixtures/results** for both groups.
  * **Knockout bracket** (hidden until the group stage is completed, then revealed/seeded).
  * "Last updated" timestamp so viewers know when data changed.
* **Admin panel**

  * Update match results and standings.
  * Optionally lock group stage and **auto‑promote** teams to the knockout stage.
  * Built with plain HTML/CSS/JS for speed; Firebase for storage/auth.
* **Deployment**

  * Static hosting (Netlify). No build step required.
* **Performance & UX**

  * Mobile‑first layout, simple CSS, minimal JS.

> *Note:* The repo is a static site (HTML/CSS/JS) that talks directly to Firebase; there’s no custom backend server.

---

## 🧱 Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend (BaaS):** Firebase (Web SDK v9)

  * Firestore *or* Realtime Database (choose one — see data model below)
  * Optional: Firebase Authentication (Email/Password) for the admin page
* **Hosting:** Netlify

---

## 📁 Project Structure

```
acc-premier-league/
├─ index.html        # Public homepage (standings, fixtures, knockout)
├─ home.js           # Public site logic (load & render data)
├─ style.css         # Global styles for public site
├─ admin.html        # Admin dashboard (protected area)
├─ admin.js          # Admin logic (writes to Firebase)
└─ admin.css         # Admin styles
```

> Your repository currently exposes these files at the root. If you add images, use an `/assets` folder and reference relatively (e.g., `./assets/screenshot-home.png`).

---

## ⚙️ Firebase Setup

1. **Create a Firebase Project** at [https://console.firebase.google.com](https://console.firebase.google.com).

2. **Add a Web App** (`</>`), copy the config object.

3. **Enable products:**

   * **Firestore** (or **Realtime Database**). Create the DB in production mode, then lock it down (see Security section).
   * **Authentication** → **Sign‑in method** → enable **Email/Password** (if you want login for `/admin.html`).

4. **Add your config to the app**

   * Easiest: create a new file `firebaseConfig.js` with:

     ```html
     <script>
       // NEVER commit real keys in public repos if you can avoid it.
       // Consider using Netlify environment variables instead (see Deployment).
       window.__FIREBASE_CONFIG__ = {
         apiKey: "...",
         authDomain: "...",
         projectId: "...",
         storageBucket: "...",
         messagingSenderId: "...",
         appId: "...",
         databaseURL: "..." // if using Realtime DB
       };
     </script>
     ```
   * Then in your JS you can read it as `const cfg = window.__FIREBASE_CONFIG__`.

5. **Initialize Firebase** in `home.js` and `admin.js` using the modular v9 API, e.g.:

   ```js
   // firebase-init.js (optional helper you import first)
   import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
   import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"; // or getDatabase

   const app = initializeApp(window.__FIREBASE_CONFIG__);
   export const db = getFirestore(app); // or getDatabase(app)
   ```

---

## 🗂️ Data Model (example)

You can do this in **Firestore** or **Realtime DB**. Below are examples for both — pick one and stay consistent.

### Option A — Firestore (recommended)

```
collections
├─ teams (id: "TEAM_ID")
│  ├─ name: string
│  ├─ group: "A" | "B"
│  ├─ played: number, won: number, draw: number, lost: number
│  ├─ goalsFor: number, goalsAgainst: number, goalDiff: number, points: number
│
├─ matches (id: auto)
│  ├─ group: "A" | "B"
│  ├─ date: timestamp
│  ├─ homeTeamId: ref(teams)
│  ├─ awayTeamId: ref(teams)
│  ├─ homeScore: number, awayScore: number
│  ├─ status: "scheduled" | "finished"
│
└─ knockout (id: round)
   ├─ round: "semi1" | "semi2" | "final"
   ├─ homeTeamId: ref(teams) | null
   ├─ awayTeamId: ref(teams) | null
   ├─ homeScore: number | null
   ├─ awayScore: number | null
   ├─ locked: boolean      # prevent edits once set
```

### Option B — Realtime Database

```
{
  "teams": {
    "TEAM_ID": {
      "name": "...",
      "group": "A",
      "played": 0,
      "won": 0, "draw": 0, "lost": 0,
      "goalsFor": 0, "goalsAgainst": 0, "goalDiff": 0,
      "points": 0
    }
  },
  "matches": {
    "MATCH_ID": {
      "group": "A",
      "date": 1736553600000,
      "homeTeamId": "TEAM_ID",
      "awayTeamId": "TEAM_ID",
      "homeScore": 2,
      "awayScore": 1,
      "status": "finished"
    }
  },
  "knockout": {
    "semi1": { "homeTeamId": null, "awayTeamId": null, "homeScore": null, "awayScore": null, "locked": false },
    "semi2": { ... },
    "final": { ... }
  }
}
```

---

## 🔐 Security Rules (starter)

Adjust these to your exact needs.

### Firestore rules (read‑only public, admin writes)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }

    match /{document=**} {
      allow read: if true;           // public can read
      allow write: if isAdmin();      // only admins can write
    }
  }
}
```

> Add a custom claim `admin=true` to your admin user(s) via Firebase Admin SDK or Cloud Functions.

### Realtime DB rules (equivalent)

```json
{
  "rules": {
    ".read": true,
    ".write": "auth != null && auth.token.admin === true"
  }
}
```

---

## 🖥️ Local Development

* Use **VS Code Live Server** extension or any static server.
* Open `index.html` and ensure your `firebaseConfig.js` is included **before** other scripts.
* If you use ES Modules from the Firebase CDN, add `type="module"` to your `<script>` tags in `index.html`/`admin.html`.

Example snippet:

```html
<script src="./firebaseConfig.js"></script>
<script type="module" src="./home.js"></script>
```

---

## 🚀 Deploying to Netlify

1. **New Site from Git** → select this repo.
2. Build/Deploy settings:

   * Build command: *none*
   * Publish directory: `/` (root)
3. **Environment Variables** (recommended):

   * In **Site settings → Environment variables**, add your Firebase keys (e.g., `VITE_FIREBASE_API_KEY`, etc.)
   * Inject them via an inline script on Netlify using `window.__FIREBASE_CONFIG__ = { ...process.env vars... }` or prerender a small JS snippet via a build step. For pure static, you can paste config while keeping rules locked down.
4. **Firebase CORS & Rules:** If you see permission errors, revisit your rules above and ensure the project has the right origins allowed.

---

## 👩‍💻 Admin Workflow (suggested)

1. Log into `/admin.html` (if Auth enabled) with an admin account.
2. Update match results; the app recalculates standings (P, W, D, L, GF, GA, GD, Pts).
3. When all group matches are `finished`, click **Lock Group Stage** → app seeds **semi‑finals** and keeps the **Final** placeholder empty until semi‑finals are finished.
4. When knockouts finish, lock the bracket to freeze edits.

---

## 🧪 Testing checklist

* [ ] Standings table sorts by **points**, then **goal difference**, then **goals for**.
* [ ] Fixtures list updates the same team stats only once per result.
* [ ] Knockout stage remains **hidden** until groups are locked.
* [ ] Admin is **authenticated**, and writes are blocked for non‑admins by rules.
* [ ] Works on **mobile** (≤ 400px wide) and desktop.

---

## 📸 Screenshots (add yours)

Place images in `./assets/` and reference them here:

* **Home — Standings & Fixtures**

* **Admin — Update Results**

* **Knockout Bracket*

---

## 🧭 Roadmap / Ideas

* Export standings & fixtures to CSV
* Match timeline & scorers per game
* Dark mode toggle
* Role‑based admin (super admin vs editor)
* CI: Deploy previews on pull requests (Netlify)

---

## 🤝 Contributing

PRs welcome! Please open an issue first to discuss major changes.

---

## 📝 License

If you intend others to reuse, add a license (e.g., MIT). Otherwise GitHub defaults to “All rights reserved”.

---

## 🙏 Acknowledgments

* Firebase Web SDK team & docs
* Netlify static hosting
  
