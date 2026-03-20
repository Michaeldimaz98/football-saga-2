/**
 * featuresRoutes.js v6
 * Updated Features:
 * 1. Formation sort by stat/stamina/rarity (handled frontend)
 * 2. Icon Players with real photo + stat preview
 * 3. Free Agents refresh every 3 matchdays with dynamic pool
 * 4. Special Cup hide choices while active
 * 5. Scoreboard / leaderboard in all competitions
 * 6. Match highlight: goalscorer, assist, cards, injury
 * 7. AI teams simulate matches against each other
 * 8. Knockout stage after group phase
 */

const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

// ── AFC & AFF Club Data ──────────────────────────────────────────
const AFC_CLUBS = [
  { id:"urawa",   name:"Urawa Red Diamonds", city:"Saitama",  logo:"🔴", country:"🇯🇵", str:1.15 },
  { id:"jeonbuk", name:"Jeonbuk Hyundai",    city:"Jeonju",   logo:"🟢", country:"🇰🇷", str:1.12 },
  { id:"al_ain",  name:"Al Ain FC",          city:"Al Ain",   logo:"🟡", country:"🇦🇪", str:1.10 },
  { id:"al_hilal",name:"Al-Hilal SFC",       city:"Riyadh",   logo:"💙", country:"🇸🇦", str:1.20 },
  { id:"johor",   name:"Johor Darul Ta'zim", city:"Johor Bahru",logo:"🔴",country:"🇲🇾", str:1.05 },
  { id:"lion_city",name:"Lion City Sailors", city:"Singapore",logo:"🦁", country:"🇸🇬", str:1.00 },
  { id:"kawasaki",name:"Kawasaki Frontale",  city:"Kawasaki", logo:"🔵", country:"🇯🇵", str:1.13 },
  { id:"buriram", name:"Buriram United",     city:"Buriram",  logo:"🟣", country:"🇹🇭", str:1.08 },
];

const AFF_CLUBS = [
  { id:"thaifc",  name:"Thai FC",            city:"Bangkok",  logo:"⚪", country:"🇹🇭", str:1.08 },
  { id:"hanoi",   name:"Hanoi FC",           city:"Hanoi",    logo:"🔴", country:"🇻🇳", str:1.05 },
  { id:"global",  name:"Kaya FC-Iloilo",     city:"Iloilo",   logo:"🟡", country:"🇵🇭", str:0.98 },
  { id:"ktfc",    name:"Kaya-Iloilo",        city:"Manila",   logo:"🟢", country:"🇵🇭", str:0.96 },
  { id:"yangon",  name:"Yangon United",      city:"Yangon",   logo:"🔴", country:"🇲🇲", str:1.00 },
  { id:"pknp",    name:"PKNP FC",            city:"Ipoh",     logo:"🔵", country:"🇲🇾", str:1.02 },
  { id:"boeung",  name:"Boeung Ket FC",      city:"Phnom Penh",logo:"🟣",country:"🇰🇭", str:0.92 },
];

const TEMATIC_CUPS = {
  ramadan: {
    id: "ramadan",
    name: "Ramadan Cup",
    icon: "🌙",
    color: "#8b5cf6",
    desc: "Turnamen spesial Ramadan. Bonus coin x1.5 + equipment eksklusif!",
    teams: ["Persija Jakarta","Persib Bandung","Persebaya","Arema FC","PSM","PSIS Semarang","Borneo FC","PSS Sleman"],
    rewards: { winner: { coin: 2000, premium: 30, equipment: "ramadan_special" }, runner: { coin: 800, premium: 10 } }
  },
  hut: {
    id: "hut",
    name: "Piala HUT Kemerdekaan RI 🇮🇩",
    icon: "🇮🇩",
    color: "#ef4444",
    desc: "Turnamen 17 Agustus! Semangat kemerdekaan! Bonus patriot +17% power",
    teams: ["Persija Jakarta","Persib Bandung","Persebaya","Arema FC","PSM","PSIS Semarang","Borneo FC","PSS Sleman"],
    rewards: { winner: { coin: 1700, premium: 17, equipment: "hut_special" }, runner: { coin: 700, premium: 8 } }
  }
};

const DERBY_MATCHES = [
  { id:"persija_persib",  home:"Persija Jakarta", away:"Persib Bandung",   name:"El Clasico Indonesia", multiplier:2.5, icon:"🔥" },
  { id:"persija_persebaya",home:"Persija Jakarta",away:"Persebaya Surabaya",name:"Jakarta vs Surabaya Derby",multiplier:2.0,icon:"⚡"},
  { id:"arema_persebaya", home:"Arema FC",         away:"Persebaya Surabaya",name:"Derbi Jatim",          multiplier:2.2, icon:"🔥" },
  { id:"psm_persib",      home:"PSM Makassar",     away:"Persib Bandung",   name:"Timur vs Barat Derby", multiplier:1.8, icon:"⚡" },
];

const SPONSOR_TIERS = [
  { name:"No Sponsor",   minWinStreak:0,  bonusCoin:0,   logo:"—",     color:"#64748b" },
  { name:"Indomie",      minWinStreak:2,  bonusCoin:30,  logo:"🍜",   color:"#f59e0b" },
  { name:"Gojek",        minWinStreak:4,  bonusCoin:60,  logo:"🛵",   color:"#22c55e" },
  { name:"BRI",          minWinStreak:6,  bonusCoin:100, logo:"🏦",   color:"#ef4444" },
  { name:"Telkomsel",    minWinStreak:8,  bonusCoin:150, logo:"📱",   color:"#ef4444" },
  { name:"Bank Mandiri", minWinStreak:10, bonusCoin:200, logo:"🏛️",  color:"#facc15" },
  { name:"Nike Indonesia",minWinStreak:15,bonusCoin:350, logo:"✔️",  color:"#1a1a2e" },
  { name:"Adidas Asia",  minWinStreak:20, bonusCoin:500, logo:"🏆",  color:"#1a1a2e" },
];

const YOUTH_NAMES = [
  "Kemal Fikri","Rayhan Arya","Daffa Rizqi","Fauzan Latif","Gibran Saputra",
  "Hafiz Rasyid","Ilham Kurnia","Jundi Pratama","Krisna Maulana","Luthfi Ananda",
  "Miftah Nurul","Naufal Zakky","Omar Hakim","Pandu Reza","Qadri Firman",
  "Raka Bima","Satria Dewangga","Tegar Mahesa","Umar Ridho","Vian Dwipa"
];

function generateYouthPlayer(save) {
  const roles = ["GK","LB","CB","RB","CM","DM","AM","LW","RW","ST"];
  const role = roles[Math.floor(Math.random() * roles.length)];
  const age = 16 + Math.floor(Math.random() * 3);
  const rarity = Math.random() < 0.15 ? "A" : Math.random() < 0.4 ? "B" : "C";
  const basePower = rarity === "A" ? 45 + Math.floor(Math.random()*10)
    : rarity === "B" ? 38 + Math.floor(Math.random()*10) : 30 + Math.floor(Math.random()*8);
  const growthRate = rarity === "A" ? 12 + Math.floor(Math.random()*5)
    : rarity === "B" ? 8 + Math.floor(Math.random()*5) : 5 + Math.floor(Math.random()*4);
  const ownedNames = new Set((save.players||[]).map(p=>p.name));
  let name = YOUTH_NAMES[Math.floor(Math.random()*YOUTH_NAMES.length)];
  let attempts = 0;
  while (ownedNames.has(name) && attempts < 20) {
    name = YOUTH_NAMES[Math.floor(Math.random()*YOUTH_NAMES.length)];
    attempts++;
  }
  const type = ["GK"].includes(role) ? "GK"
    : ["CB","LB","RB"].includes(role) ? "DEF"
    : ["CM","DM","AM","LW","RW"].includes(role) ? "MID" : "ATT";
  const statBase = rarity === "A" ? 50 : rarity === "B" ? 42 : 35;
  return {
    id: `youth_${Date.now()}_${Math.floor(Math.random()*9999)}`,
    name, role, type,
    nationality: "🇮🇩",
    age, basePower, power: basePower,
    rarity, growth: growthRate,
    level: 1, exp: 0, expNeeded: 100,
    pace: statBase + Math.floor(Math.random()*20),
    shooting: statBase + Math.floor(Math.random()*20),
    passing: statBase + Math.floor(Math.random()*20),
    defense: statBase + Math.floor(Math.random()*20),
    stamina: 70 + Math.floor(Math.random()*20),
    mentality: 55 + Math.floor(Math.random()*20),
    image: `https://api.dicebear.com/7.x/bottts/svg?seed=youth${Date.now()}&backgroundColor=22c55e`,
    equipment: { HEAD:null, BODY:null, HAND:null, FEET:null, ACC:null },
    curStamina: 100, injury: null, skill: "NONE",
    special: "wonderkid",
    potentialRating: rarity === "A" ? "S" : rarity === "B" ? "A" : "B",
    nickname: `Youth ${role}`,
  };
}

function getSetBonus(playerEquipment, inventory) {
  const brandCount = {};
  Object.values(playerEquipment||{}).filter(Boolean).forEach(id => {
    const item = inventory.find(e=>String(e.id)===String(id));
    if (item?.brand) brandCount[item.brand] = (brandCount[item.brand]||0) + 1;
  });
  const bonuses = [];
  Object.entries(brandCount).forEach(([brand, count]) => {
    if (count >= 3) bonuses.push({ brand, count, bonus: 8, desc: `${brand} Set Bonus: +8% semua stat` });
    else if (count >= 2) bonuses.push({ brand, count, bonus: 4, desc: `${brand} Partial Set: +4% semua stat` });
  });
  return bonuses;
}

