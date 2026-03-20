/**
 * adapterRoutes.js
 * Adapter layer: menghubungkan endpoint yang dipanggil frontend
 * dengan logic yang sudah ada di backend services.
 *
 * FIX LIST:
 * 1. GET  /match         → playMatch alias (frontend calls GET /match)
 * 2. GET  /match/visual  → return posisi visual pemain untuk animasi
 * 3. GET  /transfer/list → alias /transfer/market dengan format frontend
 * 4. POST /transfer/sell → jual pemain ke transfer pool
 * 5. POST /transfer/refresh → refresh transfer pool (cost 50 coin)
 * 6. GET  /liga/status   → status liga nusantara dari save
 * 7. POST /liga/start    → mulai liga season baru
 * 8. GET  /liga/standings→ klasemen liga
 * 9. POST /liga/match/:idx → main match liga (alias playLigaMatch)
 * 10. GET /liga/topscorers → statistik liga
 * 11. GET /liga/match/:idx → detail match yang sudah dimainkan
 * 12. GET  /career        → status career mode
 * 13. POST /career/start  → mulai career season
 * 14. POST /career/match  → main matchday career
 * 15. GET  /career/standings → klasemen career
 * 16. GET  /career/topscorers → statistik career
 * 17. GET  /career/match/:idx → detail career match
 * 18. PATCH /team response → tambah finalStats ke setiap player
 * 19. PATCH /formation → lineup object berisi player lengkap, bukan hanya ID
 */

const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

// ── Helper: hydrate player dengan finalStats ──────────────────────
function hydratePlayerFull(player, inventory) {
  const inv = Array.isArray(inventory) ? inventory : [];
  const stats = {
    pace: Number(player.pace || 50),
    shooting: Number(player.shooting || 50),
    passing: Number(player.passing || 50),
    defense: Number(player.defense || 50),
    stamina: Number(player.stamina || 100),
    mentality: Number(player.mentality || 100),
  };
  let equipPower = 0;
  Object.entries(player.equipment || {}).forEach(([, itemId]) => {
    if (!itemId) return;
    const item = inv.find((e) => String(e.id) === String(itemId));
    if (!item || !item.slot) return;
    equipPower += Number(item.power || 0);
    if (item.bonus && typeof item.bonus === "object") {
      Object.entries(item.bonus).forEach(([k, v]) => {
        if (stats[k] !== undefined) stats[k] += Number(v || 0);
      });
    }
  });
  const base = Number(player.basePower || player.power || 50);
  const levelFactor = 1 + (Math.max(1, Number(player.level || 1)) - 1) * 0.05;
  const staminaFactor =
    Number(player.curStamina ?? 100) >= 50
      ? 1
      : 0.6 + (Number(player.curStamina ?? 100) / 50) * 0.4;
  const injFactor = player.injury ? 0.6 : 1;
  const power = Math.max(
    1,
    Math.floor((base + equipPower) * levelFactor * staminaFactor * injFactor)
  );

  return {
    ...player,
    power,
    basePower: base,
    finalStats: { ...stats },
    equipPower,
  };
}

// ── Helper: build hydrated team response ─────────────────────────
function buildTeamResponse(save) {
  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  const allEquipment = inv.filter((i) => i && i.slot);
  const consumables = inv.filter((i) => i && !i.slot);
  const team = (save.players || []).map((p) => hydratePlayerFull(p, inv));
  return {
    team,
    players: team, // alias
    inventory: allEquipment,
    consumables,
    allEquipment,
  };
}

// ── Helper: build formation response dengan player objects ────────
function buildFormationResponse(save) {
  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  const formation = save.formation || "4-3-3";
  const lineupRaw = save.lineup || {};

  // BUG1 FIX: Deduplicate lineup — satu player hanya boleh di satu posisi.
  // Jika player sama muncul di >1 posisi, hanya posisi pertama yang dipakai.
  const seenPlayerIds = new Set();
  const deduplicatedLineup = {};
  Object.entries(lineupRaw).forEach(([pos, playerId]) => {
    if (!playerId) { deduplicatedLineup[pos] = null; return; }
    const pidStr = String(playerId);
    if (seenPlayerIds.has(pidStr)) {
      // Duplikat — kosongkan posisi ini supaya tidak muncul dua kali
      deduplicatedLineup[pos] = null;
    } else {
      seenPlayerIds.add(pidStr);
      deduplicatedLineup[pos] = playerId;
    }
  });

  // lineup: posisi → player object (bukan ID)
  const lineup = {};
  Object.entries(deduplicatedLineup).forEach(([pos, playerId]) => {
    if (!playerId) { lineup[pos] = null; return; }
    const p = (save.players || []).find((x) => String(x.id) === String(playerId));
    lineup[pos] = p ? hydratePlayerFull(p, inv) : null;
  });

  // players = bench (yang belum di lineup)
  const usedIds = new Set(
    Object.values(deduplicatedLineup).filter(Boolean).map(String)
  );
  const players = (save.players || [])
    .filter((p) => !usedIds.has(String(p.id)))
    .map((p) => hydratePlayerFull(p, inv));
  return { formation, lineup, players };
}

// ── Liga helpers ──────────────────────────────────────────────────
const LIGA_CLUBS = [
  { name: "Persija Jakarta",   logo: "🔴", strength: 1.10 },
  { name: "PSIS Semarang",     logo: "⚫", strength: 0.92 },
  { name: "Persib Bandung",    logo: "💙", strength: 1.05 },
  { name: "PSS Sleman",        logo: "🟡", strength: 0.90 },
  { name: "Madura United",     logo: "🔴", strength: 0.95 },
  { name: "Persebaya Surabaya",logo: "🟢", strength: 1.08 },
  { name: "Arema FC",          logo: "🔵", strength: 1.00 },
  { name: "Borneo FC",         logo: "🟠", strength: 0.88 },
  { name: "PSM Makassar",      logo: "🔴", strength: 1.03 },
  { name: "Barito Putera",     logo: "🟣", strength: 0.85 },
  { name: "Dewa United",       logo: "🟤", strength: 0.93 },
];

function buildLigaSchedule(save) {
  const myClubName = save?.myClub?.name || save?.teamName || null;
  return LIGA_CLUBS.filter((club) => club.name !== myClubName).map((club) => ({
    ...club,
    played: false,
    result: null,
    score: null,
  }));
}

function ensureLiga(save) {
  if (!save.liga || !Array.isArray(save.liga.schedule)) {
    save.liga = {
      season: 1,
      schedule: buildLigaSchedule(save),
      currentMatch: 0,
      myPoints: 0,
      myGoals: 0,
      finished: false,
      reward: 0,
      premiumReward: 0,
    };
  } else {
    const myClubName = save?.myClub?.name || save?.teamName || null;
    if (myClubName) {
      const beforeLen = save.liga.schedule.length;
      save.liga.schedule = save.liga.schedule.filter((m) => m && m.name !== myClubName);
      if (save.liga.schedule.length !== beforeLen) {
        save.liga.currentMatch = Math.min(save.liga.currentMatch || 0, Math.max(0, save.liga.schedule.length - 1));
      }
    }
  }
  return save.liga;
}

