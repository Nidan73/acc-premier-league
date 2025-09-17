import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

/* Firebase (yours) */
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

/* Auth (UI gate only) */
const CREDS = { username: "Nidan", password: "ACC2025" };
if (sessionStorage.getItem("admin") === "1") showPanel();

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;
  if (u === CREDS.username && p === CREDS.password) {
    sessionStorage.setItem("admin", "1");
    showPanel();
  } else {
    const er = document.getElementById("err");
    er.style.display = "block";
    setTimeout(() => (er.style.display = "none"), 1800);
  }
});
function showPanel() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("panel").style.display = "block";
}
function logout() {
  sessionStorage.removeItem("admin");
  location.reload();
}

/* Seed & helpers */
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

const calcStandings = (group) => {
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

/* UI builders */
function renderGroup(matches, key, mountId) {
  const m = document.getElementById(mountId);
  m.innerHTML = matches
    .map(
      (x, i) => `
        <div class="match">
          <div class="match-head">Match ${x.id}</div>
          <div class="cols">
            <div class="team">
              <label>${x.home}</label>
              <input id="${key}-h-${i}" class="score" inputmode="numeric" type="number" min="0" value="${
        x.homeScore ?? ""
      }" placeholder="0"/>
            </div>
            <div class="vs">VS</div>
            <div class="team">
              <label>${x.away}</label>
              <input id="${key}-a-${i}" class="score" inputmode="numeric" type="number" min="0" value="${
        x.awayScore ?? ""
      }" placeholder="0"/>
            </div>
          </div>
          <div class="actions-row">
            <button class="btn btn-ok btn-block" onclick="updateMatch('${key}',${i})">Update Score</button>
            ${
              x.homeScore != null && x.awayScore != null
                ? `<button class="btn btn-warn btn-block" onclick="clearMatch('${key}',${i})">Clear Score</button>`
                : ""
            }
          </div>
        </div>
      `
    )
    .join("");
}

function renderKO(data) {
  const info = document.getElementById("koInfo");
  const wrap = document.getElementById("ko");

  try {
    const Afilled = data.groupA.matches.filter(
      (m) => m.homeScore != null && m.awayScore != null
    ).length;
    const Bfilled = data.groupB.matches.filter(
      (m) => m.homeScore != null && m.awayScore != null
    ).length;
    const Aok = Afilled === data.groupA.matches.length;
    const Bok = Bfilled === data.groupB.matches.length;

    if (!Aok || !Bok) {
      info.style.display = "block";
      info.textContent = `Complete all group matches to unlock knockout. (A: ${Afilled}/${data.groupA.matches.length}, B: ${Bfilled}/${data.groupB.matches.length})`;
      wrap.innerHTML = "";
      return;
    }
    info.style.display = "none";

    const A = calcStandings(data.groupA);
    const B = calcStandings(data.groupB);
    const s1 = data.knockout?.semi1 || {
      homeScore: null,
      awayScore: null,
    };
    const s2 = data.knockout?.semi2 || {
      homeScore: null,
      awayScore: null,
    };
    const f = data.knockout?.final || {
      homeScore: null,
      awayScore: null,
    };

    const s1Home = A[0]?.team || "Winner A";
    const s1Away = B[1]?.team || "Runner B";
    const s2Home = B[0]?.team || "Winner B";
    const s2Away = A[1]?.team || "Runner A";

    let finalHome = "Winner SF1",
      finalAway = "Winner SF2";
    if (s1.homeScore != null && s1.awayScore != null) {
      finalHome = +s1.homeScore > +s1.awayScore ? s1Home : s1Away;
    }
    if (s2.homeScore != null && s2.awayScore != null) {
      finalAway = +s2.homeScore > +s2.awayScore ? s2Home : s2Away;
    }

    const block = (id, hTeam, hVal, aTeam, aVal, stage) => `
          <div class="match" style="background:#0a152c">
            <div class="match-head">${id}</div>
            <div class="cols">
              <div class="team">
                <label>${hTeam}</label>
                <input id="${stage}-h" class="score" type="number" min="0" value="${
      hVal ?? ""
    }" placeholder="0">
              </div>
              <div class="vs">VS</div>
              <div class="team">
                <label>${aTeam}</label>
                <input id="${stage}-a" class="score" type="number" min="0" value="${
      aVal ?? ""
    }" placeholder="0">
              </div>
            </div>
            <div class="actions-row">
              <button class="btn btn-ok btn-block" onclick="updateKO('${stage}')">Update Score</button>
              ${
                hVal != null && aVal != null
                  ? `<button class="btn btn-warn btn-block" onclick="clearKO('${stage}')">Clear Score</button>`
                  : ""
              }
            </div>
          </div>
        `;

    const finalBlock = (home, h, away, a) => `
          <div class="match" style="background:#191b2b;border:1px solid rgba(255,255,255,.08)">
            <div class="match-head">FINAL</div>
            <div class="cols">
              <div class="team">
                <label>${home}</label>
                <input id="f-h" class="score" type="number" min="0" value="${
                  h ?? ""
                }" placeholder="0">
              </div>
              <div class="vs">VS</div>
              <div class="team">
                <label>${away}</label>
                <input id="f-a" class="score" type="number" min="0" value="${
                  a ?? ""
                }" placeholder="0">
              </div>
            </div>
            <div class="actions-row">
              <button class="btn btn-ok btn-block" onclick="updateKO('final')">Update Score</button>
              ${
                h != null && a != null
                  ? `<button class="btn btn-warn btn-block" onclick="clearKO('final')">Clear Score</button>`
                  : ""
              }
            </div>
          </div>
        `;

    wrap.innerHTML = `
          <div class="ko-grid">
            ${block(
              "Semi-Final 1",
              s1Home,
              s1.homeScore,
              s1Away,
              s1.awayScore,
              "sf1"
            )}
            ${block(
              "Semi-Final 2",
              s2Home,
              s2.homeScore,
              s2Away,
              s2.awayScore,
              "sf2"
            )}
          </div>
          ${
            s1.homeScore != null &&
            s1.awayScore != null &&
            s2.homeScore != null &&
            s2.awayScore != null
              ? finalBlock(
                  finalHome,
                  data.knockout?.final?.homeScore,
                  finalAway,
                  data.knockout?.final?.awayScore
                )
              : ""
          }
        `;
  } catch (e) {
    console.error("KO render error:", e);
    wrap.innerHTML = "";
    const info = document.getElementById("koInfo");
    info.style.display = "block";
    info.textContent = "Knockout render error. Check console.";
  }
}

/* Live */
async function ensureSeed() {
  const s = await get(root);
  if (!s.exists()) await set(root, seed());
}
onValue(root, (snap) => {
  const d = snap.val();
  if (!d) return;
  try {
    renderGroup(d.groupA.matches, "groupA", "ga");
    renderGroup(d.groupB.matches, "groupB", "gb");
    renderKO(d);
  } catch (e) {
    console.error(e);
  }
});

ensureSeed();

/* Actions */
function toast() {
  const t = document.getElementById("toast");
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 1200);
}