function getSponsor(save) {
  const winStreak = save.winStreak || 0;
  let sponsor = SPONSOR_TIERS[0];
  for (const tier of SPONSOR_TIERS) {
    if (winStreak >= tier.minWinStreak) sponsor = tier;
  }
  return sponsor;
}

function simulateGoals(atk, def) {
  let goals = 0;
  const ratio = atk / Math.max(1, def);
  for (let i = 0; i < 5; i++) {
    if (Math.random() < 0.12 + Math.max(-0.05, Math.min(0.22, (ratio-1)*0.14))) goals++;
  }
  return Math.min(goals, 7);
}

// Feature #6: Generate realistic match highlight events
function generateMatchEvents(save, myGoals, oppGoals, enemyName) {
  const goalEvents = [];
  const cardEvents = [];
  const injuryEvents = [];

  // Get starter players from lineup
  const starterIds = Object.values(save.lineup || {}).filter(Boolean);
  const starters = starterIds.map(id => (save.players || []).find(p => String(p.id) === String(id))).filter(Boolean);

  // Attackers/midfielders more likely to score
  const attackers = starters.filter(p => ["ATT", "MID", "ST", "LW", "RW", "AM", "CM"].includes((p.role || p.type || "").toUpperCase()));
  const allFieldPlayers = starters.filter(p => (p.role || p.type || "").toUpperCase() !== "GK");

  // Generate goal events (home side)
  const usedMinutes = new Set();
  const randomMinute = () => {
    let m; do { m = 1 + Math.floor(Math.random() * 90); } while (usedMinutes.has(m));
    usedMinutes.add(m); return m;
  };

  for (let i = 0; i < myGoals; i++) {
    const pool = attackers.length > 0 ? attackers : allFieldPlayers;
    const scorer = pool[Math.floor(Math.random() * pool.length)];
    const hasAssist = Math.random() < 0.65 && allFieldPlayers.length > 1;
    const assistPool = allFieldPlayers.filter(p => p.id !== (scorer?.id));
    const assister = hasAssist && assistPool.length > 0
      ? assistPool[Math.floor(Math.random() * assistPool.length)]
      : null;
    goalEvents.push({
      team: "home",
      minute: randomMinute(),
      scorerName: scorer?.name || "My Player",
      assistName: assister?.name || null,
      type: "goal"
    });
  }

  // Generate goal events (away side)
  for (let i = 0; i < oppGoals; i++) {
    const AWAY_NAMES = ["Striker", "Forward", "Winger", "Attacker", "Midfielder"];
    const hasAssist = Math.random() < 0.55;
    const assistName = hasAssist
      ? `${enemyName.split(" ")[0]} ${AWAY_NAMES[Math.floor(Math.random() * AWAY_NAMES.length)]}`
      : null;
    goalEvents.push({
      team: "away",
      minute: randomMinute(),
      scorerName: `${enemyName.split(" ")[0]} ${AWAY_NAMES[Math.floor(Math.random() * AWAY_NAMES.length)]}`,
      assistName,
      type: "goal"
    });
  }

  goalEvents.sort((a, b) => a.minute - b.minute);

  // Generate card events
  const cardCount = Math.random() < 0.6 ? 1 : Math.random() < 0.4 ? 2 : 0;
  for (let i = 0; i < cardCount && allFieldPlayers.length > 0; i++) {
    const p = allFieldPlayers[Math.floor(Math.random() * allFieldPlayers.length)];
    const isRed = Math.random() < 0.1;
    cardEvents.push({
      type: isRed ? "red" : "yellow",
      minute: 20 + Math.floor(Math.random() * 65),
      playerName: p.name,
      playerId: p.id,
      team: "home"
    });
  }
  const awayCardCount = Math.random() < 0.45 ? 1 : Math.random() < 0.2 ? 2 : 0;
  for (let i = 0; i < awayCardCount; i++) {
    const AWAY_NAMES = ["Striker", "Forward", "Winger", "Attacker", "Midfielder"];
    cardEvents.push({
      type: Math.random() < 0.08 ? "red" : "yellow",
      minute: 20 + Math.floor(Math.random() * 65),
      playerName: `${enemyName.split(" ")[0]} ${AWAY_NAMES[Math.floor(Math.random() * AWAY_NAMES.length)]}`,
      playerId: null,
      team: "away"
    });
  }

  // Generate injury events (rare)
  if (Math.random() < 0.12 && allFieldPlayers.length > 0) {
    const injured = allFieldPlayers[Math.floor(Math.random() * allFieldPlayers.length)];
    const injTypes = ["minor", "knock", "muscle"];
    const type = injTypes[Math.floor(Math.random() * injTypes.length)];
    const matches = type === "minor" ? 1 : 2;
    injuryEvents.push({ name: injured.name, playerId: injured.id, type, matches });

    // Apply to save
    const savedPlayer = (save.players || []).find(p => String(p.id) === String(injured.id));
    if (savedPlayer && !savedPlayer.injury) {
      savedPlayer.injury = { matchesLeft: matches, type };
    }
  }

  return { goalEvents, cardEvents, injuryEvents };
}

// Feature #7: Simulate AI vs AI matches for all non-player fixtures
function simulateAIvsAI(standings, myId, targetMatchCount) {
  const aiTeams = standings.filter((t) => !t.isMe && t.id !== myId);
  if (aiTeams.length < 2) return;

  const maxMatches = Number(targetMatchCount || 0) > 0 ? Number(targetMatchCount) : 1;

  function applyTeamResult(team, goalsFor, goalsAgainst) {
    team.played = (team.played || 0) + 1;
    team.goalsFor = (team.goalsFor || 0) + goalsFor;
    team.goalsAgainst = (team.goalsAgainst || 0) + goalsAgainst;
    team.gd = (team.goalsFor || 0) - (team.goalsAgainst || 0);
    if (goalsFor > goalsAgainst) {
      team.won = (team.won || 0) + 1;
      team.points = (team.points || 0) + 3;
    } else if (goalsFor === goalsAgainst) {
      team.drawn = (team.drawn || 0) + 1;
      team.points = (team.points || 0) + 1;
    } else {
      team.lost = (team.lost || 0) + 1;
    }
  }

  const safetyLimit = aiTeams.length * maxMatches * 4;
  let loop = 0;
  while (loop < safetyLimit) {
    loop += 1;
    const needing = aiTeams.filter((t) => (t.played || 0) < maxMatches);
    if (needing.length < 2) break;

    needing.sort((a, b) => (a.played || 0) - (b.played || 0) || (Math.random() - 0.5));
    const home = needing[0];
    const awayPool = needing.slice(1);
    const away = awayPool[Math.floor(Math.random() * awayPool.length)];
    if (!away || away.id === home.id) continue;

    const homeStr = home.strength || home.str || 1.0;
    const awayStr = away.strength || away.str || 1.0;
    const hPow = homeStr * 75 * 1.05 + Math.random() * 18;
    const aPow = awayStr * 75 + Math.random() * 18;
    const hGoals = simulateGoals(hPow, aPow);
    const aGoals = simulateGoals(aPow, hPow);

    applyTeamResult(home, hGoals, aGoals);
    applyTeamResult(away, aGoals, hGoals);
  }

  standings.sort((a,b)=>b.points-a.points||b.gd-a.gd||b.goalsFor-a.goalsFor);
}

// Feature #8: Build knockout bracket from group standings
function buildKnockoutBracket(standings, competitionName) {
  const sorted = [...standings].sort((a,b) => b.points-a.points || b.gd-a.gd || b.goalsFor-a.goalsFor);
  const qualified = sorted.slice(0, 4); // Top 4 advance
  return {
    stage: "knockout",
    competitionName,
    qualified: qualified.map((t, i) => ({ ...t, seed: i + 1 })),
    semiFinals: [
      { id: "sf1", home: qualified[0], away: qualified[3], played: false, result: null, score: null },
      { id: "sf2", home: qualified[1], away: qualified[2], played: false, result: null, score: null },
    ],
    final: null,
    thirdPlace: null,
    winner: null,
    finished: false
  };
}

function simulateKnockoutMatch(home, away, myTeamId, save) {
  const isMyTeam = (t) => t && (t.isMe || String(t.id) === "me" || String(t.id) === myTeamId);
  let hPow, aPow;
  if (isMyTeam(home)) {
    const starterIds = Object.values(save.lineup || {}).filter(Boolean);
    const myPow = starterIds.map(id => (save.players||[]).find(p=>String(p.id)===String(id))).filter(Boolean)
      .reduce((s,p) => s+Number(p.basePower||50),0) / Math.max(1, starterIds.length);
    hPow = myPow;
    aPow = (away.strength || away.str || 1.0) * 78 + Math.random() * 15;
  } else if (isMyTeam(away)) {
    const starterIds = Object.values(save.lineup || {}).filter(Boolean);
    const myPow = starterIds.map(id => (save.players||[]).find(p=>String(p.id)===String(id))).filter(Boolean)
      .reduce((s,p) => s+Number(p.basePower||50),0) / Math.max(1, starterIds.length);
    aPow = myPow;
    hPow = (home.strength || home.str || 1.0) * 78 + Math.random() * 15;
  } else {
    hPow = (home.strength || home.str || 1.0) * 78 + Math.random() * 15;
    aPow = (away.strength || away.str || 1.0) * 78 + Math.random() * 15;
  }
  let hGoals = simulateGoals(hPow * 1.05, aPow); // slight home advantage
  let aGoals = simulateGoals(aPow, hPow * 1.05);
  // Knockout: no draw — penalty in extra time
  if (hGoals === aGoals) {
    if (Math.random() < 0.5) hGoals++; else aGoals++;
  }
  const winner = hGoals > aGoals ? home : away;
  const loser = hGoals > aGoals ? away : home;
  return { hGoals, aGoals, winner, loser, score: `${hGoals}-${aGoals}`, isMyTeam: isMyTeam(home) || isMyTeam(away) };
}