function buildLigaStandings(liga, myTeamName) {
  // Build standings dari schedule results
  const table = {};
  LIGA_CLUBS.filter((c) => c.name !== myTeamName).forEach((c) => {
    table[c.name] = {
      name: c.name,
      logo: c.logo,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0, gd: 0,
      isMe: false,
    };
  });
  const me = {
    name: myTeamName || "My Team",
    logo: "⭐",
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, points: 0, gd: 0,
    isMe: true,
  };

  (liga.schedule || []).forEach((m) => {
    if (!m.played) return;
    const [mg, og] = (m.score || "0-0").split("-").map(Number);
    me.played++;
    me.goalsFor += mg;
    me.goalsAgainst += og;
    if (m.result === "WIN") { me.won++; me.points += 3; }
    else if (m.result === "DRAW") { me.drawn++; me.points += 1; }
    else { me.lost++; }
    if (table[m.name]) {
      const opp = table[m.name];
      opp.played++;
      opp.goalsFor += og;
      opp.goalsAgainst += mg;
      if (m.result === "WIN") { opp.lost++; }
      else if (m.result === "DRAW") { opp.drawn++; opp.points += 1; }
      else { opp.won++; opp.points += 3; }
    }
  });

  // BUG 5 FIX: Tambahkan hasil AI vs AI ke standings
  // Gunakan aiMatchCounts sebagai jumlah match per team agar konsisten dengan player
  const playerMatchCount = (liga.schedule || []).filter((m) => m.played).length;
  if (liga.aiResults && liga.aiResults.length > 0) {
    // Hanya pakai hasil AI sampai round yang sama dengan player
    const relevantAi = liga.aiResults.filter((r) => r.round <= playerMatchCount);
    // Deduplicate: setiap pasangan hanya 1x per round
    const seen = new Set();
    relevantAi.forEach((r) => {
      const key = `${Math.min(r.home < r.away ? 0 : 1, 1)}_${[r.home, r.away].sort().join("_")}_${r.round}`;
      if (seen.has(key)) return;
      seen.add(key);
      const home = table[r.home];
      const away = table[r.away];
      if (!home || !away) return;
      // Pastikan tidak double-count jika away sudah main sebagai home di round yang sama
      home.played++;
      home.goalsFor += r.hg;
      home.goalsAgainst += r.ag;
      if (r.hg > r.ag) { home.won++; home.points += 3; away.lost++; }
      else if (r.hg === r.ag) { home.drawn++; home.points += 1; away.drawn++; away.points += 1; }
      else { home.lost++; away.won++; away.points += 3; }
      away.played++;
      away.goalsFor += r.ag;
      away.goalsAgainst += r.hg;
    });
  }

  me.gd = me.goalsFor - me.goalsAgainst;
  Object.values(table).forEach((t) => {
    t.gd = t.goalsFor - t.goalsAgainst;
  });

  const all = [me, ...Object.values(table)].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.goalsFor - a.goalsFor;
  });
  return { standings: all, myRank: all.findIndex((x) => x.isMe) + 1 };
}

function simulateGoals(attackerPower, defenderPower) {
  let goals = 0;
  const ratio = attackerPower / Math.max(1, defenderPower);
  for (let i = 0; i < 5; i++) {
    const chance = 0.12 + Math.max(-0.05, Math.min(0.22, (ratio - 1) * 0.14));
    if (Math.random() < chance) goals++;
  }
  return Math.min(goals, 7);
}

// ── Helper: Get Club Squad (User Character + NPCs) ──────────────────
function getClubSquad(save, clubId) {
  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  
  // 1. Get User Character
  const userChar = (save.players || []).find(p => p.humanControlled || p.isUserPlayer) || (save.players && save.players[0]);
  const hydratedUserChar = userChar ? hydratePlayerFull(userChar, inv) : { name: save.character?.name || "Player", power: 65, role: "ST" };

  // 2. Get Club NPCs
  const clubName = save.myClub?.name || "Persija Jakarta";
  const fixedLineup = CLUB_FIXED_LINEUP[clubName] || CLUB_FIXED_LINEUP["Persija Jakarta"];
  
  // Generate NPCs for the club, excluding the user's role if possible
  const userRole = hydratedUserChar.role || "ST";
  const squad = [hydratedUserChar];
  
  // Fill rest with NPCs
  fixedLineup.forEach(name => {
    if (squad.length >= 11) return;
    if (name === hydratedUserChar.name) return; // Skip if same name
    
    // Create a temporary NPC player object
    squad.push({
      id: `npc_${name}`,
      name: name,
      role: "DEF", // default, will be adjusted by simulate logic
      power: 70 + Math.floor(Math.random() * 8),
      isNPC: true
    });
  });

  // Ensure we have 11 players
  while (squad.length < 11) {
    squad.push({
      id: `npc_generic_${squad.length}`,
      name: `Pemain NPC ${squad.length}`,
      role: "MID",
      power: 65,
      isNPC: true
    });
  }

  return squad;
}

function getTeamPower(save) {
  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  const starters = Object.values(save.lineup || {})
    .filter(Boolean)
    .map((id) => (save.players || []).find((p) => String(p.id) === String(id)))
    .filter(Boolean)
    .map((p) => hydratePlayerFull(p, inv));
  if (!starters.length) return 60;
  return starters.reduce((s, p) => s + p.power, 0) / starters.length;
}

// ── Pool nama pemain Indonesia untuk tim lawan ────────────────────
const ENEMY_PLAYER_NAMES = {
  GK:  ["Adi Kurniawan","Wahyu Tri","Rizki Fernandi","Dian Priyatno","Hendra Wiguna","Galih Nugroho"],
  DEF: ["Fachruddin AM","Victor Igbonefo","Yustinus Pae","Ricky Fajrin","Rezaldi Hehanusa","Zalnando","Andik Rendika","Bagas Adi","Ryuji Utomo","Hamka Hamzah"],
  MID: ["Evan Dimas","Septian David","Yakob Sayuri","Saddil Ramdani","Asnawi Mangkualam","Osvaldo Haay","Irfan Jaya","Sani Rizki","Rachmat Irianto","Rizky Ridho"],
  ATT: ["Ilija Spasojevic","Alberto Goncalves","Beto Goncalves","Bruno Matos","Ciro Alves","Rafael Rodrigues","Jonathan Cantillana","Ricky Kayame","Diego Assis","Sylvano Comvalius"],
};

const CLUB_FIXED_LINEUP = {
  "Persija Jakarta": [
    "Andritany Ardhiyasa","Rizky Ridho","Hansamu Yama","Firza Andika","Ilham Rio Fahmi",
    "Maciej Gajos","Riko Simanjuntak","Syahrian Abimanyu","Witan Sulaeman","Marko Simic","Gustavo Almeida"
  ],
  "Persib Bandung": [
    "Kevin Ray Mendoza","Nick Kuipers","Alberto Rodriguez","Ardi Idrus","Henhen Herdiana",
    "Marc Klok","Dedi Kusnandar","Tyronne del Pino","Ciro Alves","David da Silva","Beckham Putra"
  ],
  "Persebaya Surabaya": [
    "Ernando Ari","Reva Adi Utama","Rachmat Irianto","Rizky Ridho","Koko Ari",
    "Hokky Caraka","Bruno Moreira","Ze Valente","Francisco Rivera","Paulo Victor","Flavio Silva"
  ],
  "Arema FC": [
    "Adilson Maringa","Bagas Adi","Sergio Silva","Charles Lokolingoy","Alfarizi",
    "Arkhan Fikri","Dendi Santoso","Jayus Hariono","Gustavo Almeida","Dedik Setiawan","Evan Dimas"
  ],
  "PSM Makassar": [
    "Reza Arya Pratama","Yuran Fernandes","Safrudin Tahar","Egy Maulana Vikri","Hasanuddin",
    "Wiljan Pluim","Yakob Sayuri","M Arfan","Victor Mansaray","Kenzo Nambu","Everton Nascimento"
  ],
  "Borneo FC": [
    "Nadeo Argawinata","Rendy Siregar","Leo Guntara","Diego Michiels","Dony Tri Pamungkas",
    "Stefano Lilipaly","Adam Alis","Jonathan Bustos","Matheus Pato","Berguinho","Irfan Jaya"
  ],
  "PSIS Semarang": [
    "M Rizky Darmawan","Alfeandra Dewangga","Rachmad Hidayat","Wallace Costa","Pratama Arhan",
    "Carlos Fortes","Vitinho","Fredyan Wahyu","Taisei Marukawa","Rian Ardiansyah","Septian David"
  ],
  "PSS Sleman": [
    "Erlangga Setyo","Derry Rachman","Bagus Nirwanto","Mario Maslac","Kim Jeffrey Kurniawan",
    "Irfan Jaya","Wahyu Sukarta","Jonathan Cantillana","Ricky Cawor","Yevhen Bokhashvili","Hokky Caraka"
  ],
  "Madura United": [
    "Hendra Brian","Novan Sasongko","Slamet Nurcahyo","Fachruddin Aryanto","Rifal Lastori",
    "Lulinha","Jaja","Beto Goncalves","Aji Bayu","Darmawan","Irfan Bachdim"
  ],
  "Barito Putera": [
    "Muhammad Riyandi","Bagas Kaffa","Renan Silva","Bayu Pradana","Ammar Hidayat",
    "Rafinha","Ferdiansyah","Rizky Pora","Mike Ott","Abdul Aziz","Gustavo Tocantins"
  ],
  "Dewa United": [
    "Syaiful","Risto Mitrevski","Egy Maulana Vikri","Edo Febriansah","Ronaldo Kwateh",
    "Ricky Kambuaya","Alex Martins","Hugo Gomes","Rachmat Irianto","Karim Rossi","Wahyu Prasetyo"
  ],
};

