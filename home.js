import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDOXOPgWM7EPurLKw2FtOE-wQAY5wJ01ow",
  authDomain: "acc-tracker-1135c.firebaseapp.com",
  databaseURL:
    "https://acc-tracker-1135c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "acc-tracker-1135c",
  storageBucket: "acc-tracker-1135c.firebasestorage.app",
  messagingSenderId: "1084871819106",
  appId: "1:1084871819106:web:31524e3f45d9324efcf63b",
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const PATH = "tournaments/acc";
const root = ref(db, PATH);

const seed = () => ({
  groupA: {
    teams: ["ACC Wingers", "Zero Heros", "Meow-Meow"],
    matches: [
      {
        id: "A1",
        home: "ACC Wingers",
        away: "Zero Heros",
        homeScore: null,
        awayScore: null,
      },
      {
        id: "A2",
        home: "ACC Wingers",
        away: "Meow-Meow",
        homeScore: null,
        awayScore: null,
      },
      {
        id: "A3",
        home: "Zero Heros",
        away: "Meow-Meow",
        homeScore: null,
        awayScore: null,
      },
    ],
  },
  groupB: {
    teams: ["Crazy Team", "NAZI's FC", "Destroyers"],
    matches: [
      {
        id: "B1",
        home: "Crazy Team",
        away: "NAZI's FC",
        homeScore: null,
        awayScore: null,
      },
      {
        id: "B2",
        home: "Crazy Team",
        away: "Destroyers",
        homeScore: null,
        awayScore: null,
      },
      {
        id: "B3",
        home: "NAZI's FC",
        away: "Destroyers",
        homeScore: null,
        awayScore: null,
      },
    ],
  },
  knockout: {
    semi1: { home: null, away: null, homeScore: null, awayScore: null },
    semi2: { home: null, away: null, homeScore: null, awayScore: null },
    final: { home: null, away: null, homeScore: null, awayScore: null },
  },
});

async function ensureSeed() {
  const s = await get(root);
  if (!s.exists()) await set(root, seed());
}

const calc = (group) => {
  const S = {};
  group.teams.forEach(
    (t) =>
      (S[t] = {
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      })
  );
  group.matches.forEach((m) => {
    if (m.homeScore != null && m.awayScore != null) {
      const hs = +m.homeScore,
        as = +m.awayScore;
      const h = S[m.home],
        a = S[m.away];
      h.played++;
      a.played++;
      h.goalsFor += hs;
      h.goalsAgainst += as;
      a.goalsFor += as;
      a.goalsAgainst += hs;
      if (hs > as) {
        h.won++;
        h.points += 3;
        a.lost++;
      } else if (hs < as) {
        a.won++;
        a.points += 3;
        h.lost++;
      } else {
        h.drawn++;
        a.drawn++;
        h.points++;
        a.points++;
      }
      h.goalDiff = h.goalsFor - h.goalsAgainst;
      a.goalDiff = a.goalsFor - a.goalsAgainst;
    }
  });
  return Object.entries(S)
    .map(([team, stats]) => ({ team, ...stats }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor
    );
};

const table = (rows, complete = false) => `
      <table>
        <thead>
          <tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (t, i) => `
            <tr>
              <td class="pos">${i + 1}</td>
              <td>${t.team}${
                complete && i < 2 ? '<span class="q">Q</span>' : ""
              }</td>
              <td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${
                t.lost
              }</td>
              <td>${t.goalsFor}</td><td>${t.goalsAgainst}</td>
              <td class="gd ${
                t.goalDiff > 0 ? "pos" : t.goalDiff < 0 ? "neg" : ""
              }">${t.goalDiff > 0 ? "+" : ""}${t.goalDiff}</td>
              <td style="font-weight:800">${t.points}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;

const list = (matches) =>
  matches
    .map(
      (m) => `
      <div class="fixture">
        <div>${m.home} <span style="opacity:.6">VS</span> ${m.away}</div>
        <div class="score">${m.homeScore ?? "-"} - ${m.awayScore ?? "-"}</div>
      </div>`
    )
    .join("");

