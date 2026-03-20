const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");
const { createDataRepository } = require("../repositories/dataRepository");

const MASTER_PLAYER_NAME_BY_ID = (() => {
  try {
    const repo = createDataRepository();
    const players = repo.getPlayers();
    const map = new Map();
    for (const p of players) map.set(String(p.id), p.name);
    return map;
  } catch {
    return new Map();
  }
})();

/* ─── DATA POSISI PEMAIN ─── */
const PLAYER_POSITIONS = [
  { id:"GK",  label:"Penjaga Gawang",    icon:"🧤", desc:"Benteng terakhir tim",              stats:["defense","mentality"], minPower:60 },
  { id:"CB",  label:"Bek Tengah",        icon:"🛡️", desc:"Tangguh, aerial duel kuat",         stats:["defense","stamina"],   minPower:58 },
  { id:"LB",  label:"Bek Kiri",          icon:"↙️", desc:"Aktif naik & bertahan",              stats:["pace","defense"],      minPower:55 },
  { id:"RB",  label:"Bek Kanan",         icon:"↘️", desc:"Overlapping fullback",               stats:["pace","defense"],      minPower:55 },
  { id:"DM",  label:"Gelandang Bertahan", icon:"⚓", desc:"Filter serangan lawan",              stats:["defense","passing"],   minPower:60 },
  { id:"CM",  label:"Gelandang Tengah",  icon:"⚙️", desc:"Box-to-box, engine tim",            stats:["stamina","passing"],   minPower:62 },
  { id:"AM",  label:"Gelandang Serang",  icon:"🎯", desc:"Kreator peluang",                    stats:["passing","shooting"],  minPower:65 },
  { id:"LW",  label:"Sayap Kiri",        icon:"⚡", desc:"Kecepatan & dribel di tepi",        stats:["pace","shooting"],     minPower:65 },
  { id:"RW",  label:"Sayap Kanan",       icon:"⚡", desc:"Cutting inside, tendangan kuat",    stats:["pace","shooting"],     minPower:65 },
  { id:"ST",  label:"Penyerang Murni",   icon:"🔥", desc:"Clinical finisher, gol hunter",     stats:["shooting","pace"],     minPower:70 },
  { id:"CF",  label:"False 9",           icon:"🌀", desc:"Drop deep, kreasi dari belakang",   stats:["passing","shooting"],  minPower:68 }
];