function randEnemyName(role) {
  const r = (role || "MID").toUpperCase();
  let pool = ENEMY_PLAYER_NAMES.MID;
  if (r === "GK") pool = ENEMY_PLAYER_NAMES.GK;
  else if (["DEF","CB","LB","RB"].includes(r)) pool = ENEMY_PLAYER_NAMES.DEF;
  else if (["ATT","ST","LW","RW","CF"].includes(r)) pool = ENEMY_PLAYER_NAMES.ATT;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateEnemyLineup(clubName) {
  const roles = ["GK","CB","CB","LB","RB","CM","CM","DM","LW","RW","ST"];
  const fixed = CLUB_FIXED_LINEUP[clubName] || null;
  const used = new Set();
  return roles.map((r, i) => {
    const name = fixed?.[i] || randEnemyName(r);
    let finalName = name;
    let guard = 0;
    while (used.has(finalName) && guard < 10) {
      finalName = randEnemyName(r);
      guard += 1;
    }
    used.add(finalName);
    return { name: finalName, role: r };
  });
}

function buildAIMatchEvents(homeName, awayName, homeGoals, awayGoals) {
  const goalEvents = [];
  const cardEvents = [];
  const usedMinutes = new Set();
  const randomMinute = () => {
    let m;
    do { m = 1 + Math.floor(Math.random() * 90); } while (usedMinutes.has(m));
    usedMinutes.add(m);
    return m;
  };

  const homeLineup = generateEnemyLineup(homeName);
  const awayLineup = generateEnemyLineup(awayName);
  const homeScorers = homeLineup.filter((p) => p.role !== "GK");
  const awayScorers = awayLineup.filter((p) => p.role !== "GK");

  for (let i = 0; i < homeGoals; i++) {
    const scorer = homeScorers[Math.floor(Math.random() * homeScorers.length)];
    const assist = Math.random() > 0.45 ? homeScorers[Math.floor(Math.random() * homeScorers.length)] : null;
    goalEvents.push({
      minute: randomMinute(),
      team: "home",
      scorerName: scorer?.name || `${homeName} Player`,
      assistName: assist && assist !== scorer ? assist.name : null,
      type: "goal",
    });
  }
  for (let i = 0; i < awayGoals; i++) {
    const scorer = awayScorers[Math.floor(Math.random() * awayScorers.length)];
    const assist = Math.random() > 0.45 ? awayScorers[Math.floor(Math.random() * awayScorers.length)] : null;
    goalEvents.push({
      minute: randomMinute(),
      team: "away",
      scorerName: scorer?.name || `${awayName} Player`,
      assistName: assist && assist !== scorer ? assist.name : null,
      type: "goal",
    });
  }
  goalEvents.sort((a, b) => a.minute - b.minute);

  const homeCardCount = Math.random() < 0.5 ? 1 : Math.random() < 0.25 ? 2 : 0;
  const awayCardCount = Math.random() < 0.5 ? 1 : Math.random() < 0.25 ? 2 : 0;
  for (let i = 0; i < homeCardCount; i++) {
    const p = homeScorers[Math.floor(Math.random() * homeScorers.length)];
    cardEvents.push({ playerName: p?.name || `${homeName} Player`, type: Math.random() < 0.08 ? "red" : "yellow", minute: 20 + Math.floor(Math.random() * 60), team: "home" });
  }
  for (let i = 0; i < awayCardCount; i++) {
    const p = awayScorers[Math.floor(Math.random() * awayScorers.length)];
    cardEvents.push({ playerName: p?.name || `${awayName} Player`, type: Math.random() < 0.08 ? "red" : "yellow", minute: 20 + Math.floor(Math.random() * 60), team: "away" });
  }

  return { goalEvents, cardEvents };
}

function buildMatchResult(save, myGoals, oppGoals, enemy, mode, ligaMatchIdx = null) {
  const result = myGoals > oppGoals ? "WIN" : myGoals < oppGoals ? "LOSE" : "DRAW";
  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  
  // Decide which starters pool to use: Dream Team or Club Squad
  const isCareerMode = ["career", "cup", "afc", "aff", "derby", "event"].includes(mode);
  const starters = isCareerMode 
    ? getClubSquad(save, save.myClub?.id)
    : Object.values(save.lineup || {})
        .filter(Boolean)
        .map((id) => (save.players || []).find((p) => String(p.id) === String(id)))
        .filter(Boolean)
        .map((p) => hydratePlayerFull(p, inv));

  const enemyLineup = generateEnemyLineup(enemy.name);

  // Build goal events with realistic scorer names
  const goalEvents = [];
  const scorerPool = starters.filter((p) => p.role !== "GK");
  const enemyScorers = enemyLineup.filter((p) => p.role !== "GK");

  for (let i = 0; i < myGoals; i++) {
    const scorer = scorerPool.length ? scorerPool[Math.floor(Math.random() * scorerPool.length)] : null;
    const assistPool = scorerPool.filter((p) => !scorer || p.id !== scorer.id);
    const assist = assistPool.length && Math.random() > 0.3 ? assistPool[Math.floor(Math.random() * assistPool.length)] : null;
    goalEvents.push({
      minute: Math.floor(5 + Math.random() * 85),
      team: "home",
      scorerName: scorer?.name || "My Player",
      assistName: assist?.name || null,
      scorerId: scorer?.id,
    });
  }
  for (let i = 0; i < oppGoals; i++) {
    const scorer = enemyScorers[Math.floor(Math.random() * enemyScorers.length)];
    const assistIdx = Math.floor(Math.random() * enemyScorers.length);
    const assist = enemyScorers[assistIdx] !== scorer && Math.random() > 0.4 ? enemyScorers[assistIdx] : null;
    goalEvents.push({
      minute: Math.floor(5 + Math.random() * 85),
      team: "away",
      scorerName: scorer?.name || `${enemy.name} Player`,
      assistName: assist?.name || null,
    });
  }
  goalEvents.sort((a, b) => a.minute - b.minute);

  // Card events (fouls)
  const cardEvents = [];
  starters.forEach((p) => {
    if (Math.random() < 0.12) {
      cardEvents.push({ playerName: p.name, type: Math.random() < 0.1 ? "red" : "yellow", minute: Math.floor(20 + Math.random() * 60), team: "home" });
    }
  });
  enemyLineup.forEach((p) => {
    if (p.role === "GK") return;
    if (Math.random() < 0.09) {
      cardEvents.push({ playerName: p.name, type: Math.random() < 0.08 ? "red" : "yellow", minute: Math.floor(20 + Math.random() * 60), team: "away" });
    }
  });

  const coinReward = result === "WIN" ? 120 : result === "DRAW" ? 60 : 30;
  const playerPower = Math.round(starters.reduce((s, p) => s + (p.power || 0), 0) / Math.max(1, starters.length));

  // Create visual data for the animation (FS8 Fixed)
  const visual = {
    field: { width: 520, height: 340 },
    players: starters.map(p => ({
      ...p,
      x: 50 + Math.random() * 200,
      y: 50 + Math.random() * 240,
    })),
    enemies: enemyLineup.map(p => ({
      ...p,
      x: 270 + Math.random() * 200,
      y: 50 + Math.random() * 240,
    }))
  };

  return {
    result,
    score: `${myGoals}-${oppGoals}`,
    enemyName: enemy.name || "Enemy",
    enemyLineup,
    reward: coinReward,
    playerPower,
    enemyPower: Math.round((enemy.strength || enemy.str || 0.9) * 70),
    chemistry: 15,
    goalEvents,
    cardEvents,
    visual, // Visual data for animation
    skillEvents: [],
    userTeam: { name: save.teamName || save.myClub?.name || "My Team" },
    returnTo: mode || "liga",
    ligaMatchIdx, // FIX: Use the parameter here
  };
}

// ── Update save dengan top scorers/assists/cards setelah match ────
function updateTopStats(save, resultData, mode) {
  const section = mode === "career" ? save.career : save.liga;
  if (!section) return;

  section.topScorers = section.topScorers || {};
  section.topAssists = section.topAssists || {};
  section.topCards   = section.topCards   || {};

  // Track SEMUA goal events (home = my team, away = enemy)
  (resultData.goalEvents || []).forEach((g) => {
    if (g.scorerId) {
      const key = String(g.scorerId);
      if (!section.topScorers[key]) section.topScorers[key] = { name: g.scorerName, goals: 0, teamLabel: "my" };
      section.topScorers[key].goals = (section.topScorers[key].goals || 0) + 1;
    }
    if (!g.scorerId && g.scorerName) {
      const key = `ai_${g.scorerName}`;
      if (!section.topScorers[key]) section.topScorers[key] = { name: g.scorerName, goals: 0, teamLabel: "ai" };
      section.topScorers[key].goals = (section.topScorers[key].goals || 0) + 1;
    }
    if (g.assistName) {
      const ap = (save.players || []).find((p) => p.name === g.assistName);
      if (ap) {
        const key = String(ap.id);
        if (!section.topAssists[key]) section.topAssists[key] = { name: g.assistName, assists: 0, teamLabel: "my" };
        section.topAssists[key].assists = (section.topAssists[key].assists || 0) + 1;
      } else {
        const key = `ai_${g.assistName}`;
        if (!section.topAssists[key]) section.topAssists[key] = { name: g.assistName, assists: 0, teamLabel: "ai" };
        section.topAssists[key].assists = (section.topAssists[key].assists || 0) + 1;
      }
    }
  });

  (resultData.cardEvents || []).forEach((c) => {
    if (!c.playerName) return;
    const ap = c.playerId ? (save.players || []).find((p) => String(p.id) === String(c.playerId)) : (save.players || []).find((p) => p.name === c.playerName);
    if (ap) {
      const key = String(ap.id);
      if (!section.topCards[key]) section.topCards[key] = { name: c.playerName, yellow: 0, red: 0 };
      if (c.type === "yellow") section.topCards[key].yellow = (section.topCards[key].yellow || 0) + 1;
      else section.topCards[key].red = (section.topCards[key].red || 0) + 1;
    } else {
      const key = `ai_${c.playerName}`;
      if (!section.topCards[key]) section.topCards[key] = { name: c.playerName, yellow: 0, red: 0 };
      if (c.type === "yellow") section.topCards[key].yellow = (section.topCards[key].yellow || 0) + 1;
      else section.topCards[key].red = (section.topCards[key].red || 0) + 1;
    }
  });
}

// ── Career helpers ────────────────────────────────────────────────
function ensureCareer(save) {
  return save.career || null;
}

// Normalize standings entry — old format: {club:{name,logo,...}, played,...}
// New format: {name, logo, played, ...}
function normalizeStandingsEntry(t) {
  if (!t) return t;
  if (t.club && typeof t.club === "object") {
    return {
      id: t.club.id || t.id,
      name: t.club.name || t.club.id || "Tim",
      logo: t.club.logo || "⚽",
      played: t.played || 0,
      won: t.won || 0,
      drawn: t.drawn || 0,
      lost: t.lost || 0,
      goalsFor: t.goalsFor || 0,
      goalsAgainst: t.goalsAgainst || 0,
      points: t.points || 0,
      gd: (t.goalsFor || 0) - (t.goalsAgainst || 0),
      isMe: t.isMe || false,
    };
  }
  return {
    ...t,
    gd: t.gd !== undefined ? t.gd : (t.goalsFor || 0) - (t.goalsAgainst || 0),
    name: t.name || t.id || "Tim",
    logo: t.logo || "⚽",
  };
}

function buildCareerStandings(career, save) {
  const myTeamName = save?.myClub?.name || save?.teamName || "My Team";
  const myTeamLogo = save?.myClub?.logo || "⭐";
  const myStats = career.myStats || { played:0, won:0, drawn:0, lost:0, points:0, goalsFor:0, goalsAgainst:0 };

  const raw = Array.isArray(career.standings) ? career.standings : [];
  let standings = raw.map(normalizeStandingsEntry);

  // BUG FIX: Ensure the entry with isMe has the CORRECT name from save.myClub
  standings.forEach(t => {
    if (t.isMe || t.id === "me") {
      t.name = myTeamName;
      t.logo = myTeamLogo;
      t.isMe = true;
      t.id = "me";
    }
  });

  // Check if My Team entry already exists
  const hasMeEntry = standings.some((t) => t.isMe);
  if (!hasMeEntry) {
    // Inject My Team from myStats
    standings.push({
      id: "me",
      name: myTeamName,
      logo: myTeamLogo,
      played: myStats.played || 0,
      won: myStats.won || 0,
      drawn: myStats.drawn || 0,
      lost: myStats.lost || 0,
      goalsFor: myStats.goalsFor || 0,
      goalsAgainst: myStats.goalsAgainst || 0,
      points: myStats.points || 0,
      gd: (myStats.goalsFor || 0) - (myStats.goalsAgainst || 0),
      isMe: true,
    });
  }

  standings = standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return (b.goalsFor || 0) - (a.goalsFor || 0);
  });

  const myIdx = standings.findIndex((t) => t.isMe);
  return {
    division: career.division,
    standings,
    myRank: myIdx + 1,
    career,
  };
}