window.updateMatch = async (group, idx) => {
  if (sessionStorage.getItem("admin") !== "1") return;
  const h = +document.getElementById(`${group}-h-${idx}`).value;
  const a = +document.getElementById(`${group}-a-${idx}`).value;
  if (!Number.isFinite(h) || !Number.isFinite(a) || h < 0 || a < 0) {
    alert("Enter valid scores");
    return;
  }
  await update(ref(db, `${PATH}/${group}/matches/${idx}`), {
    homeScore: h,
    awayScore: a,
  });
  await update(ref(db, `${PATH}/knockout`), {
    "semi1/homeScore": null,
    "semi1/awayScore": null,
    "semi2/homeScore": null,
    "semi2/awayScore": null,
    "final/homeScore": null,
    "final/awayScore": null,
  });
  toast();
};

window.clearMatch = async (group, idx) => {
  if (!confirm("Clear this match?")) return;
  await update(ref(db, `${PATH}/${group}/matches/${idx}`), {
    homeScore: null,
    awayScore: null,
  });
  await update(ref(db, `${PATH}/knockout`), {
    "semi1/homeScore": null,
    "semi1/awayScore": null,
    "semi2/homeScore": null,
    "semi2/awayScore": null,
    "final/homeScore": null,
    "final/awayScore": null,
  });
  toast();
};

window.updateKO = async (stage) => {
  const map = { sf1: "semi1", sf2: "semi2", final: "final" };
  const dbStage = map[stage] || stage;
  const id = stage === "final" ? "f" : stage; // <-- final uses inputs "f-h" / "f-a"s
  const h = +document.getElementById(`${id}-h`).value;
  const a = +document.getElementById(`${id}-a`).value;
  if (!Number.isFinite(h) || !Number.isFinite(a) || h < 0 || a < 0) {
    alert("Enter valid scores");
    return;
  }
  if (h === a) {
    alert("Knockout matches cannot end in a draw");
    return;
  }
  await update(ref(db, `${PATH}/knockout/${dbStage}`), {
    homeScore: h,
    awayScore: a,
  });
  toast();
};

window.clearKO = async (stage) => {
  if (!confirm("Clear this knockout match?")) return;
  const map = { sf1: "semi1", sf2: "semi2", final: "final" };
  const dbStage = map[stage] || stage;
  const updates = {};
  updates[`${PATH}/knockout/${dbStage}/homeScore`] = null;
  updates[`${PATH}/knockout/${dbStage}/awayScore`] = null;
  if (dbStage !== "final") {
    updates[`${PATH}/knockout/final/homeScore`] = null;
    updates[`${PATH}/knockout/final/awayScore`] = null;
  }
  await update(ref(db), updates);
  toast();
};

window.resetTournament = async () => {
  if (!confirm("Reset the entire tournament?")) return;
  await set(root, null);
  await set(root, seed());
  await update(ref(db), {
    [`${PATH}/knockout/semi1/homeScore`]: null,
    [`${PATH}/knockout/semi1/awayScore`]: null,
    [`${PATH}/knockout/semi2/homeScore`]: null,
    [`${PATH}/knockout/semi2/awayScore`]: null,
    [`${PATH}/knockout/final/homeScore`]: null,
    [`${PATH}/knockout/final/awayScore`]: null,
  });
  toast();
};