/* ─── DATA KLUB INDONESIA ─── */
const INDONESIAN_CLUBS = {
  "Divisi 1": [
    { id:"persija",   name:"Persija Jakarta",   city:"Jakarta",   logo:"🔴", badge:"🦅", color:"#e63329", str:1.10, stadium:"Stadion GBK",   fans:75000, founded:1928, criteria:{ minPower:75, minLevel:5, minWins:8,  preferredPos:["ST","LW","RW"],  desc:"Klub paling ikonik Indonesia. Butuh penyerang haus gol." }, bio:"Macan Kemayoran, juara Liga Indonesia terbanyak.", achievement:"🏆 Juara Liga 11x", prestige:5 },
    { id:"persib",    name:"Persib Bandung",    city:"Bandung",   logo:"💙", badge:"🐏", color:"#004ba0", str:1.05, stadium:"Stadion GBLA",  fans:60000, founded:1933, criteria:{ minPower:73, minLevel:4, minWins:7,  preferredPos:["CM","DM","CB"],  desc:"Butuh gelandang bertahan tangguh dan bek solid." }, bio:"Maung Bandung. Rivalitas legendaris dengan Persija.", achievement:"🏆 Juara Liga 9x", prestige:5 },
    { id:"persebaya", name:"Persebaya Surabaya", city:"Surabaya", logo:"🟢", badge:"🐊", color:"#00a651", str:1.08, stadium:"Stadion GBT",   fans:50000, founded:1927, criteria:{ minPower:72, minLevel:4, minWins:6,  preferredPos:["ST","CM","GK"],  desc:"Bajul Ijo cari striker garang dan kiper andal." }, bio:"Bajul Ijo, salah satu klub tertua Indonesia.", achievement:"🏆 Juara Liga 5x", prestige:4 },
    { id:"arema",     name:"Arema FC",           city:"Malang",   logo:"🔵", badge:"⭐", color:"#1a4fa0", str:1.00, stadium:"Stadion Kanjuruhan", fans:45000, founded:1987, criteria:{ minPower:68, minLevel:3, minWins:5, preferredPos:["AM","LW","RW"], desc:"Singo Edan butuh kreator serangan berbahaya." }, bio:"Singo Edan dari Malang.", achievement:"🏆 Juara Liga 2x", prestige:4 },
    { id:"psm",       name:"PSM Makassar",       city:"Makassar", logo:"🔴", badge:"🦁", color:"#cc0000", str:1.03, stadium:"Stadion Mattoanging", fans:40000, founded:1915, criteria:{ minPower:70, minLevel:3, minWins:6, preferredPos:["CB","DM","ST"], desc:"PSM butuh bek tangguh dan striker dominan." }, bio:"Juku Eja, kebanggaan Sulawesi.", achievement:"🏆 Juara Liga 4x", prestige:4 },
    { id:"bali",      name:"Bali United",        city:"Bali",     logo:"🔶", badge:"🦋", color:"#f47920", str:1.02, stadium:"Stadion Kapten I Wayan Dipta", fans:35000, founded:2015, criteria:{ minPower:67, minLevel:3, minWins:5, preferredPos:["LW","ST","AM"], desc:"Butuh pemain kreatif dan cepat di lini serang." }, bio:"The Serdadu Tridatu.", achievement:"🏆 Juara Liga 2x", prestige:3 },
    { id:"borneo",    name:"Borneo FC",          city:"Samarinda",logo:"🟠", badge:"🦅", color:"#f26522", str:0.98, stadium:"Stadion Segiri", fans:30000, founded:2014, criteria:{ minPower:64, minLevel:2, minWins:4, preferredPos:["CM","CB","ST"], desc:"Tim ambisius Kalimantan, cari pemain all-rounder." }, bio:"Pesut Etam, kebanggaan Kalimantan Timur.", achievement:"🥈 Runner-up 1x", prestige:3 },
    { id:"madura",    name:"Madura United",      city:"Pamekasan",logo:"🔴", badge:"🐂", color:"#cc0000", str:0.95, stadium:"Stadion Gelora Bangkalan", fans:28000, founded:2015, criteria:{ minPower:62, minLevel:2, minWins:3, preferredPos:["DM","CB","RB"], desc:"Cari pemain bertahan yang disiplin dan kuat fisik." }, bio:"Laskar Sape Kerrab.", achievement:"🥈 Runner-up 2x", prestige:3 },
    { id:"psis",      name:"PSIS Semarang",      city:"Semarang", logo:"⚫", badge:"🦈", color:"#3b3b3b", str:0.92, stadium:"Stadion Jatidiri", fans:32000, founded:1932, criteria:{ minPower:60, minLevel:2, minWins:3, preferredPos:["GK","CB","DM"], desc:"Mahesa Jenar cari pilar bertahan solid." }, bio:"Mahesa Jenar, kebanggaan Semarang.", achievement:"🏅 Promosi 2x", prestige:2 },
    { id:"persita",   name:"Persita Tangerang",  city:"Tangerang",logo:"🟣", badge:"🦁", color:"#6a0dad", str:0.90, stadium:"Stadion Sport Center Benteng", fans:20000, founded:1994, criteria:{ minPower:58, minLevel:1, minWins:2, preferredPos:["AM","CM","LW"], desc:"Pendekar Cisadane cari talenta muda kreatif." }, bio:"Pendekar Cisadane.", achievement:"🏅 Promosi 1x", prestige:2 }
  ],
  "Divisi 2": [
    { id:"persela",   name:"Persela Lamongan",   city:"Lamongan", logo:"🔵", badge:"🦅", color:"#003399", str:0.88, stadium:"Stadion Surajaya", fans:22000, founded:1967, criteria:{ minPower:55, minLevel:1, minWins:2, preferredPos:["CB","GK","CM"], desc:"Butuh lini belakang tangguh." }, bio:"Lini masa depan.", achievement:"🏅 Bertahan 3x", prestige:2 },
    { id:"kijang",    name:"Kijang United",      city:"Batam",    logo:"🟡", badge:"🦌", color:"#f5c100", str:0.85, stadium:"Stadion Temenggung Abdul Jamal", fans:18000, founded:2010, criteria:{ minPower:52, minLevel:1, minWins:1, preferredPos:["ST","LW","RW"], desc:"Butuh penyerang cepat dan lapar gol." }, bio:"Tim ambisius dari Batam.", achievement:"🏅 Promosi 1x", prestige:1 },
    { id:"persis",    name:"Persis Solo",        city:"Solo",     logo:"🔴", badge:"🐯", color:"#cc0000", str:0.87, stadium:"Stadion Manahan", fans:25000, founded:1923, criteria:{ minPower:54, minLevel:1, minWins:2, preferredPos:["CM","ST","GK"], desc:"Cari pemain berpengalaman dan bermental kuat." }, bio:"Salah satu klub tertua Indonesia.", achievement:"🏆 Juara 2x", prestige:2 },
    { id:"cilegon",   name:"Cilegon United",     city:"Cilegon",  logo:"🟢", badge:"⚙️", color:"#008000", str:0.82, stadium:"Stadion Krakatau Steel", fans:15000, founded:2008, criteria:{ minPower:50, minLevel:1, minWins:1, preferredPos:["DM","CB","RB"], desc:"Butuh gelandang bertahan disiplin." }, bio:"Tim industri Banten.", achievement:"🏅 Promosi 1x", prestige:1 },
    { id:"persipura", name:"Persipura Jayapura",  city:"Jayapura", logo:"⚫", badge:"🦅", color:"#1a1a1a", str:0.89, stadium:"Stadion Mandala", fans:30000, founded:1963, criteria:{ minPower:56, minLevel:1, minWins:2, preferredPos:["LW","ST","CM"], desc:"Mutiara Hitam butuh pemain cepat dan teknikal." }, bio:"Mutiara Hitam Papua.", achievement:"🏆 Juara Liga 4x", prestige:2 }
  ],
  "Divisi 3": [
    { id:"nusantoro",  name:"Liga Nusantoro FC",   city:"Pamekasan", logo:"🏠", badge:"⭐", color:"#22c55e", str:0.75, stadium:"Stadion Gelora Bangkalan", fans:5000, founded:2020, criteria:{ minPower:40, minLevel:1, minWins:0, preferredPos:["ST","CM","GK"], desc:"Tim pemula. Semua pemain diterima!" }, bio:"Tim starter untuk semua pemain baru.", achievement:"🌱 Tim Pemula", prestige:1 },
    { id:"garuda",     name:"Garuda Muda FC",      city:"Bogor",     logo:"🦅", badge:"🇮🇩", color:"#ef4444", str:0.72, stadium:"Stadion Pakansari", fans:8000, founded:2018, criteria:{ minPower:38, minLevel:1, minWins:0, preferredPos:["GK","CB","DM"], desc:"Butuh pemain bertahan muda berbakat." }, bio:"Akademi pemain muda berbakat.", achievement:"🌱 Tim Berkembang", prestige:1 },
    { id:"rajawali",   name:"Rajawali Selatan FC", city:"Palembang", logo:"🟠", badge:"🦅", color:"#f97316", str:0.70, stadium:"Stadion Gelora Sriwijaya", fans:6000, founded:2019, criteria:{ minPower:35, minLevel:1, minWins:0, preferredPos:["LW","RW","AM"], desc:"Cari sayap cepat dan kreatif." }, bio:"Tim dari Sumatera Selatan.", achievement:"🌱 Tim Baru", prestige:1 }
  ]
};