// ─────────────────────────────────────────────────────────────────

function createAdapterRouter({ authService, userSaveService, teamService, matchService, transferService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  // ── Helper: normalize topScorers dict {id:{name,goals}} → sorted array ──
  function normStatDict(data, sortKey) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data)
      .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0))
      .slice(0, 10);
  }

  // ── Helper: club change lock — only at season START (matchday 0) or END ──
  function getClubChangeLock(save) {
    // Career mode
    if (save.career && !save.career.finished) {
      const cur = save.career.currentMatchday || 0;
      const total = save.career.schedule?.length || 18;
      // Only allow at start (cur === 0) or at end (cur >= total - 1)
      const allowed = cur === 0 || cur >= total;
      return {
        mode: "career", current: cur, total,
        unlockAt: total,
        allowed,
        reason: !allowed ? `Bisa ganti klub hanya di awal atau akhir musim Career (sekarang matchday ${cur}/${total})` : null,
      };
    }
    // Liga mode
    if (save.liga && !save.liga.finished) {
      const cur = save.liga.currentMatch || 0;
      const total = save.liga.schedule?.length || 10;
      const allowed = cur === 0 || cur >= total;
      return {
        mode: "league", current: cur, total,
        unlockAt: total,
        allowed,
        reason: !allowed ? `Bisa ganti klub hanya di awal atau akhir musim Liga (sekarang match ${cur}/${total})` : null,
      };
    }
    return { mode: "free", current: 0, total: 0, unlockAt: 0, allowed: true, reason: null };
  }

  function requireSave(username) {
    const s = userSaveService.getUserSave(username);
    if (!s) throw new Error("Save tidak ditemukan");
    return s;
  }
  function persist(username, save) {
    return userSaveService.saveUserSave(username, save);
  }

  // ══════════════════════════════════════════════════════════════
  // TEAM — override /team untuk tambah finalStats & format frontend
  // ══════════════════════════════════════════════════════════════
  router.get("/team", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      return ok(res, buildTeamResponse(save));
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // FORMATION — override /formation agar lineup berisi player object
  // ══════════════════════════════════════════════════════════════
  router.get("/formation", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      return ok(res, buildFormationResponse(save));
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // WORLD TOUR / STAGE STATUS
  // ══════════════════════════════════════════════════════════════
  router.get("/match/status", guard, (req, res) => {
    return fail(res, 404, "Fitur World Tour dinonaktifkan.");
    try {
      const save = requireSave(req.user.username);
      const stage = Number(save.stage || 1);
      
      const regions = [
        { name: "Liga Lokal", start: 1, end: 10, icon: "🇮🇩" },
        { name: "Asia Tenggara", start: 11, end: 25, icon: "🌏" },
        { name: "Elite Asia", start: 26, end: 50, icon: "🏮" },
        { name: "Eropa Timur", start: 51, end: 80, icon: "🏰" },
        { name: "Top 5 Liga Eropa", start: 81, end: 120, icon: "🇪🇺" },
        { name: "World Class Elite", start: 121, end: 999, icon: "🏆" }
      ];
      
      const currentRegion = regions.find(r => stage >= r.start && stage <= r.end) || regions[regions.length-1];
      const nextMilestone = regions.find(r => r.start > stage) || { name: "Max Level", start: 999 };

      return ok(res, {
        stage,
        regionName: currentRegion.name,
        regionIcon: currentRegion.icon,
        nextMilestone: nextMilestone.name,
        progressToNext: nextMilestone.start !== 999 ? Math.round(((stage - currentRegion.start) / (nextMilestone.start - currentRegion.start)) * 100) : 100,
        rewards: {
          next: stage % 5 === 0 ? "Bonus Gacha Ticket" : "Coins & Exp"
        }
      });
    } catch (e) { return fail(res, 400, e.message); }
  });

  // ══════════════════════════════════════════════════════════════
  // MATCH — GET /match (frontend pakai GET, backend punya POST /match/play)
  // ══════════════════════════════════════════════════════════════
  router.get("/match", guard, (req, res) => {
    return fail(res, 404, "Fitur World Tour dinonaktifkan.");
    try {
      const save = requireSave(req.user.username);
      const inv = Array.isArray(save.inventory) ? save.inventory : [];
      const starterIds = Object.values(save.lineup || {}).filter(Boolean);
      if (starterIds.length < 11) {
        return fail(res, 400, `Lineup belum penuh: ${starterIds.length}/11. Atur lineup di Formation.`);
      }

      const ligaMatchIdx = req.query.ligaMatchIdx;
      let liga = null;
      let enemy = { name: "Random FC", strength: 0.9 };
      const isLiga = (ligaMatchIdx !== undefined && ligaMatchIdx !== null && ligaMatchIdx !== "");

      // Liga match
      if (isLiga) {
        liga = ensureLiga(save);
        const idx = Number(ligaMatchIdx);
        const match = liga.schedule[idx];
        if (!match) return fail(res, 400, "Match tidak ditemukan");
        if (match.played) return fail(res, 400, "Match sudah dimainkan");
        enemy = match;
      }

      const myPower = getTeamPower(save);
      const oppPower = (enemy.strength || 0.9) * 70 + Math.random() * 15;
      const myGoals = simulateGoals(myPower, oppPower);
      const oppGoals = simulateGoals(oppPower, myPower);

      const resultData = buildMatchResult(save, myGoals, oppGoals, enemy, isLiga ? "liga" : "match", isLiga ? ligaMatchIdx : null);

      // Update save
      save.winCount = Number(save.winCount || 0) + (myGoals > oppGoals ? 1 : 0);
      save.drawCount = Number(save.drawCount || 0) + (myGoals === oppGoals ? 1 : 0);
      save.loseCount = Number(save.loseCount || 0) + (myGoals < oppGoals ? 1 : 0);
      save.coin = Number(save.coin || 0) + resultData.reward;
      if (myGoals > oppGoals) save.stage = Number(save.stage || 1) + 1;

      // Stamina drain
      starterIds.forEach((id) => {
        const p = (save.players || []).find((x) => String(x.id) === String(id));
        if (p) p.curStamina = Math.max(0, Number(p.curStamina ?? 100) - 20);
      });

      // ── AI Match Simulation (Sync Fix) ──────────────────────────
      if (isLiga && liga) {
        const idx = Number(ligaMatchIdx);
        liga.schedule[idx].played = true;
        liga.schedule[idx].result = resultData.result;
        liga.schedule[idx].score = resultData.score;
        liga.schedule[idx].highlights = {
          goalEvents: resultData.goalEvents || [],
          cardEvents: resultData.cardEvents || [],
        };
        liga.currentMatch = idx + 1;
        
        // Simulasikan matchday yang sama untuk SEMUA tim AI
        const currentMatchday = liga.schedule[idx].matchday;
        if (!liga.aiRoundDone) liga.aiRoundDone = {};
        const roundKey = `matchday_${currentMatchday}`;

        if (!liga.aiRoundDone[roundKey]) {
          if (!liga.aiResults) liga.aiResults = [];
          if (!liga.aiMatchCounts) liga.aiMatchCounts = {};
          
          // Strategy: Simulasikan match untuk SEMUA tim selain user
          const allOtherClubs = LIGA_CLUBS.filter(c => c.name !== (save.myClub?.name || "My Team"));
          // Shuffle agar variasi
          const shuffled = allOtherClubs.filter(c => c.name !== enemy.name).sort(() => Math.random() - 0.5);
          
          // Pasangkan musuh tadi dengan salah satu tim random
          if (shuffled.length > 0) {
            const pairs = [];
            const pool = shuffled.slice();
            while (pool.length >= 2) {
              const c1 = pool.pop();
              const c2 = pool.pop();
              pairs.push([c1, c2]);
            }
            
            pairs.forEach(([c1, c2]) => {
              const p1 = (c1.strength || 0.8) * 70 + Math.random() * 10;
              const p2 = (c2.strength || 0.8) * 70 + Math.random() * 10;
              const g1 = simulateGoals(p1, p2);
              const g2 = simulateGoals(p2, p1);
              const aiEv = buildAIMatchEvents(c1.name, c2.name, g1, g2);
              
              liga.aiResults.push({ 
                home: c1.name, away: c2.name, hg: g1, ag: g2, 
                matchday: currentMatchday, goalEvents: aiEv.goalEvents, cardEvents: aiEv.cardEvents 
              });
              
              liga.aiMatchCounts[c1.name] = (liga.aiMatchCounts[c1.name] || 0) + 1;
              liga.aiMatchCounts[c2.name] = (liga.aiMatchCounts[c2.name] || 0) + 1;
              updateTopStats(save, aiEv, "liga");
            });
          }
          liga.aiRoundDone[roundKey] = true;
        }

        liga.myPoints = liga.schedule
          .filter((m) => m.played && m.result === "WIN").length * 3 +
          liga.schedule.filter((m) => m.played && m.result === "DRAW").length;
        liga.myGoals = liga.schedule.filter((m) => m.played)
          .reduce((s, m) => s + Number((m.score || "0-0").split("-")[0]), 0);

        // Check if liga finished
        if (liga.currentMatch >= liga.schedule.length) {
          liga.finished = true;
          const pts = liga.myPoints;
          liga.reward = pts >= 24 ? 1000 : pts >= 18 ? 600 : pts >= 12 ? 300 : 100;
          liga.premiumReward = pts >= 24 ? 20 : pts >= 18 ? 12 : pts >= 6 ? 6 : 2;
          save.coin = Number(save.coin || 0) + liga.reward;
          save.premiumCoin = Number(save.premiumCoin || 0) + liga.premiumReward;
          resultData.ligaFinished = true;
          resultData.ligaReward = liga.reward;

          // Save last season rank for AFC/AFF qualification check
          const finalStandings = buildLigaStandings(liga);
          const myFinalRank = finalStandings.standings.findIndex(t => t.isMe) + 1;
          liga.lastSeasonRank = myFinalRank;
          save.liga = liga;

          // BUG 7 FIX: Kirim top scorers/assists saat liga selesai
          const tsArr = Object.values(liga.topScorers || {}).sort((a,b)=>(b.goals||0)-(a.goals||0));
          const taArr = Object.values(liga.topAssists || {}).sort((a,b)=>(b.assists||0)-(a.assists||0));
          const myPlayers = save.players || [];
          resultData.topScorers = tsArr.slice(0,5).map(s => ({
            ...s,
            isMe: myPlayers.some(p => String(p.id) === String(Object.keys(liga.topScorers||{}).find(k=>(liga.topScorers||{})[k]===s)))
          }));
          resultData.topAssists = taArr.slice(0,5).map(s => ({
            ...s,
            isMe: myPlayers.some(p => p.name === s.name)
          }));
          // Bonus reward untuk top scorer/assist jika pemain kita
          if (tsArr[0]) {
            const topScorerPlayer = myPlayers.find(p => p.name === tsArr[0].name);
            if (topScorerPlayer) { save.coin += 500; save.premiumCoin += 5; }
          }
          if (taArr[0]) {
            const topAssistPlayer = myPlayers.find(p => p.name === taArr[0].name);
            if (topAssistPlayer) { save.coin += 300; save.premiumCoin += 3; }
          }
        }
        save.liga = liga;
        resultData.returnTo = "liga";
      }

      updateTopStats(save, resultData, "liga");
      persist(req.user.username, save);
      return ok(res, resultData);
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // MATCH VISUAL — posisi pemain untuk animasi canvas
  // ══════════════════════════════════════════════════════════════
  router.get("/match/visual", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const inv = Array.isArray(save.inventory) ? save.inventory : [];
      const FIELD = { width: 520, height: 340 };

      // Posisi default per formasi
      const POSITIONS = {
        GK:  { x: 36,  y: 170 },
        LB:  { x: 120, y: 40  }, CB1: { x: 120, y: 120 },
        CB2: { x: 120, y: 220 }, CB3: { x: 120, y: 300 },
        RB:  { x: 120, y: 300 },
        DM1: { x: 218, y: 110 }, DM2: { x: 218, y: 230 },
        CM1: { x: 260, y: 80  }, CM2: { x: 260, y: 170 }, CM3: { x: 260, y: 260 },
        LM:  { x: 260, y: 40  }, RM:  { x: 260, y: 300 },
        AM1: { x: 330, y: 80  }, AM2: { x: 330, y: 170 }, AM3: { x: 330, y: 260 },
        LW:  { x: 400, y: 50  }, RW:  { x: 400, y: 290 },
        ST:  { x: 450, y: 170 }, ST1: { x: 450, y: 110 }, ST2: { x: 450, y: 230 },
        CF:  { x: 460, y: 170 },
      };

      const players = Object.entries(save.lineup || {})
        .filter(([, id]) => id)
        .map(([pos, id]) => {
          const p = (save.players || []).find((x) => String(x.id) === String(id));
          const h = p ? hydratePlayerFull(p, inv) : null;
          const posData = POSITIONS[pos] || { x: 260, y: 170 };
          const role = pos.startsWith("GK") ? "GK"
            : ["LB","CB1","CB2","CB3","RB"].includes(pos) ? "DEF"
            : ["DM1","DM2","CM1","CM2","CM3","LM","RM","AM1","AM2","AM3"].includes(pos) ? "MID"
            : "ATT";
          return {
            id: h?.id || id,
            name: h?.name || "Player",
            role,
            power: h?.power || 50,
            x: posData.x,
            y: posData.y,
          };
        });

      return ok(res, { players, field: FIELD });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // TRANSFER — adapter endpoints
  // ══════════════════════════════════════════════════════════════

  // Helper: generate fresh transfer pool dari random players
  function generateTransferPool(save, count = 8) {
    const NAMES = [
      "Ahmad Rizki","Budi Santoso","Cahya Putra","Deni Wahyu","Eko Prasetyo",
      "Fajar Nugroho","Gilang Ramadhan","Hendra Saputra","Irfan Maulana","Joko Susilo",
      "Kevin Sanjaya","Lukman Hakim","Muhamad Iqbal","Nanda Pratama","Oki Renaldi",
      "Pandu Wijaya","Qomar Firdaus","Rendi Setiawan","Surya Dharma","Taufik Hidayat",
      "Umar Bakri","Vino Bastian","Wahyu Hidayat","Xander Situmorang","Yusuf Alamsyah",
      "Zulkifli Anwar","Arief Rahman","Bagas Wicaksono","Candra Kusuma","Dimas Arya"
    ];
    const ROLES = ["GK","CB","LB","RB","CM","DM","AM","LW","RW","ST"];
    const TRAITS = ["Runner","Destroyer","Playmaker","Sniper","Wall","Ghost","Tank","Fox","Eagle","Bull"];
    const RARITIES = ["C","C","C","B","B","B","A","A","S"];
    const ownedNames = new Set((save.players || []).map((p) => p.name));
    const pool = [];
    let attempts = 0;
    while (pool.length < count && attempts < 100) {
      attempts++;
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      if (ownedNames.has(name)) continue;
      const role = ROLES[Math.floor(Math.random() * ROLES.length)];
      const rarity = RARITIES[Math.floor(Math.random() * RARITIES.length)];
      const basePower = rarity === "S" ? 82 + Math.floor(Math.random()*10)
        : rarity === "A" ? 72 + Math.floor(Math.random()*10)
        : rarity === "B" ? 62 + Math.floor(Math.random()*10)
        : 50 + Math.floor(Math.random()*10);
      const id = `tp_${Date.now()}_${Math.floor(Math.random()*99999)}`;
      pool.push({
        id,
        name,
        role,
        type: ["GK"].includes(role) ? "GK" : ["CB","LB","RB"].includes(role) ? "DEF" : ["CM","DM","AM","LW","RW"].includes(role) ? "MID" : "ATT",
        rarity,
        basePower,
        power: basePower,
        pace: 40 + Math.floor(Math.random()*40),
        shooting: 30 + Math.floor(Math.random()*50),
        passing: 40 + Math.floor(Math.random()*40),
        defense: 30 + Math.floor(Math.random()*50),
        stamina: 60 + Math.floor(Math.random()*30),
        mentality: 60 + Math.floor(Math.random()*30),
        level: 1, exp: 0, expNeeded: 100, curStamina: 100, injury: null,
        trait: TRAITS[Math.floor(Math.random()*TRAITS.length)],
        skill: "NONE",
        age: 18 + Math.floor(Math.random()*12),
        nationality: "🇮🇩",
        price: Math.floor(basePower * 5 + Math.random() * 150),
        equipment: { HEAD: null, BODY: null, HAND: null, FEET: null, ACC: null },
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=transfer${id}&backgroundColor=1a2a3a`,
      });
      ownedNames.add(name);
    }
    return pool;
  }

  // GET /transfer/list → format yang dipakai frontend showTransfer()
  router.get("/transfer/list", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const refreshedAt = Number(save.transferPoolRefreshedAt || 0);
      const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 menit
      let pool = Array.isArray(save.transferPool) ? save.transferPool : [];

      // Auto-generate jika pool kosong atau expired
      if (!pool.length || Date.now() > refreshedAt + REFRESH_INTERVAL) {
        pool = generateTransferPool(save, 8);
        save.transferPool = pool;
        save.transferPoolRefreshedAt = Date.now();
        persist(req.user.username, save);
      }

      const nextRefreshIn = Math.max(0, refreshedAt + REFRESH_INTERVAL - Date.now());
      return ok(res, { pool, nextRefreshIn });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // POST /transfer/buy → beli pemain dari transferPool
  router.post("/transfer/buy", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const playerId = req.body?.playerId || req.body?.marketId;
      const pool = Array.isArray(save.transferPool) ? save.transferPool : [];
      const idx = pool.findIndex((p) => String(p.id) === String(playerId));
      if (idx < 0) return fail(res, 400, "Pemain tidak ditemukan di transfer pool");

      const target = pool[idx];
      const price = Number(target.price || 0);
      if (Number(save.coin || 0) < price) return fail(res, 400, "Coin tidak cukup");

      save.coin = Number(save.coin || 0) - price;
      const newPlayer = { ...target };
      delete newPlayer.price;
      newPlayer.exp = 0; newPlayer.level = 1; newPlayer.curStamina = 100; newPlayer.injury = null;
      newPlayer.equipment = { HEAD: null, BODY: null, HAND: null, FEET: null, ACC: null };

      save.players = Array.isArray(save.players) ? save.players : [];
      save.players.push(newPlayer);
      save.transferPool.splice(idx, 1);
      persist(req.user.username, save);
      return ok(res, { player: newPlayer, coin: save.coin });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // POST /transfer/sell → jual pemain
  router.post("/transfer/sell", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const playerId = req.body?.playerId;
      const players = Array.isArray(save.players) ? save.players : [];
      if (players.length <= 11) return fail(res, 400, "Minimal 11 pemain tersisa");

      const idx = players.findIndex((p) => String(p.id) === String(playerId));
      if (idx < 0) return fail(res, 400, "Pemain tidak ditemukan");

      const player = players[idx];
      Object.keys(save.lineup || {}).forEach((pos) => {
        if (String(save.lineup[pos]) === String(playerId)) save.lineup[pos] = null;
      });

      const sellPrice = Math.floor(Number(player.basePower || player.power || 50) * 3 + Number(player.level || 1) * 20);
      save.coin = Number(save.coin || 0) + sellPrice;
      save.players.splice(idx, 1);
      persist(req.user.username, save);
      return ok(res, { sellPrice, coin: save.coin, playerId });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // POST /transfer/refresh → refresh pool dengan pemain baru (cost 50 coin)
  router.post("/transfer/refresh", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const cost = 50;
      if (Number(save.coin || 0) < cost) return fail(res, 400, "Coin tidak cukup (50 coin)");
      save.coin = Number(save.coin || 0) - cost;
      save.transferPool = generateTransferPool(save, 8);
      save.transferPoolRefreshedAt = Date.now();
      persist(req.user.username, save);
      return ok(res, { pool: save.transferPool, coin: save.coin });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // LIGA NUSANTARA
  // ══════════════════════════════════════════════════════════════

  // GET /liga/status
  router.get("/liga/status", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const liga = ensureLiga(save);
      const history = Array.isArray(save.ligaHistory) ? save.ligaHistory : [];
      return ok(res, { liga, history });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // POST /liga/start → mulai season baru
  router.post("/liga/start", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const oldLiga = save.liga;
      const myTeamName = save.teamName || save.myClub?.name || "My Team";

      // Save history jika ada liga sebelumnya yang selesai
      if (oldLiga && oldLiga.finished) {
        const st = buildLigaStandings(oldLiga, myTeamName);
        save.ligaHistory = Array.isArray(save.ligaHistory) ? save.ligaHistory : [];
        save.ligaHistory.unshift({
          season: oldLiga.season,
          rank: st.myRank,
          points: oldLiga.myPoints || 0,
          reward: oldLiga.reward || 0,
          premBonus: oldLiga.premiumReward || 0,
          date: new Date().toLocaleDateString("id-ID"),
        });
      }

      save.liga = {
        season: (oldLiga?.season || 0) + 1,
        schedule: buildLigaSchedule(save),
        currentMatch: 0,
        myPoints: 0,
        myGoals: 0,
        finished: false,
        reward: 0,
        premiumReward: 0,
      };
      persist(req.user.username, save);
      return ok(res, { liga: save.liga });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // GET /liga/standings
  router.get("/liga/standings", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const liga = ensureLiga(save);
      const st = buildLigaStandings(liga, save.teamName || save.myClub?.name || "My Team");
      return ok(res, st);
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // GET /liga/topscorers
  router.get("/liga/topscorers", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const liga = save.liga || {};
      return ok(res, {
        topScorers: normStatDict(liga.topScorers, "goals"),
        topAssists: normStatDict(liga.topAssists, "assists"),
        topCards:   normStatDict(liga.topCards,   "yellow"),
      });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // GET /liga/match/:idx → detail match
  router.get("/liga/match/:idx", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const liga = save.liga || {};
      const idx = Number(req.params.idx);
      const match = (liga.schedule || [])[idx];
      if (!match) return fail(res, 404, "Match tidak ditemukan");
      return ok(res, {
        matchday: idx + 1,
        played: match.played || false,
        score: match.score || "0-0",
        result: match.result || null,
        opponent: { name: match.name, logo: match.logo },
        highlights: match.highlights || {},
      });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // CAREER MODE
  // ══════════════════════════════════════════════════════════════

  // GET /career
  router.get("/career", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const career = save.career || null;
      const careerHistory = Array.isArray(save.careerHistory) ? save.careerHistory : [];
      return ok(res, { career, careerHistory });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // POST /career/start
  router.post("/career/start", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const division = req.body?.division || "Divisi 3";

      // Save old career to history
      if (save.career && save.career.finished) {
        save.careerHistory = Array.isArray(save.careerHistory) ? save.careerHistory : [];
        const oldCareer = save.career;
        const standings = Array.isArray(oldCareer.standings) ? oldCareer.standings : [];
        const myIdx = standings.findIndex((t) => t.isMe);
        save.careerHistory.unshift({
          seasonNum: oldCareer.seasonNum,
          division: oldCareer.division,
          rank: myIdx + 1,
          outcome: oldCareer.outcome || "mid",
          nextDivision: division,
          coinReward: oldCareer.reward || 0,
        });
      }

      // Build clubs for this division
      const DIVISION_CLUBS = {
        "Divisi 1": [
          { id:"persija",   name:"Persija Jakarta",    city:"Jakarta",   logo:"🔴", str:1.10, stadium:"GBK" },
          { id:"persib",    name:"Persib Bandung",     city:"Bandung",   logo:"💙", str:1.05, stadium:"GBLA" },
          { id:"persebaya", name:"Persebaya Surabaya", city:"Surabaya",  logo:"🟢", str:1.08, stadium:"GBT" },
          { id:"arema",     name:"Arema FC",           city:"Malang",    logo:"🔵", str:1.00, stadium:"Kanjuruhan" },
          { id:"psm",       name:"PSM Makassar",       city:"Makassar",  logo:"🔴", str:1.03, stadium:"Mattoangin" },
          { id:"psis",      name:"PSIS Semarang",      city:"Semarang",  logo:"⚫", str:0.98, stadium:"Jatidiri" },
          { id:"bali",      name:"Bali United",        city:"Bali",      logo:"🟠", str:1.02, stadium:"Kapten I Wayan Dipta" },
          { id:"bhayangkara",name:"Bhayangkara FC",   city:"Jakarta",   logo:"🟡", str:0.97, stadium:"Delta Sidoarjo" },
          { id:"madura",    name:"Madura United",      city:"Madura",    logo:"🔴", str:0.95, stadium:"Gelora Bangkalan" },
          { id:"borneo",    name:"Borneo FC",          city:"Samarinda", logo:"🟣", str:0.93, stadium:"Segiri" },
        ],
        "Divisi 2": [
          { id:"pss",       name:"PSS Sleman",         city:"Sleman",    logo:"🟡", str:0.90, stadium:"Maguwoharjo" },
          { id:"persita",   name:"Persita Tangerang",  city:"Tangerang", logo:"🟣", str:0.88, stadium:"Sport Center" },
          { id:"persis",    name:"Persis Solo",        city:"Solo",      logo:"🔵", str:0.92, stadium:"Manahan" },
          { id:"dewa",      name:"Dewa United",        city:"Tangerang", logo:"⚫", str:0.87, stadium:"Indomilk Arena" },
          { id:"barito",    name:"Barito Putera",      city:"Banjarmasin",logo:"🟢",str:0.85, stadium:"17 Mei" },
          { id:"rans",      name:"RANS Nusantara",     city:"Jakarta",   logo:"🔴", str:0.89, stadium:"Pakansari" },
          { id:"persikabo", name:"Persikabo 1973",     city:"Bogor",     logo:"🟢", str:0.83, stadium:"Pakansari" },
          { id:"persik",    name:"Persik Kediri",      city:"Kediri",    logo:"🟡", str:0.86, stadium:"Brawijaya" },
          { id:"psgc",      name:"PSGC Ciamis",        city:"Ciamis",    logo:"🔵", str:0.82, stadium:"Galuh" },
          { id:"kalteng",   name:"Kalteng Putra",      city:"Palangkaraya",logo:"🟠",str:0.84,stadium:"Tuah Pahoe" },
        ],
        "Divisi 3": [
          { id:"perspal",   name:"Perspal Palopo",     city:"Palopo",    logo:"⚫", str:0.75, stadium:"Lagaligo" },
          { id:"psim",      name:"PSIM Yogyakarta",    city:"Yogyakarta",logo:"🔴", str:0.78, stadium:"Mandala Krida" },
          { id:"persib2",   name:"Persib B",           city:"Bandung",   logo:"💙", str:0.77, stadium:"GBLA" },
          { id:"persipura", name:"Persipura Jayapura", city:"Jayapura",  logo:"⚫", str:0.80, stadium:"Mandala" },
          { id:"pss2",      name:"PSS B",              city:"Sleman",    logo:"🟡", str:0.73, stadium:"Maguwoharjo" },
          { id:"persidafon",name:"Persidafon",         city:"Jayawijaya",logo:"🟠", str:0.72, stadium:"Yohannes Kapisa" },
          { id:"persewar",  name:"Persewar",           city:"Waropen",   logo:"🟣", str:0.74, stadium:"Persewar" },
          { id:"semen",     name:"Semen Padang",       city:"Padang",    logo:"⚫", str:0.76, stadium:"Haji Agus Salim" },
          { id:"persires",  name:"Persires",           city:"Rengat",    logo:"🔵", str:0.71, stadium:"Persires" },
          { id:"psgj",      name:"PSGJ",               city:"Cianjur",   logo:"🟢", str:0.73, stadium:"Maracana" },
        ],
      };

      const clubs = DIVISION_CLUBS[division] || DIVISION_CLUBS["Divisi 3"];
      // Build schedule: home & away vs each club (18 matches)
      const schedule = [];
      clubs.forEach((club, i) => {
        schedule.push({ matchday: i + 1, club, isHome: i % 2 === 0, played: false, result: null, score: null });
      });
      clubs.forEach((club, i) => {
        schedule.push({ matchday: clubs.length + i + 1, club, isHome: i % 2 !== 0, played: false, result: null, score: null });
      });

      // Init standings
      const myTeamName = save.teamName || save.myClub?.name || "My Team";
      const standings = clubs.map((club) => ({
        id: club.id, name: club.name, logo: club.logo,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0, gd: 0,
        isMe: false,
      }));
      standings.push({
        id: "me", name: myTeamName, logo: "⭐",
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0, gd: 0,
        isMe: true,
      });

      save.career = {
        seasonNum: (save.career?.seasonNum || 0) + 1,
        division,
        schedule,
        currentMatchday: 0,
        standings,
        myStats: { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0 },
        finished: false,
        promotionZone: 3,
        relegationZone: clubs.length - 3,
        reward: 0,
        premiumReward: 0,
      };
      persist(req.user.username, save);
      return ok(res, { career: save.career });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // POST /career/match → main matchday
  router.post("/career/match", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const career = save.career;
      if (!career) return fail(res, 400, "Career belum dimulai");
      if (career.finished) return fail(res, 400, "Season sudah selesai");

      const idx = Number(req.body?.matchdayIdx ?? career.currentMatchday);
      const match = career.schedule[idx];
      if (!match) return fail(res, 400, "Matchday tidak ditemukan");
      if (match.played) return fail(res, 400, "Matchday sudah dimainkan");

      const inv = Array.isArray(save.inventory) ? save.inventory : [];
      const starterIds = Object.values(save.lineup || {}).filter(Boolean);
      if (starterIds.length < 11) {
        return fail(res, 400, `Lineup belum penuh: ${starterIds.length}/11`);
      }

      const starters = getClubSquad(save, save.myClub?.id);
      const myPower = starters.reduce((s, p) => s + (p.power || 0), 0) / starters.length;
      
      const club = match.club;
      const oppPower = (club.str || 0.9) * 75 + Math.random() * 12;
      const homeAdvantage = match.isHome ? 1.05 : 0.95;

      const myGoals = simulateGoals(myPower * homeAdvantage, oppPower);
      const oppGoals = simulateGoals(oppPower, myPower * homeAdvantage);

      const resultData = buildMatchResult(save, myGoals, oppGoals, { name: club.name }, "career");
      resultData.returnTo = "career";

      // Update match record
      career.schedule[idx].played = true;
      career.schedule[idx].result = resultData.result;
      career.schedule[idx].score = resultData.score;
      career.schedule[idx].myGoals = myGoals;
      // BUG 4 FIX: simpan highlights ke schedule supaya bisa ditampilkan nanti
      career.schedule[idx].highlights = {
        goalEvents: resultData.goalEvents || [],
        cardEvents: resultData.cardEvents || [],
      };
      career.schedule[idx].opponentGoals = oppGoals;
      career.currentMatchday = idx + 1;

      // Update stats
      const ms = career.myStats;
      ms.played++;
      ms.goalsFor += myGoals;
      ms.goalsAgainst += oppGoals;
      if (resultData.result === "WIN") { ms.won++; ms.points += 3; }
      else if (resultData.result === "DRAW") { ms.drawn++; ms.points += 1; }
      else ms.lost++;

      // Update standings
      const st = career.standings;
      const myStIdx = st.findIndex((t) => t.isMe);
      const oppStIdx = st.findIndex((t) => t.id === club.id);
      function applyStResult(team, gf, ga) {
        if (!team) return;
        team.played++;
        team.goalsFor += gf;
        team.goalsAgainst += ga;
        team.gd = team.goalsFor - team.goalsAgainst;
        if (gf > ga) { team.won++; team.points += 3; }
        else if (gf === ga) { team.drawn++; team.points += 1; }
        else team.lost++;
      }
      applyStResult(st[myStIdx], myGoals, oppGoals);
      applyStResult(st[oppStIdx], oppGoals, myGoals);

      const newMatchday = idx + 1;
      const roundKey = `round_${newMatchday}`;
      career.aiRoundDone = career.aiRoundDone || {};
      career.aiResults = career.aiResults || [];
      if (!career.aiRoundDone[roundKey]) {
        const aiTeams = st
          .filter((t) => !t.isMe && t.id !== club.id)
          .slice()
          .sort((a, b) => String(a.name).localeCompare(String(b.name)));

        if (aiTeams.length >= 2) {
          const rotateBy = newMatchday % aiTeams.length;
          const rotated = aiTeams.slice(rotateBy).concat(aiTeams.slice(0, rotateBy));
          if (rotated.length % 2 === 1) rotated.pop();
          for (let i = 0; i < rotated.length - 1; i += 2) {
            const teamA = rotated[i];
            const teamB = rotated[i + 1];
            if (!teamA || !teamB || teamA.id === teamB.id) continue;
            const pA = 0.9 * 70 + Math.random() * 10;
            const pB = 0.9 * 70 + Math.random() * 10;
            const gA = simulateGoals(pA, pB);
            const gB = simulateGoals(pB, pA);
            applyStResult(teamA, gA, gB);
            applyStResult(teamB, gB, gA);
            const aiEv = buildAIMatchEvents(teamA.name, teamB.name, gA, gB);
            career.aiResults.push({ home: teamA.name, away: teamB.name, hg: gA, ag: gB, round: newMatchday, goalEvents: aiEv.goalEvents, cardEvents: aiEv.cardEvents });
            updateTopStats(save, aiEv, "career");
          }
        }
        career.aiRoundDone[roundKey] = true;
      }

      // Sort standings
      career.standings = st.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.goalsFor - a.goalsFor;
      });

      // Update save coin/winCount
      save.coin = Number(save.coin || 0) + resultData.reward;
      save.winCount = Number(save.winCount || 0) + (resultData.result === "WIN" ? 1 : 0);
      save.drawCount = Number(save.drawCount || 0) + (resultData.result === "DRAW" ? 1 : 0);
      save.loseCount = Number(save.loseCount || 0) + (resultData.result === "LOSE" ? 1 : 0);

      // Stamina drain
      starterIds.forEach((id) => {
        const p = (save.players || []).find((x) => String(x.id) === String(id));
        if (p) p.curStamina = Math.max(0, Number(p.curStamina ?? 100) - 20);
      });

      // Check season finished
      const allPlayed = career.schedule.every((m) => m.played);
      if (allPlayed) {
        career.finished = true;
        const myRank = career.standings.findIndex((t) => t.isMe) + 1;
        const total = career.standings.length;
        career.reward = myRank === 1 ? 1500 : myRank <= 3 ? 800 : myRank <= total - 3 ? 400 : 100;
        career.premiumReward = myRank === 1 ? 30 : myRank <= 3 ? 15 : 5;
        career.outcome = myRank <= 3 ? "promoted" : myRank > total - 3 ? "relegated" : "mid";
        save.coin = Number(save.coin || 0) + career.reward;
        save.premiumCoin = Number(save.premiumCoin || 0) + career.premiumReward;
        // Save rank for AFC/AFF qualification
        career.lastSeasonRank = myRank;
        save.career = career;
        resultData.seasonFinished = true;
        resultData.seasonResult = {
          rank: myRank,
          outcome: career.outcome,
          coinReward: career.reward,
        };

        // BUG 7 FIX: Kirim top scorers/assists saat season selesai
        const myPlayers = save.players || [];
        const tsArr = Object.values(career.topScorers || {}).sort((a,b)=>(b.goals||0)-(a.goals||0));
        const taArr = Object.values(career.topAssists || {}).sort((a,b)=>(b.assists||0)-(a.assists||0));
        resultData.topScorers = tsArr.slice(0,5).map(s => ({
          ...s, isMe: myPlayers.some(p => p.name === s.name)
        }));
        resultData.topAssists = taArr.slice(0,5).map(s => ({
          ...s, isMe: myPlayers.some(p => p.name === s.name)
        }));
        // Bonus reward untuk top scorer/assist jika pemain kita
        if (tsArr[0] && myPlayers.some(p => p.name === tsArr[0].name)) {
          save.coin += 500; save.premiumCoin += 5;
        }
        if (taArr[0] && myPlayers.some(p => p.name === taArr[0].name)) {
          save.coin += 300; save.premiumCoin += 3;
        }
      }

      save.career = career;
      updateTopStats(save, resultData, "career");
      persist(req.user.username, save);
      return ok(res, resultData);
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // GET /career/standings
  router.get("/career/standings", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const career = save.career;
      if (!career) return fail(res, 400, "Career belum dimulai");
      return ok(res, buildCareerStandings(career, save));
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // GET /career/topscorers
  router.get("/career/topscorers", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const career = save.career || {};
      return ok(res, {
        topScorers: normStatDict(career.topScorers, "goals"),
        topAssists: normStatDict(career.topAssists, "assists"),
        topCards:   normStatDict(career.topCards,   "yellow"),
      });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // GET /career/match/:idx
  router.get("/career/match/:idx", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const career = save.career;
      if (!career) return fail(res, 400, "Career belum dimulai");
      const idx = Number(req.params.idx);
      const match = (career.schedule || [])[idx];
      if (!match) return fail(res, 404, "Match tidak ditemukan");
      return ok(res, {
        matchday: idx + 1,
        played: match.played || false,
        score: match.score || "0-0",
        result: match.result || null,
        opponent: match.club || {},
        highlights: match.highlights || {},
      });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // AUTH/ME OVERRIDE — include myClub + club change lock status
  // ══════════════════════════════════════════════════════════════
  router.get("/auth/me", guard, (req, res) => {
    try {
      const save = requireSave(req.user.username);
      const clubLock = getClubChangeLock(save);
      const displayName = req.user.displayName || req.user.username;
      const hasCharacter = !!(save.character && save.character.position);
      const needSeasonPos = !!(save.character && !save.seasonPos && save.career && !save.career.finished);
      return ok(res, {
        user: {
          username: req.user.username,
          displayName,
        },
        username: req.user.username,
        displayName,
        myClub: save.myClub || null,
        character: save.character || null,
        hasCharacter,
        needSeasonPos,
        seasonPos: save.seasonPos || null,
        clubLock,
        canChangeClub: !save.myClub || clubLock.allowed,
      });
    } catch (e) {
      return fail(res, 400, e.message);
    }
  });

  return router;
}

module.exports = { createAdapterRouter };