// ─────────────────────────────────────────────────────────────────
function buildTopScorers(schedule, save) {
  const scorerMap = {};
  schedule.filter(m => m.played && m.goalEvents).forEach(m => {
    (m.goalEvents || []).forEach(g => {
      if (!scorerMap[g.scorerName]) scorerMap[g.scorerName] = { name: g.scorerName, goals: 0, assists: 0 };
      scorerMap[g.scorerName].goals++;
      if (g.assistName) {
        if (!scorerMap[g.assistName]) scorerMap[g.assistName] = { name: g.assistName, goals: 0, assists: 0 };
        scorerMap[g.assistName].assists++;
      }
    });
  });
  return Object.values(scorerMap).sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 10);
}

function createFeaturesRouter({ authService, userSaveService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  function req2save(req) {
    const s = userSaveService.getUserSave(req.user.username);
    if (!s) throw new Error("Save tidak ditemukan");
    return s;
  }
  function persist(username, save) { return userSaveService.saveUserSave(username, save); }

  // ── SPONSORSHIP ──────────────────────────────────────────────
  router.get("/sponsor", guard, (req, res) => {
    try {
      const save = req2save(req);
      const sponsor = getSponsor(save);
      const nextTier = SPONSOR_TIERS[SPONSOR_TIERS.indexOf(sponsor)+1] || null;
      return ok(res, { sponsor, nextTier, winStreak: save.winStreak||0, tiers: SPONSOR_TIERS });
    } catch(e) { return fail(res, 400, e.message); }
  });

  // ── YOUTH ACADEMY ────────────────────────────────────────────
  router.get("/academy", guard, (req, res) => {
    try {
      const save = req2save(req);
      const totalMatchdays = (save.career?.currentMatchday||0) + (save.liga?.currentMatch||0);
      const lastScout = save.lastYouthScout || 0;
      const scoutInterval = 5;
      const canScout = (totalMatchdays - lastScout) >= scoutInterval;
      const nextScoutIn = canScout ? 0 : scoutInterval - (totalMatchdays - lastScout);
      return ok(res, {
        canScout,
        nextScoutIn,
        totalMatchdays,
        lastScout,
        scoutInterval,
        players: (save.academyPlayers || [])
      });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/academy/scout", guard, (req, res) => {
    try {
      const save = req2save(req);
      const totalMatchdays = (save.career?.currentMatchday||0) + (save.liga?.currentMatch||0);
      const lastScout = save.lastYouthScout || 0;
      const scoutInterval = 5;
      if ((totalMatchdays - lastScout) < scoutInterval && !req.body?.force) {
        return fail(res, 400, `Scout berikutnya setelah ${scoutInterval-(totalMatchdays-lastScout)} matchday lagi`);
      }
      const count = req.body?.count || 3;
      const candidates = Array.from({length: count}, () => generateYouthPlayer(save));
      save.lastYouthScout = totalMatchdays;
      save.academyCandidates = candidates;
      persist(req.user.username, save);
      return ok(res, { candidates, message: `${count} pemain muda ditemukan!` });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/academy/sign", guard, (req, res) => {
    try {
      const save = req2save(req);
      const { playerId } = req.body || {};
      const candidate = (save.academyCandidates || []).find(p => String(p.id) === String(playerId));
      if (!candidate) return fail(res, 404, "Pemain tidak ditemukan");
      save.players = Array.isArray(save.players) ? save.players : [];
      if (save.players.length >= 25) return fail(res, 400, "Tim penuh (maks 25 pemain)");
      save.players.push({ ...candidate });
      save.academyCandidates = (save.academyCandidates||[]).filter(p=>String(p.id)!==String(playerId));
      persist(req.user.username, save);
      return ok(res, { player: candidate, message: `${candidate.name} resmi bergabung!` });
    } catch(e) { return fail(res, 400, e.message); }
  });

  // ── FREE AGENTS (Feature #3: refresh every 3 matchdays) ─────
  const FREE_AGENT_POOL = [
    { name:"Ahmad Bustomi", role:"CM", type:"MID", nationality:"🇮🇩", age:28, basePower:68, pace:70, shooting:65, passing:75, defense:60, stamina:72, mentality:70, freeAgentCost:250 },
    { name:"Boaz Solossa", role:"LW", type:"ATT", nationality:"🇮🇩", age:30, basePower:72, pace:78, shooting:70, passing:68, defense:45, stamina:65, mentality:72, freeAgentCost:320 },
    { name:"Stefano Lilipaly", role:"AM", type:"MID", nationality:"🇮🇩", age:29, basePower:74, pace:74, shooting:68, passing:78, defense:50, stamina:70, mentality:76, freeAgentCost:350 },
    { name:"Greg Nwokolo", role:"ST", type:"ATT", nationality:"🇮🇩", age:27, basePower:70, pace:72, shooting:74, passing:60, defense:40, stamina:68, mentality:68, freeAgentCost:280 },
    { name:"Otavio Dutra", role:"CB", type:"DEF", nationality:"🇧🇷", age:31, basePower:71, pace:58, shooting:45, passing:60, defense:78, stamina:66, mentality:74, freeAgentCost:300 },
    { name:"Marc Klok", role:"CM", type:"MID", nationality:"🇳🇱", age:28, basePower:73, pace:68, shooting:62, passing:76, defense:65, stamina:74, mentality:74, freeAgentCost:330 },
    { name:"Fernando Pacho", role:"CB", type:"DEF", nationality:"🌍", age:26, basePower:69, pace:62, shooting:42, passing:58, defense:75, stamina:70, mentality:70, freeAgentCost:260 },
    { name:"Victor Igbonefo", role:"CB", type:"DEF", nationality:"🇳🇬", age:32, basePower:67, pace:55, shooting:40, passing:55, defense:76, stamina:64, mentality:72, freeAgentCost:220 },
    { name:"Ezechiel Ndouassel", role:"ST", type:"ATT", nationality:"🇹🇩", age:29, basePower:71, pace:75, shooting:72, passing:55, defense:38, stamina:70, mentality:66, freeAgentCost:290 },
    { name:"Wiljan Pluim", role:"DM", type:"MID", nationality:"🇳🇱", age:27, basePower:70, pace:65, shooting:58, passing:72, defense:68, stamina:72, mentality:72, freeAgentCost:275 },
    { name:"Riko Simanjuntak", role:"RW", type:"ATT", nationality:"🇮🇩", age:26, basePower:68, pace:80, shooting:65, passing:66, defense:42, stamina:74, mentality:68, freeAgentCost:240 },
    { name:"Hansamu Yama", role:"CB", type:"DEF", nationality:"🇮🇩", age:24, basePower:66, pace:64, shooting:44, passing:57, defense:72, stamina:72, mentality:68, freeAgentCost:210 },
  ];

  function refreshFreeAgentPool(save) {
    const totalMatchdays = (save.career?.currentMatchday || 0) + (save.liga?.currentMatch || 0) +
      (save.afcChampions?.currentMatchday || 0) + (save.affCup?.currentMatchday || 0);
    const lastRefresh = save.lastFreeAgentRefresh || 0;
    const REFRESH_INTERVAL = 3; // every 3 matchdays
    const needsRefresh = (totalMatchdays - lastRefresh) >= REFRESH_INTERVAL || !save.dynamicFreeAgents;
    if (needsRefresh) {
      const ownedNames = new Set((save.players || []).map(p => p.name));
      const available = FREE_AGENT_POOL.filter(p => !ownedNames.has(p.name));
      const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, 4);
      save.dynamicFreeAgents = shuffled.map((p, i) => ({
        ...p,
        id: `fa_${Date.now()}_${i}`,
        special: "free_agent",
        level: 1, exp: 0,
        curStamina: 100, injury: null, skill: "NONE",
        equipment: { HEAD: null, BODY: null, HAND: null, FEET: null, ACC: null },
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=fa${i}${Date.now()}&backgroundColor=3b82f6`,
        power: p.basePower,
        growth: 4 + Math.floor(Math.random() * 4),
        potentialRating: p.basePower >= 72 ? "A" : "B",
      }));
      save.lastFreeAgentRefresh = totalMatchdays;
    }
    return {
      agents: save.dynamicFreeAgents || [],
      totalMatchdays,
      lastRefresh: save.lastFreeAgentRefresh || 0,
      nextRefreshIn: Math.max(0, REFRESH_INTERVAL - (totalMatchdays - (save.lastFreeAgentRefresh || 0))),
      refreshInterval: REFRESH_INTERVAL
    };
  }

  router.get("/free-agents", guard, (req, res) => {
    try {
      const save = req2save(req);
      const refreshData = refreshFreeAgentPool(save);
      persist(req.user.username, save);
      const ownedNames = new Set((save.players || []).map(p => p.name));
      return ok(res, {
        freeAgents: refreshData.agents.filter(p => !ownedNames.has(p.name)),
        coin: save.coin || 0,
        nextRefreshIn: refreshData.nextRefreshIn,
        totalMatchdays: refreshData.totalMatchdays,
        refreshInterval: refreshData.refreshInterval,
        message: refreshData.nextRefreshIn === 0
          ? "🔄 Pool baru! Pemain bebas telah diperbarui."
          : `⏳ Pool refresh dalam ${refreshData.nextRefreshIn} matchday lagi`
      });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/free-agents/negotiate", guard, (req, res) => {
    try {
      const save = req2save(req);
      const { playerId } = req.body || {};
      const agent = (save.dynamicFreeAgents || []).find(p => String(p.id) === String(playerId));
      if (!agent) return fail(res, 404, "Free agent tidak ditemukan atau sudah tidak tersedia");
      const cost = agent.freeAgentCost || 300;
      if (Number(save.coin || 0) < cost) return fail(res, 400, `Butuh ${cost} coin untuk negotiate`);
      save.coin = Number(save.coin || 0) - cost;
      save.players = Array.isArray(save.players) ? save.players : [];
      save.players.push({ ...agent });
      save.dynamicFreeAgents = (save.dynamicFreeAgents || []).filter(p => String(p.id) !== String(playerId));
      persist(req.user.username, save);
      return ok(res, { player: agent, coin: save.coin, message: `${agent.name} setuju bergabung!` });
    } catch(e) { return fail(res, 400, e.message); }
  });


  // ── ICON PLAYERS (Feature #2: real photo + full stats) ──────
  const ICON_REAL_PHOTOS = {
    "bambang": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bambang_Pamungkas_2013.jpg/220px-Bambang_Pamungkas_2013.jpg",
    "kurniawan": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Kurniawan_Dwi_Yulianto.jpg/220px-Kurniawan_Dwi_Yulianto.jpg",
    "bima": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Bima_Sakti.jpg/220px-Bima_Sakti.jpg",
    "ponaryo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Ponaryo_Astaman.jpg/220px-Ponaryo_Astaman.jpg",
  };

  router.get("/icons", guard, (req, res) => {
    try {
      const save = req2save(req);
      const allPlayers = require("../repositories/dataRepository").createDataRepository().getPlayers();
      const baseIcons = allPlayers.filter(p => p.special === "icon").map(p => {
        const nameKey = (p.name || "").split(" ")[0].toLowerCase();
        const realPhoto = ICON_REAL_PHOTOS[nameKey] || null;
        return {
          ...p,
          realPhoto,
          stats: {
            pace: p.pace || Math.floor(55 + (p.basePower || 80) * 0.3),
            shooting: p.shooting || Math.floor(60 + (p.basePower || 80) * 0.3),
            passing: p.passing || Math.floor(60 + (p.basePower || 80) * 0.25),
            defense: p.defense || Math.floor(40 + (p.basePower || 80) * 0.2),
            stamina: p.stamina || Math.floor(65 + (p.basePower || 80) * 0.2),
            mentality: p.mentality || Math.floor(70 + (p.basePower || 80) * 0.2),
          }
        };
      });
      const gachaIcons = [
        { id: "icon_bepe", name: "Bambang Pamungkas", nickname: "Bepe", role: "ST", rarity: "SSR", basePower: 90,
          power: 90, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:68, shooting:92, passing:70, defense:30, stamina:65, mentality:95 },
          iconDesc: "Legenda Persija & Timnas Indonesia", image: "https://i.imgur.com/8QfQYpL.png" },
        { id: "icon_kurus_emas", name: "Kurniawan Dwi Yulianto", nickname: "Kurus Emas", role: "ST", rarity: "SSR", basePower: 88,
          power: 88, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:92, shooting:85, passing:62, defense:25, stamina:60, mentality:88 },
          iconDesc: "Penyerang legendaris, top scorer sepanjang masa Timnas", image: "https://i.imgur.com/8QfQYpL.png" },
        { id: "icon_bima_sakti", name: "Bima Sakti", nickname: "The General", role: "CM", rarity: "SSR", basePower: 85,
          power: 85, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:62, shooting:70, passing:88, defense:72, stamina:65, mentality:95 },
          iconDesc: "Gelandang jenderal lapangan tengah legendaris Indonesia", image: "https://i.imgur.com/8QfQYpL.png" },
        { id: "icon_ilham", name: "Ilham Jayakusuma", nickname: "Si Kuning", role: "ST", rarity: "SS", basePower: 82,
          power: 82, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:85, shooting:80, passing:65, defense:28, stamina:70, mentality:85 },
          iconDesc: "Striker cepat, motor serangan Timnas era 2000an", image: "https://i.imgur.com/8QfQYpL.png" },
        { id: "icon_ponaryo", name: "Ponaryo Astaman", nickname: "Si Serigala", role: "CM", rarity: "SS", basePower: 80,
          power: 80, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:70, shooting:72, passing:84, defense:68, stamina:78, mentality:88 },
          iconDesc: "Gelandang dinamis penggerak Timnas dekade 2000an", image: "https://i.imgur.com/8QfQYpL.png" },
      ].map((p) => {
        const nameKey = (p.name || "").split(" ")[0].toLowerCase();
        const realPhoto = ICON_REAL_PHOTOS[nameKey] || null;
        return { ...p, realPhoto };
      });

      const ownedIconItems = (save.inventory || [])
        .filter((it) => it && (it.category === "icon_player" || it.special === "icon"))
        .map((it) => {
          const nameKey = (it.name || "").split(" ")[0].toLowerCase();
          const realPhoto = ICON_REAL_PHOTOS[nameKey] || null;
          return {
            ...it,
            rarity: it.rarity || "SS",
            basePower: it.basePower || it.power || 80,
            role: it.role || "ST",
            special: "icon",
            category: "icon_player",
            stats: it.stats || {
              pace: it.pace || 70,
              shooting: it.shooting || 70,
              passing: it.passing || 70,
              defense: it.defense || 50,
              stamina: it.stamina || 70,
              mentality: it.mentality || 70,
            },
            realPhoto,
          };
        });

      const byName = new Map();
      [...baseIcons, ...gachaIcons, ...ownedIconItems].forEach((p) => {
        if (!p?.name) return;
        if (!byName.has(p.name)) byName.set(p.name, p);
      });
      const icons = Array.from(byName.values()).sort((a, b) => (b.basePower || b.power || 0) - (a.basePower || a.power || 0));
      return ok(res, { icons });
    } catch(e) { return fail(res, 400, e.message); }
  });



  // ── AFC CHAMPIONS LEAGUE ─────────────────────────────────────
  router.get("/afc", guard, (req, res) => {
    try {
      const save = req2save(req);
      const afc = save.afcChampions || null;
      return ok(res, { afc, clubs: AFC_CLUBS });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/afc/enter", guard, (req, res) => {
    try {
      const save = req2save(req);
      if (save.afcChampions && !save.afcChampions.finished) {
        return fail(res, 400, "Sudah dalam AFC Champions League");
      }
      // Qualification: top 2 in career Divisi 1, OR liga season top 2, OR win streak >= 5
      const inDiv1 = save.career?.division === "Divisi 1";
      const careerRank = save.career?.lastSeasonRank || 99;
      const ligaRank = save.liga?.lastSeasonRank || 99;
      const winStreak = save.winStreak || 0;
      const qualifiedByCareer = !!save.career?.finished && inDiv1 && careerRank <= 2;
      const qualifiedByLiga = !!save.liga?.finished && ligaRank <= 2;
      const qualifiedByStreak = winStreak >= 5;
      if (!qualifiedByCareer && !qualifiedByLiga && !qualifiedByStreak) {
        return fail(res, 400, "Butuh finish peringkat 1-2 di Liga/Career Divisi 1, atau win streak 5+ untuk lolos kualifikasi AFC");
      }
      // Build group stage: 4 clubs + my team
      const shuffled = [...AFC_CLUBS].sort(() => Math.random()-0.5).slice(0, 3);
      const myTeamName = save.myClub?.name || "My Team";
      const groupClubs = [...shuffled, { id:"me", name:myTeamName, logo:"⭐", country:"🇮🇩", str:1.0, isMe:true }];
      save.afcChampions = {
        season: (save.afcChampions?.season||0) + 1,
        stage: "group",
        groupClubs,
        schedule: shuffled.map((c,i) => ({ matchday: i+1, club:c, isHome: i%2===0, played:false, result:null, score:null })),
        currentMatchday: 0,
        myStats: { played:0, won:0, drawn:0, lost:0, points:0, goalsFor:0, goalsAgainst:0 },
        standings: groupClubs.map(c => ({
          id:c.id, name:c.name, logo:c.logo, country:c.country||"🌏",
          played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, gd:0, points:0, isMe:c.isMe||false
        })),
        finished: false,
        knockoutBracket: null,
        reward: 0
      };
      persist(req.user.username, save);
      return ok(res, { afc: save.afcChampions, message: "Selamat! Kamu lolos ke AFC Champions League!" });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/afc/match", guard, (req, res) => {
    try {
      const save = req2save(req);
      const afc = save.afcChampions;
      if (!afc || afc.finished) return fail(res, 400, "Tidak ada AFC match aktif");
      const idx = Number(req.body?.matchdayIdx ?? afc.currentMatchday);
      const match = afc.schedule[idx];
      if (!match) return fail(res, 400, "Match tidak ditemukan");
      if (match.played) return fail(res, 400, "Sudah dimainkan");

      const starterIds = Object.values(save.lineup||{}).filter(Boolean);
      if (starterIds.length < 11) return fail(res, 400, "Lineup belum penuh");

      const myPower = starterIds.map(id=>(save.players||[]).find(p=>String(p.id)===String(id)))
        .filter(Boolean).reduce((s,p)=>s+Number(p.basePower||50),0) / 11;

      const club = match.club;
      const oppPower = (club.str||1.0)*80 + Math.random()*15;
      const homeAdv = match.isHome ? 1.05 : 0.95;
      const myGoals = simulateGoals(myPower*homeAdv, oppPower);
      const oppGoals = simulateGoals(oppPower, myPower*homeAdv);
      const result = myGoals>oppGoals?"WIN":myGoals<oppGoals?"LOSE":"DRAW";
      const score = `${myGoals}-${oppGoals}`;

      // Feature #6: Generate match events
      const { goalEvents, cardEvents, injuryEvents } = generateMatchEvents(save, myGoals, oppGoals, club.name);

      // Update match — store goalEvents for scoreboard
      afc.schedule[idx] = {...match, played:true, result, score, myGoals, oppGoals, goalEvents};
      afc.currentMatchday = idx+1;
      const ms = afc.myStats;
      ms.played++; ms.goalsFor+=myGoals; ms.goalsAgainst+=oppGoals;
      if (result==="WIN") { ms.won++; ms.points+=3; }
      else if (result==="DRAW") { ms.drawn++; ms.points++; }
      else ms.lost++;

      // Update standings — my team
      const mySt = afc.standings.find(t=>t.isMe);
      if (mySt) {
        mySt.played++; mySt.goalsFor+=myGoals; mySt.goalsAgainst+=oppGoals; mySt.gd=mySt.goalsFor-mySt.goalsAgainst;
        if (result==="WIN"){ mySt.won++; mySt.points+=3; }
        else if (result==="DRAW"){ mySt.drawn++; mySt.points++; }
        else mySt.lost++;
      }
      const oppSt = afc.standings.find(t=>t.id===club.id);
      if (oppSt) {
        oppSt.played++; oppSt.goalsFor+=oppGoals; oppSt.goalsAgainst+=myGoals; oppSt.gd=oppSt.goalsFor-oppSt.goalsAgainst;
        if (myGoals<oppGoals){oppSt.won++;oppSt.points+=3;}
        else if (myGoals===oppGoals){oppSt.drawn++;oppSt.points++;}
        else oppSt.lost++;
      }

      // Feature #7: Simulate AI vs AI matches - BUG4 FIX: pass matchday count for proportional standings
      const myMatchesPlayed = afc.schedule.filter(m => m.played).length;
      simulateAIvsAI(afc.standings, "me", myMatchesPlayed);
      afc.standings.sort((a,b)=>b.points-a.points||b.gd-a.gd||b.goalsFor-a.goalsFor);

      const coinReward = result==="WIN"?300:result==="DRAW"?120:50;
      save.coin = Number(save.coin||0)+coinReward;
      save.winCount = Number(save.winCount||0)+(result==="WIN"?1:0);

      // Check group stage end
      const allPlayed = afc.schedule.every(m=>m.played);
      if (allPlayed) {
        afc.stage = "group_done";
        const myRank = afc.standings.findIndex(t=>t.isMe)+1;
        if (myRank <= 2) {
          // Feature #8: Build knockout bracket
          afc.knockout = buildKnockoutBracket(afc.standings, "AFC Champions League");
          afc.stage = "knockout";
          afc.message = "🏆 Lolos ke Semifinal! Siapkan tim terbaik!";
          afc.reward = 600;
        } else {
          afc.message = "❌ Tidak lolos fase grup. Coba lagi musim depan!";
          afc.reward = 200;
          afc.finished = true;
        }
        save.coin = Number(save.coin||0)+afc.reward;
      }

      save.afcChampions = afc;
      persist(req.user.username, save);
      return ok(res, {
        result, score,
        enemyName: club.name,
        reward: coinReward,
        playerPower: Math.round(myPower),
        enemyPower: Math.round(oppPower),
        chemistry: 5,
        goalEvents, cardEvents, injuryEvents,
        skillEvents: [],
        userTeam: { name: save.myClub?.name||"My Team" },
        returnTo: "afc",
        afcStatus: afc,
        groupFinished: allPlayed,
        knockoutUnlocked: allPlayed && afc.stage === "knockout"
      });
    } catch(e) { return fail(res, 400, e.message); }
  });

  // Feature #8: AFC Knockout play
  router.post("/afc/knockout", guard, (req, res) => {
    try {
      const save = req2save(req);
      const afc = save.afcChampions;
      if (!afc || !afc.knockout) return fail(res, 400, "Tidak ada fase knockout AFC");
      const ko = afc.knockout;
      if (ko.finished) return fail(res, 400, "Knockout sudah selesai");

      const { matchId } = req.body || {};

      // Play semifinal
      const sf = ko.semiFinals.find(m => m.id === matchId && !m.played);
      if (sf) {
        const r = simulateKnockoutMatch(sf.home, sf.away, "me", save);
        sf.played = true; sf.result = r; sf.score = r.score;
        sf.winner = r.winner; sf.loser = r.loser;

        const { goalEvents, cardEvents, injuryEvents } = r.isMyTeam
          ? generateMatchEvents(save, r.hGoals, r.aGoals, (sf.home.isMe ? sf.away : sf.home).name)
          : { goalEvents: [], cardEvents: [], injuryEvents: [] };

        // Simulate other SF if both sides are AI
        const otherSF = ko.semiFinals.find(m => m.id !== matchId && !m.played);
        if (otherSF) {
          const r2 = simulateKnockoutMatch(otherSF.home, otherSF.away, "me", save);
          otherSF.played = true; otherSF.result = r2; otherSF.score = r2.score;
          otherSF.winner = r2.winner; otherSF.loser = r2.loser;
        }

        // If both SFs played, build final
        const allSFDone = ko.semiFinals.every(m => m.played);
        if (allSFDone) {
          const sf1W = ko.semiFinals[0].winner;
          const sf2W = ko.semiFinals[1].winner;
          const sf1L = ko.semiFinals[0].loser;
          const sf2L = ko.semiFinals[1].loser;
          ko.final = { id: "final", home: sf1W, away: sf2W, played: false, result: null };
          ko.thirdPlace = { id: "third", home: sf1L, away: sf2L, played: false, result: null };
          ko.stage = "final";
        }

        const coinReward = r.isMyTeam ? (r.winner.isMe ? 400 : 80) : 0;
        if (coinReward > 0) save.coin = Number(save.coin||0) + coinReward;
        save.afcChampions = afc;
        persist(req.user.username, save);
        return ok(res, {
          result: r.winner.isMe ? "WIN" : (r.loser && r.loser.isMe ? "LOSE" : "AI_SIM"),
          score: r.score, enemyName: (sf.home.isMe ? sf.away : sf.home).name,
          reward: coinReward, playerPower: 0, enemyPower: 0, chemistry: 5,
          goalEvents, cardEvents, injuryEvents, skillEvents: [],
          userTeam: { name: save.myClub?.name||"My Team" }, returnTo: "afc",
          knockoutStatus: ko, stage: "semifinal"
        });
      }

      // Play final
      if (ko.final && !ko.final.played && matchId === "final") {
        const r = simulateKnockoutMatch(ko.final.home, ko.final.away, "me", save);
        ko.final.played = true; ko.final.result = r; ko.final.score = r.score;
        ko.winner = r.winner;
        ko.finished = true;
        afc.stage = "finished";
        afc.finished = true;
        afc.champion = r.winner;

        const { goalEvents, cardEvents, injuryEvents } = r.isMyTeam
          ? generateMatchEvents(save, r.hGoals, r.aGoals, (ko.final.home.isMe ? ko.final.away : ko.final.home).name)
          : { goalEvents: [], cardEvents: [], injuryEvents: [] };

        const isChampion = r.winner.isMe;
        // Player yang sudah tersingkir di semi dapat reward penonton
        const finalReward = isChampion ? 2000 : r.isMyTeam ? 500 : 150;
        save.coin = Number(save.coin||0) + finalReward;
        if (isChampion) save.premiumCoin = Number(save.premiumCoin||0) + 15;
        afc.message = isChampion
          ? "🏆 JUARA AFC CHAMPIONS LEAGUE! Luar biasa!"
          : r.isMyTeam
            ? "🥈 Runner-up AFC. Bangga!"
            : `🏆 ${r.winner.name} memenangkan AFC Champions League!`;
        save.afcChampions = afc;
        persist(req.user.username, save);

        // Jika bukan timku yang main (AI final), return AI_SIM agar frontend refresh
        const resultLabel = isChampion ? "WIN" : r.loser?.isMe ? "LOSE" : "AI_SIM";
        const enemyName = ko.final.home.isMe ? ko.final.away.name : ko.final.home.name;
        return ok(res, {
          result: resultLabel,
          score: r.score, enemyName: enemyName || "AI Team",
          reward: finalReward, playerPower: 0, enemyPower: 0, chemistry: 5,
          goalEvents, cardEvents, injuryEvents, skillEvents: [],
          userTeam: { name: save.myClub?.name||"My Team" }, returnTo: "afc",
          knockoutStatus: ko, stage: "final", champion: isChampion,
          afcWinner: r.winner.name
        });
      }

      return fail(res, 400, "Match tidak valid atau sudah dimainkan");
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.get("/afc/standings", guard, (req, res) => {
    try {
      const save = req2save(req);
      const afc = save.afcChampions;
      if (!afc) return fail(res, 404, "Belum masuk AFC");

      // Build stats dari schedule
      const scorerMap = {}, assistMap = {}, cardMap = {};
      (afc.schedule || []).filter(m => m.played).forEach(m => {
        (m.goalEvents || []).forEach(g => {
          if (g.team === "home" && g.scorerName) {
            if (!scorerMap[g.scorerName]) scorerMap[g.scorerName] = { name: g.scorerName, goals: 0 };
            scorerMap[g.scorerName].goals++;
          }
          if (g.assistName) {
            if (!assistMap[g.assistName]) assistMap[g.assistName] = { name: g.assistName, assists: 0 };
            assistMap[g.assistName].assists++;
          }
        });
        (m.cardEvents || []).forEach(c => {
          if (!c.playerName) return;
          if (!cardMap[c.playerName]) cardMap[c.playerName] = { name: c.playerName, yellow: 0, red: 0 };
          if (c.type === "red") cardMap[c.playerName].red++; else cardMap[c.playerName].yellow++;
        });
      });

      return ok(res, {
        standings: afc.standings,
        stage: afc.stage,
        myStats: afc.myStats,
        knockout: afc.knockout||null,
        topScorers: Object.values(scorerMap).sort((a,b)=>b.goals-a.goals).slice(0,7),
        topAssists: Object.values(assistMap).sort((a,b)=>b.assists-a.assists).slice(0,7),
        topCards:   Object.values(cardMap).sort((a,b)=>(b.yellow+b.red*2)-(a.yellow+a.red*2)).slice(0,5),
      });
    } catch(e) { return fail(res, 400, e.message); }
  });

  // ── AFF STANDINGS (topScorers/topAssists/topCards) ────────────
  router.get("/aff/standings", guard, (req, res) => {
    try {
      const save = req2save(req);
      const aff = save.affCup;
      if (!aff) return fail(res, 404, "Belum ikut AFF");

      const scorerMap = {}, assistMap = {}, cardMap = {};
      (aff.schedule || []).filter(m => m.played).forEach(m => {
        (m.goalEvents || []).forEach(g => {
          if (g.team === "home" && g.scorerName) {
            if (!scorerMap[g.scorerName]) scorerMap[g.scorerName] = { name: g.scorerName, goals: 0 };
            scorerMap[g.scorerName].goals++;
          }
          if (g.assistName) {
            if (!assistMap[g.assistName]) assistMap[g.assistName] = { name: g.assistName, assists: 0 };
            assistMap[g.assistName].assists++;
          }
        });
        (m.cardEvents || []).forEach(c => {
          if (!c.playerName) return;
          if (!cardMap[c.playerName]) cardMap[c.playerName] = { name: c.playerName, yellow: 0, red: 0 };
          if (c.type === "red") cardMap[c.playerName].red++; else cardMap[c.playerName].yellow++;
        });
      });

      return ok(res, {
        standings: aff.standings || [],
        stage: aff.stage,
        knockout: aff.knockout || null,
        topScorers: Object.values(scorerMap).sort((a,b)=>b.goals-a.goals).slice(0,7),
        topAssists: Object.values(assistMap).sort((a,b)=>b.assists-a.assists).slice(0,7),
        topCards:   Object.values(cardMap).sort((a,b)=>(b.yellow+b.red*2)-(a.yellow+a.red*2)).slice(0,5),
      });
    } catch(e) { return fail(res, 400, e.message); }
  });

  // ── PIALA AFF CLUB CHAMPIONSHIP ──────────────────────────────
  router.get("/aff", guard, (req, res) => {
    try {
      const save = req2save(req);
      return ok(res, { aff: save.affCup||null, clubs: AFF_CLUBS });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/aff/enter", guard, (req, res) => {
    try {
      const save = req2save(req);
      if (save.affCup && !save.affCup.finished) return fail(res, 400, "Sudah dalam Piala AFF");
      const shuffled = [...AFF_CLUBS].sort(()=>Math.random()-0.5).slice(0,3);
      const myTeamName = save.myClub?.name||"My Team";
      save.affCup = {
        season: (save.affCup?.season||0)+1,
        groupClubs: [...shuffled, {id:"me",name:myTeamName,logo:"⭐",country:"🇮🇩",str:1.0,isMe:true}],
        schedule: shuffled.map((c,i)=>({matchday:i+1,club:c,isHome:i%2===0,played:false,result:null,score:null})),
        currentMatchday: 0,
        myStats:{played:0,won:0,drawn:0,lost:0,points:0,goalsFor:0,goalsAgainst:0},
        standings: [...shuffled,{id:"me",name:myTeamName,logo:"⭐",country:"🇮🇩",str:1.0,isMe:true}].map(c=>({
          id:c.id,name:c.name,logo:c.logo,country:c.country||"🌏",
          played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,gd:0,points:0,isMe:c.isMe||false
        })),
        finished:false, reward:0
      };
      persist(req.user.username, save);
      return ok(res, {aff:save.affCup, message:"Selamat! Lolos ke Piala AFF Club Championship!"});
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/aff/match", guard, (req, res) => {
    try {
      const save = req2save(req);
      const aff = save.affCup;
      if (!aff||aff.finished) return fail(res,400,"Tidak ada AFF match aktif");
      const idx = Number(req.body?.matchdayIdx??aff.currentMatchday);
      const match = aff.schedule[idx];
      if (!match||match.played) return fail(res,400,"Match tidak valid");
      const starterIds=Object.values(save.lineup||{}).filter(Boolean);
      if (starterIds.length<11) return fail(res,400,"Lineup belum penuh");
      const myPower=starterIds.map(id=>(save.players||[]).find(p=>String(p.id)===String(id))).filter(Boolean).reduce((s,p)=>s+Number(p.basePower||50),0)/11;
      const club=match.club;
      const oppPower=(club.str||1.0)*78+Math.random()*12;
      const homeAdv=match.isHome?1.05:0.95;
      const myGoals=simulateGoals(myPower*homeAdv,oppPower);
      const oppGoals=simulateGoals(oppPower,myPower*homeAdv);
      const result=myGoals>oppGoals?"WIN":myGoals<oppGoals?"LOSE":"DRAW";

      // Feature #6: Match events
      const { goalEvents, cardEvents, injuryEvents } = generateMatchEvents(save, myGoals, oppGoals, club.name);

      aff.schedule[idx]={...match,played:true,result,score:`${myGoals}-${oppGoals}`,myGoals,oppGoals,goalEvents};
      aff.currentMatchday=idx+1;
      const ms=aff.myStats;
      ms.played++;ms.goalsFor+=myGoals;ms.goalsAgainst+=oppGoals;
      if(result==="WIN"){ms.won++;ms.points+=3;}else if(result==="DRAW"){ms.drawn++;ms.points++;}else ms.lost++;
      const mySt=aff.standings.find(t=>t.isMe);
      if(mySt){mySt.played++;mySt.goalsFor+=myGoals;mySt.goalsAgainst+=oppGoals;mySt.gd=mySt.goalsFor-mySt.goalsAgainst;if(result==="WIN"){mySt.won++;mySt.points+=3;}else if(result==="DRAW"){mySt.drawn++;mySt.points++;}else mySt.lost++;}
      const oppSt=aff.standings.find(t=>t.id===club.id);
      if(oppSt){oppSt.played++;oppSt.goalsFor+=oppGoals;oppSt.goalsAgainst+=myGoals;oppSt.gd=oppSt.goalsFor-oppSt.goalsAgainst;if(myGoals<oppGoals){oppSt.won++;oppSt.points+=3;}else if(myGoals===oppGoals){oppSt.drawn++;oppSt.points++;}else oppSt.lost++;}

      // Feature #7: AI simulates other fixtures - BUG4 FIX: proportional match count
      const affMatchesPlayed = aff.schedule.filter(m => m.played).length;
      simulateAIvsAI(aff.standings, "me", affMatchesPlayed);
      aff.standings.sort((a,b)=>b.points-a.points||b.gd-a.gd||b.goalsFor-a.goalsFor);

      const coinReward=result==="WIN"?200:result==="DRAW"?80:30;
      save.coin=Number(save.coin||0)+coinReward;

      const allPlayed = aff.schedule.every(m=>m.played);
      if(allPlayed){
        const myRank=aff.standings.findIndex(t=>t.isMe)+1;
        if(myRank<=2){
          // Feature #8: AFF knockout
          aff.knockout = buildKnockoutBracket(aff.standings, "Piala AFF Club Championship");
          aff.stage="knockout";
          aff.message="🌏 Lolos ke Semifinal AFF!";
          aff.reward=400;
        } else {
          aff.finished=true;
          aff.stage="group_done";
          aff.message="❌ Tidak lolos fase grup AFF";
          aff.reward=150;
        }
        save.coin=Number(save.coin||0)+aff.reward;
      }
      save.affCup=aff;
      persist(req.user.username,save);
      return ok(res,{result,score:`${myGoals}-${oppGoals}`,enemyName:club.name,reward:coinReward,playerPower:Math.round(myPower),enemyPower:Math.round(oppPower),chemistry:5,goalEvents,cardEvents,injuryEvents,skillEvents:[],userTeam:{name:save.myClub?.name||"My Team"},returnTo:"aff",groupFinished:allPlayed,knockoutUnlocked:allPlayed&&aff.stage==="knockout"});
    } catch(e){return fail(res,400,e.message);}
  });

  // Feature #8: AFF Knockout
  router.post("/aff/knockout", guard, (req, res) => {
    try {
      const save = req2save(req);
      const aff = save.affCup;
      if (!aff || !aff.knockout) return fail(res, 400, "Tidak ada fase knockout AFF");
      const ko = aff.knockout;
      if (ko.finished) return fail(res, 400, "Knockout sudah selesai");
      const { matchId } = req.body || {};

      const sf = ko.semiFinals.find(m => m.id === matchId && !m.played);
      if (sf) {
        const r = simulateKnockoutMatch(sf.home, sf.away, "me", save);
        sf.played=true; sf.result=r; sf.score=r.score; sf.winner=r.winner; sf.loser=r.loser;
        const otherSF = ko.semiFinals.find(m=>m.id!==matchId&&!m.played);
        if(otherSF){const r2=simulateKnockoutMatch(otherSF.home,otherSF.away,"me",save);otherSF.played=true;otherSF.result=r2;otherSF.score=r2.score;otherSF.winner=r2.winner;otherSF.loser=r2.loser;}
        if(ko.semiFinals.every(m=>m.played)){
          ko.final={id:"final",home:ko.semiFinals[0].winner,away:ko.semiFinals[1].winner,played:false,result:null};
          ko.thirdPlace={id:"third",home:ko.semiFinals[0].loser,away:ko.semiFinals[1].loser,played:false,result:null};
          ko.stage="final";
        }
        const { goalEvents, cardEvents, injuryEvents } = r.isMyTeam ? generateMatchEvents(save,r.hGoals,r.aGoals,(sf.home.isMe?sf.away:sf.home).name):{goalEvents:[],cardEvents:[],injuryEvents:[]};
        const coinReward = r.isMyTeam?(r.winner.isMe?300:60):0;
        if(coinReward>0) save.coin=Number(save.coin||0)+coinReward;

        if (r.loser?.isMe && ko.final && !ko.final.played) {
          const rFinal = simulateKnockoutMatch(ko.final.home, ko.final.away, "me", save);
          ko.final.played = true;
          ko.final.result = rFinal;
          ko.final.score = rFinal.score;
          ko.winner = rFinal.winner;
          ko.finished = true;
          aff.stage = "finished";
          aff.finished = true;
          aff.champion = rFinal.winner;
          aff.message = `😢 Tersingkir di Semifinal. Juara: ${rFinal.winner.name}`;
        }

        save.affCup=aff; persist(req.user.username,save);
        return ok(res,{result:r.winner.isMe?"WIN":r.loser?.isMe?"LOSE":"AI_SIM",score:r.score,enemyName:(sf.home.isMe?sf.away:sf.home).name,reward:coinReward,playerPower:0,enemyPower:0,chemistry:5,goalEvents,cardEvents,injuryEvents,skillEvents:[],userTeam:{name:save.myClub?.name||"My Team"},returnTo:"aff",knockoutStatus:ko,stage:"semifinal"});
      }

      if(ko.final&&!ko.final.played&&matchId==="final"){
        const r=simulateKnockoutMatch(ko.final.home,ko.final.away,"me",save);
        ko.final.played=true;ko.final.result=r;ko.final.score=r.score;ko.winner=r.winner;ko.finished=true;
        aff.stage="finished";aff.finished=true;aff.champion=r.winner;
        const { goalEvents, cardEvents, injuryEvents } = r.isMyTeam?generateMatchEvents(save,r.hGoals,r.aGoals,(ko.final.home.isMe?ko.final.away:ko.final.home).name):{goalEvents:[],cardEvents:[],injuryEvents:[]};
        const isChamp=r.winner.isMe;
        const finalReward=isChamp?1500:r.isMyTeam?400:100;
        save.coin=Number(save.coin||0)+finalReward;
        if(isChamp) save.premiumCoin=Number(save.premiumCoin||0)+10;
        aff.message=isChamp?"🌏 JUARA PIALA AFF! Luar biasa!":r.isMyTeam?"🥈 Runner-up AFF. Hampir!":`🏆 ${r.winner.name} memenangkan Piala AFF!`;
        save.affCup=aff; persist(req.user.username,save);
        const resultLabel=isChamp?"WIN":r.loser?.isMe?"LOSE":"AI_SIM";
        const enemyN=ko.final.home.isMe?ko.final.away.name:ko.final.home.name;
        return ok(res,{result:resultLabel,score:r.score,enemyName:enemyN||"AI Team",reward:finalReward,playerPower:0,enemyPower:0,chemistry:5,goalEvents,cardEvents,injuryEvents,skillEvents:[],userTeam:{name:save.myClub?.name||"My Team"},returnTo:"aff",knockoutStatus:ko,stage:"final",champion:isChamp,affWinner:r.winner.name});
      }
      return fail(res,400,"Match tidak valid");
    } catch(e){return fail(res,400,e.message);}
  });

  // ── DERBY MATCH ──────────────────────────────────────────────
  router.get("/derby", guard, (req, res) => {
    try {
      const save = req2save(req);
      const myClub = save.myClub;
      const availableDerbies = DERBY_MATCHES.filter(d => myClub && (d.home===myClub.name||d.away===myClub.name));
      return ok(res, { derbies: availableDerbies, allDerbies: DERBY_MATCHES, myClub, history: save.derbyHistory||[] });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/derby/play", guard, (req, res) => {
    try {
      const save = req2save(req);
      const { derbyId } = req.body || {};
      const derby = DERBY_MATCHES.find(d=>d.id===derbyId);
      if (!derby) return fail(res, 404, "Derby tidak ditemukan");
      const starterIds = Object.values(save.lineup||{}).filter(Boolean);
      if (starterIds.length < 11) return fail(res, 400, "Lineup belum penuh");
      const myPower = starterIds.map(id=>(save.players||[]).find(p=>String(p.id)===String(id))).filter(Boolean).reduce((s,p)=>s+Number(p.basePower||50),0)/11;
      const oppPower = 75 + Math.random()*20;
      const myGoals = simulateGoals(myPower, oppPower);
      const oppGoals = simulateGoals(oppPower, myPower);
      const result = myGoals>oppGoals?"WIN":myGoals<oppGoals?"LOSE":"DRAW";
      const baseReward = result==="WIN"?150:result==="DRAW"?60:30;
      const coinReward = Math.floor(baseReward * derby.multiplier);

      // Feature #6: Match events
      const enemyName = derby.home===save.myClub?.name ? derby.away : derby.home;
      const { goalEvents, cardEvents, injuryEvents } = generateMatchEvents(save, myGoals, oppGoals, enemyName);

      save.coin = Number(save.coin||0)+coinReward;
      save.winCount = Number(save.winCount||0)+(result==="WIN"?1:0);

      // Track derby history for scoreboard (Feature #5)
      if (!save.derbyHistory) save.derbyHistory = [];
      save.derbyHistory.unshift({ derbyId, name:derby.name, result, score:`${myGoals}-${oppGoals}`, enemyName, reward:coinReward, date:Date.now() });
      if (save.derbyHistory.length > 10) save.derbyHistory.pop();

      persist(req.user.username, save);
      return ok(res, {
        result, score:`${myGoals}-${oppGoals}`,
        enemyName, reward:coinReward,
        multiplier:derby.multiplier, derbyName:derby.name,
        playerPower:Math.round(myPower), enemyPower:Math.round(oppPower),
        chemistry:8,
        goalEvents, cardEvents, injuryEvents, skillEvents:[],
        userTeam:{name:save.myClub?.name||"My Team"},
        returnTo:"derby",
        special:`🔥 ${derby.name}! Bonus x${derby.multiplier}!`
      });
    } catch(e) { return fail(res, 400, e.message); }
  });

  // ── TEMATIC CUPS ─────────────────────────────────────────────
  // Feature #4: Only return active cup data if in progress; show selection only when finished/none
  router.get("/cups", guard, (req, res) => {
    try {
      const save = req2save(req);
      const activeCup = save.activeCup || null;
      // Feature #5: Build cup scoreboard
      const scoreboard = activeCup ? {
        topScorer: activeCup.topScorers || [],
        results: (activeCup.schedule||[]).filter(m=>m.played).map(m=>({ opponent:m.opponent, score:m.score, result:m.result }))
      } : null;
      return ok(res, {
        cups: TEMATIC_CUPS,
        activeCup,
        scoreboard,
        showCupSelection: !activeCup || activeCup.finished
      });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/cups/enter", guard, (req, res) => {
    try {
      const save = req2save(req);
      const { cupId } = req.body||{};
      const cup = TEMATIC_CUPS[cupId];
      if (!cup) return fail(res, 404, "Cup tidak ditemukan");
      if (save.activeCup && !save.activeCup.finished) return fail(res, 400, "Selesaikan cup saat ini dulu sebelum memilih cup lain!");
      const opponents = [...cup.teams].filter(t=>t!==save.myClub?.name).sort(()=>Math.random()-0.5).slice(0,3);
      save.activeCup = {
        cupId, name:cup.name, icon:cup.icon, color:cup.color,
        schedule: opponents.map((t,i)=>({matchday:i+1,opponent:t,played:false,result:null,score:null})),
        currentMatchday: 0, points:0, finished:false,
        rewards: cup.rewards,
        topScorers: [],
        goalEvents: []
      };
      persist(req.user.username, save);
      return ok(res, {activeCup:save.activeCup, message:`${cup.icon} ${cup.name} dimulai!`});
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/cups/match", guard, (req, res) => {
    try {
      const save = req2save(req);
      const cup = save.activeCup;
      if (!cup||cup.finished) return fail(res,400,"Tidak ada cup aktif");
      const idx = Number(req.body?.matchdayIdx??cup.currentMatchday);
      const match = cup.schedule[idx];
      if (!match||match.played) return fail(res,400,"Match tidak valid");
      const starterIds=Object.values(save.lineup||{}).filter(Boolean);
      if (starterIds.length<11) return fail(res,400,"Lineup belum penuh");
      const myPower=starterIds.map(id=>(save.players||[]).find(p=>String(p.id)===String(id))).filter(Boolean).reduce((s,p)=>s+Number(p.basePower||50),0)/11;
      const oppPower=65+Math.random()*25;
      const myGoals=simulateGoals(myPower,oppPower);
      const oppGoals=simulateGoals(oppPower,myPower);
      const result=myGoals>oppGoals?"WIN":myGoals<oppGoals?"LOSE":"DRAW";

      // Feature #6: Match events
      const { goalEvents, cardEvents, injuryEvents } = generateMatchEvents(save, myGoals, oppGoals, match.opponent);

      cup.schedule[idx]={...match,played:true,result,score:`${myGoals}-${oppGoals}`};
      cup.currentMatchday=idx+1;
      if(result==="WIN")cup.points+=3;else if(result==="DRAW")cup.points+=1;
      const coinReward=result==="WIN"?Math.floor(150*1.5):result==="DRAW"?60:30;
      save.coin=Number(save.coin||0)+coinReward;

      // Feature #5: Track top scorers in cup
      if (!cup.topScorers) cup.topScorers = [];
      goalEvents.forEach(g=>{
        const existing = cup.topScorers.find(s=>s.name===g.scorerName);
        if(existing) existing.goals++;
        else cup.topScorers.push({name:g.scorerName, goals:1, assists:0});
        if(g.assistName){
          const aEx=cup.topScorers.find(s=>s.name===g.assistName);
          if(aEx) aEx.assists++;
          else cup.topScorers.push({name:g.assistName, goals:0, assists:1});
        }
      });
      cup.topScorers.sort((a,b)=>b.goals-a.goals||b.assists-a.assists);

      if(cup.schedule.every(m=>m.played)){
        cup.finished=true;
        const finalReward=cup.points>=9?cup.rewards.winner:cup.rewards.runner;
        save.coin=Number(save.coin||0)+(finalReward.coin||0);
        save.premiumCoin=Number(save.premiumCoin||0)+(finalReward.premium||0);
        cup.finalReward=finalReward;
        cup.message=cup.points>=9?`🏆 Kamu juara ${cup.name}!`:`🥈 Runner-up ${cup.name}`;
      }
      save.activeCup=cup;
      persist(req.user.username,save);

      // BUG 7 FIX: sertakan top scorers/assists saat cup selesai
      const cupResult = {result,score:`${myGoals}-${oppGoals}`,enemyName:match.opponent,reward:coinReward,playerPower:Math.round(myPower),enemyPower:Math.round(oppPower),chemistry:5,goalEvents,cardEvents,injuryEvents,skillEvents:[],userTeam:{name:save.myClub?.name||"My Team"},returnTo:"cups",cupBonus:cup.icon};
      if (cup.finished) {
        cupResult.cupFinished = true;
        const topScorers = (cup.topScorers||[]).slice(0,5);
        const myPlayers = save.players || [];
        cupResult.topScorers = topScorers.map(s=>({...s, isMe: myPlayers.some(p=>p.name===s.name)}));
        cupResult.topAssists = topScorers.filter(s=>s.assists>0).sort((a,b)=>b.assists-a.assists).slice(0,5).map(s=>({...s, isMe: myPlayers.some(p=>p.name===s.name)}));
        // Bonus reward top scorer
        if (topScorers[0] && myPlayers.some(p=>p.name===topScorers[0].name)) {
          save.coin = Number(save.coin||0) + 500;
          save.premiumCoin = Number(save.premiumCoin||0) + 5;
          cupResult.topScorerBonus = true;
        }
        persist(req.user.username, save);
      }
      return ok(res, cupResult);
    } catch(e){return fail(res,400,e.message);}
  });

  // ── TRANSFER DEADLINE DAY ─────────────────────────────────────
  router.get("/deadline-day", guard, (req, res) => {
    try {
      const save = req2save(req);
      const dl = save.deadlineDay || null;
      const now = Date.now();
      if (dl && dl.expiresAt > now) {
        return ok(res, { active: true, expiresAt: dl.expiresAt, remainingMs: dl.expiresAt-now, pool: dl.pool });
      }
      return ok(res, { active: false, pool: [] });
    } catch(e) { return fail(res, 400, e.message); }
  });

  router.post("/deadline-day/activate", guard, (req, res) => {
    try {
      const save = req2save(req);
      const cost = 3; // premium coin
      if (Number(save.premiumCoin||0) < cost) return fail(res, 400, "Butuh 3 Premium Coin");
      save.premiumCoin = Number(save.premiumCoin||0)-cost;
      const EXCLUSIVE_NAMES = ["Roberto Fiesta","Ivan Kovac","Ahmad Al-Rashid","Park Ji-Won","Keanu Silva","Takeshi Mori"];
      const roles = ["ST","LW","CM","CB","GK","RW"];
      const pool = Array.from({length:6},(_,i)=>({
        id:`dl_${Date.now()}_${i}`,
        name:EXCLUSIVE_NAMES[i],
        role:roles[i],
        type:["GK"].includes(roles[i])?"GK":["CB"].includes(roles[i])?"DEF":["CM"].includes(roles[i])?"MID":"ATT",
        rarity:"S",
        basePower:80+Math.floor(Math.random()*12),
        power:80+Math.floor(Math.random()*12),
        pace:70+Math.floor(Math.random()*20),
        shooting:65+Math.floor(Math.random()*25),
        passing:65+Math.floor(Math.random()*25),
        defense:55+Math.floor(Math.random()*30),
        stamina:80+Math.floor(Math.random()*15),
        mentality:80+Math.floor(Math.random()*15),
        nationality:"🌍",age:24+Math.floor(Math.random()*6),
        trait:"Transfer Deadline Exclusive",
        level:1,exp:0,expNeeded:100,growth:6,
        price:Math.floor((80+Math.random()*10)*5*1.5), // 50% markup
        deadlineExclusive:true,
        image:`https://api.dicebear.com/7.x/bottts/svg?seed=dl${i}&backgroundColor=ff6b35`,
        equipment:{HEAD:null,BODY:null,HAND:null,FEET:null,ACC:null},
        curStamina:100,injury:null,skill:"NONE"
      }));
      save.deadlineDay = { expiresAt: Date.now()+48*60*60*1000, pool };
      save.transferPool = [...pool, ...(save.transferPool||[]).slice(0,4)];
      persist(req.user.username, save);
      return ok(res, { active:true, pool, expiresAt:save.deadlineDay.expiresAt, message:"⏰ Transfer Deadline Day aktif 48 jam! Harga naik 50%, pemain eksklusif tersedia!" });
    } catch(e) { return fail(res, 400, e.message); }
  });

  // ── SCOREBOARD / LEADERBOARD (Feature #5) ────────────────────
  router.get("/scoreboard/:competition", guard, (req, res) => {
    try {
      const save = req2save(req);
      const comp = req.params.competition;
      let data = {};

      if (comp === "afc" && save.afcChampions) {
        const afc = save.afcChampions;
        data = {
          name: "AFC Champions League",
          standings: afc.standings || [],
          schedule: afc.schedule || [],
          myStats: afc.myStats || {},
          topScorers: buildTopScorers(afc.schedule || [], save),
          stage: afc.stage || "group",
          knockout: afc.knockout || null,
          champion: afc.champion || null
        };
      } else if (comp === "aff" && save.affCup) {
        const aff = save.affCup;
        data = {
          name: "Piala AFF Club Championship",
          standings: aff.standings || [],
          schedule: aff.schedule || [],
          myStats: aff.myStats || {},
          topScorers: buildTopScorers(aff.schedule || [], save),
          stage: aff.stage || "group",
          knockout: aff.knockout || null
        };
      } else if (comp === "cup" && save.activeCup) {
        const cup = save.activeCup;
        data = {
          name: cup.name,
          icon: cup.icon,
          schedule: cup.schedule || [],
          topScorers: cup.topScorers || [],
          points: cup.points,
          finished: cup.finished,
          finalReward: cup.finalReward || null,
          message: cup.message || null
        };
      } else if (comp === "derby") {
        data = {
          name: "Derby Match",
          history: save.derbyHistory || [],
          topDerbies: DERBY_MATCHES
        };
      } else {
        return fail(res, 404, "Competition tidak ditemukan");
      }
      return ok(res, data);
    } catch(e) { return fail(res, 400, e.message); }
  });

  // ── SET BONUS INFO ────────────────────────────────────────────
  router.get("/set-bonus/:playerId", guard, (req, res) => {
    try {
      const save = req2save(req);
      const player = (save.players||[]).find(p=>String(p.id)===String(req.params.playerId));
      if (!player) return fail(res, 404, "Pemain tidak ditemukan");
      const inventory = Array.isArray(save.inventory)?save.inventory:[];
      const bonuses = getSetBonus(player.equipment, inventory);
      return ok(res, { bonuses, equipment: player.equipment });
    } catch(e) { return fail(res, 400, e.message); }
  });

  // ── ENCHANT ──────────────────────────────────────────────────
  router.post("/enchant", guard, (req, res) => {
    try {
      const save = req2save(req);
      const { equipId, scrollId } = req.body||{};
      const inv = Array.isArray(save.inventory)?save.inventory:[];
      const equip = inv.find(e=>String(e.id)===String(equipId)&&e.slot);
      if (!equip) return fail(res,404,"Equipment tidak ditemukan");
      const scrollIdx = inv.findIndex(s=>String(s.id)===String(scrollId)&&s.effect==="enchant");
      if (scrollIdx<0) return fail(res,404,"Enchant scroll tidak ditemukan");
      const scroll = inv[scrollIdx];
      if (equip.enchant) return fail(res,400,"Equipment sudah di-enchant. Hanya 1 enchant per item.");
      equip.enchant = scroll.enchantType;
      equip.enchantValue = scroll.value;
      equip.enchantIcon = scroll.icon;
      if (scroll.enchantType==="sharp") {
        equip.power = Math.floor(Number(equip.power||0)*1.15);
        if (equip.bonus) Object.keys(equip.bonus).forEach(k=>equip.bonus[k]=Math.floor(equip.bonus[k]*1.15));
      } else if (scroll.enchantType==="durable") {
        equip.maxHp = Math.min(200, Number(equip.maxHp||100)+50);
        equip.hp = Math.min(equip.maxHp, Number(equip.hp||100)+50);
      }
      save.inventory.splice(scrollIdx,1);
      persist(req.user.username,save);
      return ok(res,{equip,message:`✨ ${scroll.enchantType.toUpperCase()} enchant berhasil dipasang!`});
    } catch(e){return fail(res,400,e.message);}
  });

  return router;
}

module.exports = { createFeaturesRouter, getSponsor, getSetBonus, SPONSOR_TIERS };