function getAllClubs() {
  return [
    ...(INDONESIAN_CLUBS["Divisi 1"] || []),
    ...(INDONESIAN_CLUBS["Divisi 2"] || []),
    ...(INDONESIAN_CLUBS["Divisi 3"] || [])
  ];
}

function findClub(id) {
  return getAllClubs().find(c => c.id === String(id)) || null;
}

function clubDivision(id) {
  for (const [div, clubs] of Object.entries(INDONESIAN_CLUBS)) {
    if (clubs.find(c => c.id === id)) return div;
  }
  return null;
}

function roleGroup(role = "") {
  const r = String(role).toUpperCase();
  if (r === "GK") return "GK";
  if (["CB","LB","RB","DEF","SW","WB"].some(x => r.includes(x))) return "DEF";
  if (["CM","AM","DM","LM","RM","MID"].some(x => r.includes(x))) return "MID";
  if (["ST","LW","RW","CF","SS","ATT"].some(x => r.includes(x))) return "ATT";
  return "MID";
}

function normalizePositionRole(pos = "") {
  const p = String(pos).toUpperCase();
  if (["GK"].includes(p)) return "GK";
  if (["CB","LB","RB","DM","SW"].includes(p)) return p;
  if (["CM","AM","LM","RM"].includes(p)) return p;
  if (["ST","LW","RW","CF"].includes(p)) return p;
  return p;
}