// KO: show PATHS first; switch to real teams when groups complete
function renderKO(data) {
  const koSection = document.getElementById("koSection");
  const ko = document.getElementById("ko");
  const hint = document.getElementById("koHint");

  try {
    const Acomplete = data.groupA.matches.every(
      (m) => m.homeScore != null && m.awayScore != null
    );
    const Bcomplete = data.groupB.matches.every(
      (m) => m.homeScore != null && m.awayScore != null
    );

    // defaults: show paths
    let s1Home = "1A",
      s1Away = "2B";
    let s2Home = "1B",
      s2Away = "2A";
    let finalHome = "Winner SF1",
      finalAway = "Winner SF2";

    // If complete, derive real teams
    if (Acomplete && Bcomplete) {
      const A = calc(data.groupA);
      const B = calc(data.groupB);
      s1Home = A[0]?.team || s1Home; // 1A
      s1Away = B[1]?.team || s1Away; // 2B
      s2Home = B[0]?.team || s2Home; // 1B
      s2Away = A[1]?.team || s2Away; // 2A

      const s1 = data.knockout?.semi1 || {};
      const s2 = data.knockout?.semi2 || {};
      if (s1.homeScore != null && s1.awayScore != null)
        finalHome = +s1.homeScore > +s1.awayScore ? s1Home : s1Away;
      if (s2.homeScore != null && s2.awayScore != null)
        finalAway = +s2.homeScore > +s2.awayScore ? s2Home : s2Away;

      hint.textContent = ""; // hide path hint once teams are known
    } else {
      // Show a small hint explaining the path mapping
      hint.textContent =
        "Path: 1A = Group A Winner, 2A = Group A Runner-up, 1B = Group B Winner, 2B = Group B Runner-up.";
    }

    const s = (h, a) =>
      h != null && a != null
        ? `${h} - ${a}`
        : `<span class="pending">vs</span>`;
    const s1 = data.knockout?.semi1 || {};
    const s2 = data.knockout?.semi2 || {};
    const f = data.knockout?.final || {};

    ko.innerHTML = `
          <div class="match">
            <div>${s1Home} (1A)</div>
            <div class="score">${s(s1.homeScore, s1.awayScore)}</div>
            <div>${s1Away} (2B)</div>
          </div>
          <div class="match">
            <div>${s2Home} (1B)</div>
            <div class="score">${s(s2.homeScore, s2.awayScore)}</div>
            <div>${s2Away} (2A)</div>
          </div>
          <div class="match" style="background:#191b2b;border:1px solid rgba(255,255,255,.08)">
            <div>${finalHome}</div>
            <div class="score">${s(f.homeScore, f.awayScore)}</div>
            <div>${finalAway}</div>
          </div>
          ${
            f.homeScore != null && f.awayScore != null
              ? `
            <div class="match" style="background:linear-gradient(90deg,#FFD700,#FFA500);justify-content:center;color:#2b1800;font-weight:900">
              🏆 CHAMPION: ${
                +f.homeScore > +f.awayScore ? finalHome : finalAway
              }
            </div>`
              : ``
          }
        `;

    koSection.style.display = "block";
  } catch (e) {
    console.error("KO render error", e);
    koSection.style.display = "none";
  }
}

function renderAll(d) {
  const A = calc(d.groupA),
    B = calc(d.groupB);
  const Aok = d.groupA.matches.every(
    (m) => m.homeScore != null && m.awayScore != null
  );
  const Bok = d.groupB.matches.every(
    (m) => m.homeScore != null && m.awayScore != null
  );
  document.getElementById("sa").innerHTML = table(A, Aok);
  document.getElementById("sb").innerHTML = table(B, Bok);
  document.getElementById("fa").innerHTML = list(d.groupA.matches);
  document.getElementById("fb").innerHTML = list(d.groupB.matches);
  renderKO(d);
  document.getElementById("ts").textContent =
    "Last updated: " + new Date().toLocaleString();
}

onValue(root, (s) => {
  const d = s.val();
  if (d) renderAll(d);
});
ensureSeed();