function findBestLineupSlot(save, wantedPos) {
  const FORMATIONS = {
    "4-4-2":   ["GK","LB","CB1","CB2","RB","LM","CM1","CM2","RM","ST1","ST2"],
    "4-3-3":   ["GK","LB","CB1","CB2","RB","CM1","CM2","CM3","LW","RW","ST"],
    "3-5-2":   ["GK","CB1","CB2","CB3","LM","CM1","CM2","CM3","RM","ST1","ST2"],
    "4-2-3-1": ["GK","LB","CB1","CB2","RB","DM1","DM2","AM1","AM2","AM3","ST"],
    "5-3-2":   ["GK","LB","CB1","CB2","CB3","RB","CM1","CM2","CM3","ST1","ST2"]
  };
  const formation = save.formation || "4-3-3";
  const positions = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  const rg = roleGroup(wantedPos);
  const roleFromPos = (p) => {
    if (p.startsWith("GK")) return "GK";
    if (["LB","CB1","CB2","CB3","RB"].includes(p)) return "DEF";
    if (["DM1","DM2","CM1","CM2","CM3","AM1","AM2","AM3","LM","RM"].includes(p)) return "MID";
    return "ATT";
  };
  return positions.find(pos => roleFromPos(pos) === rg) || null;
}

function ensureHumanPlayerInTeam(save) {
  if (!save.character) return null;
  const characterName = String(save.character.name || "").trim();
  if (!characterName) return null;
  const wantedPos = normalizePositionRole(save.seasonPos || save.character.position || "ST");
  const rg = roleGroup(wantedPos);
  let player = (save.players || []).find((p) => String(p.id) === String(save.playerCharacterId) && !p.injury);
  if (!player) player = (save.players || []).find(p => (p.humanControlled || p.isUserPlayer) && !p.injury);
  if (!player) {
    player = (save.players || []).find(p => roleGroup(p.role || p.type) === rg && !p.injury);
  }
  if (!player && (save.players || []).length > 0) {
    player = save.players[0];
  }
  if (!player) return null;

  for (const p of save.players || []) {
    if (!p) continue;
    const masterName = MASTER_PLAYER_NAME_BY_ID.get(String(p.id));
    if (p.characterLinked && !p.originalName) p.originalName = masterName || p.name;
    if (String(p.id) !== String(player.id)) {
      if (p.originalName) p.name = p.originalName;
      else if (masterName && String(p.name) === characterName) p.name = masterName;
      p.characterLinked = false;
      delete p.isUserPlayer;
      p.humanControlled = false;
    }
  }

  if (!player.originalName) player.originalName = MASTER_PLAYER_NAME_BY_ID.get(String(player.id)) || player.name;
  player.name = characterName;
  player.nationality = save.character.nationality || player.nationality;
  player.age = parseInt(save.character.age || player.age || 20);
  player.role = wantedPos;
  player.type = wantedPos === "GK" ? "GK" : rg;
  player.isUserPlayer = true;
  player.humanControlled = true;
  player.characterLinked = true;

  (save.players || []).forEach(p => {
    if (String(p.id) !== String(player.id)) {
      delete p.isUserPlayer;
      p.humanControlled = false;
    }
  });

  save.playerCharacterId = player.id;
  save.lineup = save.lineup || {};
  const slot = findBestLineupSlot(save, wantedPos);
  if (slot) {
    Object.keys(save.lineup).forEach(pos => {
      if (String(save.lineup[pos]) === String(player.id) && pos !== slot) {
        save.lineup[pos] = null;
      }
    });
    save.lineup[slot] = player.id;
  }
  return player;
}

function getCurrentCompetitionLock(save) {
  if (save.career && !save.career.finished) {
    const total = save.career.schedule?.length || 18;
    const cur = save.career.currentMatchday || 0;
    return { mode:"career", current:cur, total, unlockAt:total, unlocked: cur === 0 || cur >= total };
  }
  if (save.liga && !save.liga.finished) {
    const total = save.liga.schedule?.length || 10;
    const cur = save.liga.currentMatch || 0;
    return { mode:"league", current:cur, total, unlockAt:total, unlocked: cur === 0 || cur >= total };
  }
  return { mode:"free", current:0, total:0, unlockAt:0, unlocked:true };
}

function canChangeClub(save) {
  const lock = getCurrentCompetitionLock(save);
  return { allowed: !save.myClub || lock.unlocked || lock.mode === "free", lock };
}

function evaluateClubApplication(save, club) {
  const criteria = club.criteria || {};
  const char = save.character;
  const reasons = [];
  let score = 0;
  const avgPower = (save.players || []).length
    ? Math.round((save.players || []).reduce((s,p) => s + (p.basePower||60), 0) / save.players.length)
    : 0;

  if (avgPower >= (criteria.minPower || 0)) { score += 30; reasons.push({ ok:true, text:`Kekuatan tim ${avgPower} ≥ ${criteria.minPower} ✅` }); }
  else reasons.push({ ok:false, text:`Kekuatan tim ${avgPower} < ${criteria.minPower} ❌` });

  const wins = save.winCount || 0;
  if (wins >= (criteria.minWins || 0)) { score += 25; reasons.push({ ok:true, text:`${wins} kemenangan ✅` }); }
  else reasons.push({ ok:false, text:`Baru ${wins} kemenangan, butuh ${criteria.minWins} ❌` });

  const maxLevel = (save.players || []).reduce((m,p) => Math.max(m, p.level||1), 0);
  if (maxLevel >= (criteria.minLevel || 1)) { score += 20; reasons.push({ ok:true, text:`Level tertinggi ${maxLevel} ✅` }); }
  else reasons.push({ ok:false, text:`Level tertinggi ${maxLevel}, butuh ${criteria.minLevel} ❌` });

  if (char && (criteria.preferredPos || []).includes(char.position)) { score += 25; reasons.push({ ok:true, text:`Posisi ${char.position} sangat dibutuhkan! ⭐` }); }
  else if (char) { score += 10; reasons.push({ ok:"neutral", text:`Posisi ${char.position} diterima sebagai cadangan` }); }

  if ((save.careerHistory || []).length > 0) { score = Math.min(100, score + 5); }

  const accepted = score >= 60 && avgPower >= (criteria.minPower || 0);
  const contractOffer = accepted ? generateContract(club, score, char) : null;
  return { score, accepted, reasons, contractOffer, club };
}

function generateContract(club, score, char) {
  const base = Math.floor(score * 2.5);
  const prestige = club.prestige || 1;
  return {
    salary: base * prestige * 10,
    bonus: Math.floor(base * 0.5) * prestige,
    duration: prestige >= 4 ? "1 Season" : "2 Season",
    jersey: Math.floor(Math.random() * 23) + 1,
    benefits: prestige >= 4
      ? ["Akses pelatih terbaik","Fasilitas premium","Koneksi transfer internasional"]
      : prestige >= 2 ? ["Fasilitas latihan","Bonus promosi"] : ["Pengalaman bertanding"]
  };
}

/* ─── ROUTER ─── */
function createCharacterRouter({ authService, userSaveService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  // GET /positions — daftar posisi pemain
  router.get("/positions", (req, res) => {
    return ok(res, { positions: PLAYER_POSITIONS });
  });

  // POST /character/create — buat karakter baru
  router.post("/character/create", guard, (req, res) => {
    try {
      const { name, position, nationality, age } = req.body || {};
      const save = userSaveService.getUserSave(req.user.username);
      if (!save) return fail(res, 404, "Save tidak ditemukan");

      const posData = PLAYER_POSITIONS.find(p => p.id === position);
      if (!posData) return fail(res, 400, "Posisi tidak valid");

      save.character = {
        name: String(name || req.user.username).trim(),
        position,
        positionLabel: posData.label,
        nationality: nationality || "🇮🇩",
        age: parseInt(age) || 20,
        power: (posData.minPower || 65) - 5,
        icon: posData.icon
      };
      save.seasonPos = position;
      ensureHumanPlayerInTeam(save);
      userSaveService.saveUserSave(req.user.username, save);
      return ok(res, { success: true, character: save.character });
    } catch (err) {
      return fail(res, 400, err.message);
    }
  });

  // POST /season/position — pilih posisi musim
  router.post("/season/position", guard, (req, res) => {
    try {
      const { position } = req.body || {};
      const save = userSaveService.getUserSave(req.user.username);
      if (!save) return fail(res, 404, "Save tidak ditemukan");

      const posData = PLAYER_POSITIONS.find(p => p.id === position);
      if (!posData) return fail(res, 400, "Posisi tidak valid");

      save.seasonPos = position;
      if (save.character) save.character.position = position;
      ensureHumanPlayerInTeam(save);
      userSaveService.saveUserSave(req.user.username, save);
      return ok(res, { success: true, position, positionLabel: posData.label });
    } catch (err) {
      return fail(res, 400, err.message);
    }
  });

  // GET /clubs — semua klub
  router.get("/clubs", (req, res) => {
    return ok(res, { clubs: INDONESIAN_CLUBS });
  });

  // GET /clubs/all — semua klub flat
  router.get("/clubs/all", (req, res) => {
    return ok(res, { clubs: getAllClubs() });
  });

  // GET /clubs/:id — detail klub
  router.get("/clubs/:id", (req, res) => {
    const club = findClub(req.params.id);
    if (!club) return fail(res, 404, "Klub tidak ditemukan");
    return ok(res, { club, division: clubDivision(req.params.id) });
  });

  // POST /clubs/:id/apply — evaluasi lamaran
  router.post("/clubs/:id/apply", guard, (req, res) => {
    try {
      const save = userSaveService.getUserSave(req.user.username);
      const club = findClub(req.params.id);
      if (!club) return fail(res, 404, "Klub tidak ditemukan");
      return ok(res, evaluateClubApplication(save, club));
    } catch (err) {
      return fail(res, 400, err.message);
    }
  });

  // POST /clubs/:id/join — bergabung ke klub
  router.post("/clubs/:id/join", guard, (req, res) => {
    try {
      const save = userSaveService.getUserSave(req.user.username);
      const club = findClub(req.params.id);
      if (!club) return fail(res, 404, "Klub tidak ditemukan");

      const moveCheck = canChangeClub(save);
      if (save.myClub && !moveCheck.allowed) {
        return fail(res, 400, `Tidak bisa ganti tim sebelum pertengahan musim.`);
      }

      const evaluation = evaluateClubApplication(save, club);
      if (!evaluation.accepted) {
        return fail(res, 400, "Kamu belum memenuhi kriteria klub ini");
      }

      // Update current club in save
      save.myClub = {
        id: club.id, name: club.name, logo: club.logo, city: club.city,
        color: club.color, division: clubDivision(club.id),
        joinedAt: new Date().toISOString(),
        contract: evaluation.contractOffer
      };

      // BUG FIX: Reset career division/league if we join a new club at the start of a season
      if (save.career && (Number(save.career.currentMatchday || 0) === 0 || save.career.finished)) {
        const targetDivision = save.myClub.division || "Divisi 3";
        // Force regenerate if club changed, even if division is the same, to ensure the new club is 'me'
        const clubs = (INDONESIAN_CLUBS[targetDivision] || INDONESIAN_CLUBS["Divisi 3"] || []).map((c) => ({
          id: c.id,
          name: c.name,
          city: c.city,
          logo: c.logo,
          str: c.str || 0.8,
          stadium: c.stadium || ""
        }));
        
        // Remove the new club from the opponents list if it's there
        const filteredClubs = clubs.filter(c => c.id !== save.myClub.id);

        const schedule = [];
        filteredClubs.forEach((c, i) => {
          schedule.push({ matchday: i + 1, club: c, isHome: i % 2 === 0, played: false, result: null, score: null });
        });
        filteredClubs.forEach((c, i) => {
          schedule.push({ matchday: filteredClubs.length + i + 1, club: c, isHome: i % 2 !== 0, played: false, result: null, score: null });
        });

        const myTeamName = save.teamName || save.myClub?.name || "My Team";
        const standings = filteredClubs.map((c) => ({
          id: c.id, name: c.name, logo: c.logo,
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
          ...(save.career || {}),
          division: targetDivision,
          schedule,
          currentMatchday: 0,
          standings,
          myStats: { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0 },
          finished: false,
          promotionZone: 3,
          relegationZone: filteredClubs.length - 2,
          reward: 0,
          premiumReward: 0,
          aiRoundDone: {},
          aiResults: [],
        };
      }

      ensureHumanPlayerInTeam(save);
      userSaveService.saveUserSave(req.user.username, save);
      return ok(res, { success: true, club: save.myClub, evaluation });
    } catch (err) {
      return fail(res, 400, err.message);
    }
  });

  // POST /clubs/leave — keluar dari klub
  router.post("/clubs/leave", guard, (req, res) => {
    try {
      const save = userSaveService.getUserSave(req.user.username);
      const moveCheck = canChangeClub(save);
      if (save.myClub && !moveCheck.allowed) {
        return fail(res, 400, "Tidak bisa keluar tim sebelum pertengahan musim.");
      }
      save.myClub = null;
      userSaveService.saveUserSave(req.user.username, save);
      return ok(res, { success: true });
    } catch (err) {
      return fail(res, 400, err.message);
    }
  });

  return router;
}

module.exports = { createCharacterRouter, PLAYER_POSITIONS, INDONESIAN_CLUBS, getAllClubs, findClub, ensureHumanPlayerInTeam };
