/* =====================
   FOOTBALL SAGA 2 - main.js (FIXED)
   Bug Fixes:
   1. role vs type normalization
   2. formation map semua formasi
   3. equip slot targeting
   4. used players check di bench
   5. inventory filter (no consumables)
   6. shop split equipment & consumable
   7. double init fixed
   8. formation change UI
===================== */

/* ── Premium FUT-style Card Generator ── */
function renderPlayerCard(p) {
  const rarityClass = p.rarity === 'S' || p.rarity === 'SS' || p.rarity === 'SSR' ? 'pc-special' : p.rarity === 'B' ? 'pc-silver' : p.rarity === 'C' ? 'pc-bronze' : '';
  const photo = p.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`;
  
  return `
    <div class="player-card-premium ${rarityClass}" onclick="openPlayerPopup('${p.id}', _teamDataCache)">
      <div class="pc-rating">${p.currentPower || p.basePower}</div>
      <div class="pc-pos">${p.role || p.type}</div>
      <img src="${photo}" class="pc-photo" alt="${p.name}">
      <div class="pc-name">${p.name}</div>
      <div class="pc-stats">
        <div class="pc-stat"><b>PAC</b> ${p.pace || 50}</div>
        <div class="pc-stat"><b>SHO</b> ${p.shooting || 50}</div>
        <div class="pc-stat"><b>PAS</b> ${p.passing || 50}</div>
        <div class="pc-stat"><b>DEF</b> ${p.defense || 50}</div>
      </div>
    </div>
  `;
}

/* ── Fix Team Loading Bug ── */
function showTeam() {
  const loadingHtml = `<div class="loading"><div class="loading-spinner"></div><span>Loading Squad...</span></div>`;
  content.innerHTML = loadingHtml;

  fetch("/team").then(r => {
    if (!r.ok) throw new Error("Gagal mengambil data tim");
    return r.json();
  }).then(d => {
    _teamDataCache = d;
    // d.starters dan d.bench mungkin undefined jika API hanya kirim d.team
    const starters = d.starters || (d.team || []).filter(p => p.isStarter);
    const bench = d.bench || (d.team || []).filter(p => !p.isStarter);
    
    content.innerHTML = `
      <div class="team-page">
        <div class="team-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
          <div>
            <h1 style="font-family:'Orbitron',sans-serif; font-size:28px; font-weight:900; color:var(--primary);">👥 SQUAD SAYA</h1>
            <p style="color:#94a3b8; font-size:14px;">Kelola pemain dan tingkatkan performa tim</p>
          </div>
          <div style="display:flex; gap:12px;">
            <button onclick="recoverAll()" class="hub-btn" style="width:auto; padding:10px 20px; background:var(--primary); color:black;">💊 Pulihkan Semua</button>
          </div>
        </div>

        <div class="hub-section">
          <div class="hub-section-title">Pemain Inti (Starters)</div>
          <div class="player-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:20px;">
            ${starters.length > 0 ? starters.map(p => renderPlayerCard(p)).join("") : '<p style="color:#64748b">Tidak ada pemain inti</p>'}
          </div>
        </div>

        <div class="hub-section" style="margin-top:40px;">
          <div class="hub-section-title">Cadangan (Bench)</div>
          <div class="player-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:20px;">
            ${bench.length > 0 ? bench.map(p => renderPlayerCard(p)).join("") : '<p style="color:#64748b">Tidak ada pemain cadangan</p>'}
          </div>
        </div>
      </div>
    `;
    animateContent();
  }).catch(err => {
    content.innerHTML = `<div class="error-box">❌ Error: ${err.message}</div>`;
  });
}

/* ── Fix Transfer Market Card ── */
function showTransfer() {
  fetch("/transfer/market").then(r => r.json()).then(d => {
    const market = d.market || [];
    
    content.innerHTML = `
      <div class="transfer-page">
        <div class="transfer-header" style="margin-bottom:30px;">
          <h1 style="font-family:'Orbitron',sans-serif; font-size:28px; font-weight:900; color:var(--accent);">🔀 TRANSFER MARKET</h1>
          <p style="color:#94a3b8; font-size:14px;">Rekrut pemain bintang untuk memperkuat timmu</p>
        </div>

        <div class="hub-grid">
          ${market.map(p => `
            <div class="hub-card transfer-card">
              <div class="transfer-card-top">
                <div class="hub-icon" style="background:var(--glass); border-color:var(--accent); min-width:64px;">${p.role || p.type}</div>
                <div class="hub-meta">
                  <div class="hub-name" style="font-size:16px;">${p.name}</div>
                  <div class="hub-desc">Power: ${p.basePower} · ${p.rarity}</div>
                </div>
              </div>
              <div class="tc-stats">
                <div class="hub-pill">PAC ${p.pace || 50}</div>
                <div class="hub-pill">SHO ${p.shooting || 50}</div>
                <div class="hub-pill">PAS ${p.passing || 50}</div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:10px; border-top:1px solid var(--glass-border);">
                <div style="font-size:18px; font-weight:800; color:var(--accent);">💰 ${p.price}</div>
                <button class="tc-buy-btn" onclick="buyTransfer('${p.id}')">REKRUT ▸</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    animateContent();
  });
}

const content = document.getElementById("content");

let dragEquipId   = null;
let dragEquipSlot = null;
let dragPlayerData = null;

/* =====================
   HELPER ANIMATIONS
===================== */
function animateContent() {
  content.classList.remove("fade-in");
  void content.offsetWidth;
  content.classList.add("fade-in");
}

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2500);
}

/* =====================
   STATUS
===================== */
function showStatus() {
  fetch("/status").then(r => r.json()).then(d => {
    window._statusCache = d;
    document.querySelectorAll(".coin").forEach(x => x.textContent = d.coin);
    document.querySelectorAll(".stage").forEach(x => x.textContent = d.stage);
    document.querySelectorAll(".premium-coin").forEach(x => x.textContent = d.premiumCoin||0);
    const w=d.winCount||0, dw=d.drawCount||0, l=d.loseCount||0;
    const tr=document.getElementById("topbarRecord");
    if(tr) tr.textContent=`W:${w} D:${dw} L:${l}`;
    const sw=document.getElementById("sidebarWin");
    const sd=document.getElementById("sidebarDraw");
    const sl=document.getElementById("sidebarLose");
    if(sw) sw.textContent=w;
    if(sd) sd.textContent=dw;
    if(sl) sl.textContent=l;
  }).catch(()=>{});
}

function _openCompetition(fn) {
  const btn = document.getElementById("navCompetitions");
  if (btn && typeof window.navigate === "function") {
    window.navigate(btn, fn);
    return;
  }
  fn();
}

/* ── Premium FUT-style Card Generator ── */
function renderPlayerCard(p) {
  const rarityClass = p.rarity === 'S' || p.rarity === 'SS' || p.rarity === 'SSR' ? 'pc-special' : p.rarity === 'B' ? 'pc-silver' : p.rarity === 'C' ? 'pc-bronze' : '';
  const photo = p.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`;
  
  return `
    <div class="player-card-premium ${rarityClass}" onclick="showPlayerDetail('${p.id}')">
      <div class="pc-rating">${p.currentPower || p.basePower}</div>
      <div class="pc-pos">${p.role || p.type}</div>
      <img src="${photo}" class="pc-photo" alt="${p.name}">
      <div class="pc-name">${p.name}</div>
      <div class="pc-stats">
        <div class="pc-stat"><b>PAC</b> ${p.pace || 50}</div>
        <div class="pc-stat"><b>SHO</b> ${p.shooting || 50}</div>
        <div class="pc-stat"><b>PAS</b> ${p.passing || 50}</div>
        <div class="pc-stat"><b>DEF</b> ${p.defense || 50}</div>
      </div>
    </div>
  `;
}

function showCompetitions() {
  const safeJson = async (url) => {
    try {
      const r = await fetch(url);
      return await r.json();
    } catch {
      return null;
    }
  };

  Promise.all([
    safeJson("/status"),
    safeJson("/career"),
    safeJson("/liga/status"),
    safeJson("/afc"),
    safeJson("/aff"),
    safeJson("/cups"),
  ]).then(([status, careerRes, ligaRes, afcRes, affRes, cupsRes]) => {
    const career = careerRes?.career || careerRes?.careerMode || careerRes?.careerData || careerRes?.career;
    const liga = ligaRes?.liga;
    const afc = afcRes?.afc;
    const aff = affRes?.aff;
    const activeCup = cupsRes?.activeCup || null;

    const careerLabel = career
      ? (career.finished ? `Season ${career.seasonNum||career.season||"?"} · Selesai` : `Matchday ${(career.currentMatchday||0)+1}/${career.schedule?.length||18}`)
      : "Belum dimulai";

    const ligaLabel = liga
      ? (liga.finished ? `Season ${liga.season||"?"} · Selesai` : `Matchday ${(liga.currentMatch||0)+1}/${liga.schedule?.length||11}`)
      : "Belum dimulai";

    const afcLabel = afc
      ? (afc.finished ? `Season ${afc.season||"?"} · Selesai` : (afc.stage === "knockout" || afc.knockout ? "Fase Knockout" : `Matchday ${afc.currentMatchday||1}/${afc.schedule?.length||3}`))
      : "Daftar / belum masuk";

    const affLabel = aff
      ? (aff.finished ? `Season ${aff.season||"?"} · Selesai` : (aff.stage === "knockout" || aff.knockout ? "Fase Knockout" : `Matchday ${aff.currentMatchday||1}/${aff.schedule?.length||3}`))
      : "Daftar / belum masuk";

    const cupLabel = activeCup
      ? (activeCup.finished ? `${activeCup.name} · Selesai` : `${activeCup.name} · Matchday ${(activeCup.currentMatchday||0)+1}/${activeCup.schedule?.length||3}`)
      : "Pilih cup";

    const coin = status?.coin ?? "0";
    const stage = status?.stage ?? "1";
    const prem = status?.premiumCoin ?? "0";

    content.innerHTML = `
      <div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:var(--primary); font-family:'Orbitron',sans-serif; font-size:32px; font-weight:900;">🏆 KOMPETISI</div>
          <div class="comp-subtitle" style="color:#94a3b8; margin-top:5px; font-size:14px;">Pilih mode permainan — semua event & turnamen terkumpul rapi</div>
          
          <div class="hub-stats" style="display:flex; gap:20px; margin-top:25px;">
            <div class="hub-stat" style="background:var(--bg-card); padding:10px 20px; border-radius:15px; border:1px solid var(--glass-border);">
              <span style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Saldo Coin</span>
              <div style="font-size:20px; font-weight:800; color:var(--accent);">💰 ${coin}</div>
            </div>
            <div class="hub-stat" style="background:var(--bg-card); padding:10px 20px; border-radius:15px; border:1px solid var(--glass-border);">
              <span style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Premium</span>
              <div style="font-size:20px; font-weight:800; color:#3b82f6;">💎 ${prem}</div>
            </div>
          </div>
        </div>

        <div class="hub-section">
          <div class="hub-section-title">Main Mode</div>
          <div class="hub-grid">
            <div class="hub-card" onclick="_openCompetition(showCareer)">
              <div class="hub-card-top">
                <div class="hub-icon">🏟️</div>
                <div class="hub-meta">
                  <div class="hub-name">Career Mode</div>
                  <div class="hub-desc">Liga berjenjang Indonesia</div>
                </div>
              </div>
              <div class="hub-badges"><span class="hub-pill">${careerLabel}</span></div>
              <button class="hub-btn">Lanjutkan Karir ▸</button>
            </div>

            <div class="hub-card" onclick="_openCompetition(showLiga)">
              <div class="hub-card-top">
                <div class="hub-icon">🏆</div>
                <div class="hub-meta">
                  <div class="hub-name">Liga Cup</div>
                  <div class="hub-desc">Turnamen liga singkat</div>
                </div>
              </div>
              <div class="hub-badges"><span class="hub-pill">${ligaLabel}</span></div>
              <button class="hub-btn">Buka Liga ▸</button>
            </div>
          </div>
        </div>

        <div class="hub-section">
          <div class="hub-section-title">Turnamen Internasional</div>
          <div class="hub-grid">
            <div class="hub-card" onclick="_openCompetition(showAFC)">
              <div class="hub-card-top">
                <div class="hub-icon">🌏</div>
                <div class="hub-meta">
                  <div class="hub-name">AFC Champions</div>
                  <div class="hub-desc">Kejuaraan Klub Asia</div>
                </div>
              </div>
              <div class="hub-badges"><span class="hub-pill warn">${afcLabel}</span></div>
              <button class="hub-btn">Buka AFC ▸</button>
            </div>

            <div class="hub-card" onclick="_openCompetition(showAFF)">
              <div class="hub-card-top">
                <div class="hub-icon">🛡️</div>
                <div class="hub-meta">
                  <div class="hub-name">Piala AFF</div>
                  <div class="hub-desc">ASEAN Club Championship</div>
                </div>
              </div>
              <div class="hub-badges"><span class="hub-pill warn">${affLabel}</span></div>
              <button class="hub-btn">Buka AFF ▸</button>
            </div>

            <div class="hub-card" onclick="_openCompetition(showCups)">
              <div class="hub-card-top">
                <div class="hub-icon">🎪</div>
                <div class="hub-meta">
                  <div class="hub-name">Special Cup</div>
                  <div class="hub-desc">Turnamen Tematik</div>
                </div>
              </div>
              <div class="hub-badges"><span class="hub-pill">${cupLabel}</span></div>
              <button class="hub-btn">Pilih Cup ▸</button>
            </div>
          </div>
        </div>
      </div>
    `;

    animateContent();
  });
}

/* =====================
   MATCH — Real-time animation + FS2 layout
===================== */
let matchAnimFrame = null;

function showMatch() {
  showToast("Fitur World Tour (Match) sedang dinonaktifkan.", "info");
  showCompetitions();
}


/* Gambar lapangan kosong saja */
function drawFieldOnly() {
  const canvas = document.getElementById("matchCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  drawField(ctx, canvas.width, canvas.height);
}

/* Core field drawing */
function drawField(ctx, W, H) {
  // Stripes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i%2===0 ? "#0a3d1a" : "#0d4820";
    ctx.fillRect(i*(W/8), 0, W/8, H);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.8;
  ctx.strokeRect(8, 8, W-16, H-16);
  ctx.beginPath(); ctx.moveTo(W/2,8); ctx.lineTo(W/2,H-8); ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2, H/2, 40, 0, Math.PI*2);
  ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2,H/2,3,0,Math.PI*2);
  ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.6)"; ctx.lineWidth=1.5;
  ctx.strokeRect(8, H/2-50, 58, 100);
  ctx.strokeRect(8, H/2-24, 24, 48);
  ctx.strokeRect(W-66, H/2-50, 58, 100);
  ctx.strokeRect(W-32, H/2-24, 24, 48);
  ctx.strokeStyle="#fff"; ctx.lineWidth=2.5;
  ctx.strokeRect(1, H/2-20, 8, 40);
  ctx.strokeRect(W-9, H/2-20, 8, 40);
}

/* ── Helper robust score parsing ── */
function parseScore(score) {
  if (typeof score === 'string' && score.includes("-")) {
    const parts = score.split("-").map(Number);
    return { home: parts[0] || 0, away: parts[1] || 0 };
  }
  if (score && typeof score === 'object') {
    return {
      home: Number(score.myGoals ?? score.homeScore ?? score.home ?? 0),
      away: Number(score.oppGoals ?? score.awayScore ?? score.away ?? 0)
    };
  }
  return { home: 0, away: 0 };
}

/* =====================
   MATCH ANIMATION ENGINE
===================== */
function playMatch() {
  const btn = document.getElementById("matchPlayBtn");
  if (btn) { btn.disabled=true; btn.textContent="⏳ Memuat..."; }
  if (matchAnimFrame) { cancelAnimationFrame(matchAnimFrame); matchAnimFrame=null; }

  fetch("/match/play", { method: "POST" }).then(r=>r.json()).then(res => {
    if (res.error) {
      showToast("❌ "+res.error, "error");
      if (btn) { btn.disabled=false; btn.textContent="⚽ Kick Off!"; }
      return;
    }
    startMatchAnimation(res);
  }).catch(()=>{
    showToast("❌ Gagal connect server","error");
    if (btn) { btn.disabled=false; btn.textContent="⚽ Kick Off!"; }
  });
}

function skipMatch() {
  if (matchAnimFrame) {
    cancelAnimationFrame(matchAnimFrame);
    matchAnimFrame = null;
  }
}

function startMatchAnimation(result) {
  const canvas = document.getElementById("matchCanvas");
  if (!canvas) { showMatchResult(result); return; }
  const ctx   = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // robust score parsing
  const scoreObj = parseScore(result.score);
  const ps = scoreObj.home;
  const es = scoreObj.away;

  // Update Score UI awal
  const scoreHomeEl = document.getElementById("matchScoreHome");
  const scoreAwayEl = document.getElementById("matchScoreAway");
  if (scoreHomeEl) scoreHomeEl.textContent = "0";
  if (scoreAwayEl) scoreAwayEl.textContent = "0";

  // Update Enemy Name
  const enLabel = document.getElementById("enemyNameLabel");
  if (enLabel && result.opponent?.name) enLabel.textContent = result.opponent.name;
  else if (enLabel && result.enemyName) enLabel.textContent = result.enemyName;

  // Controls UI
  const container = document.querySelector(".match-screen");
  if (container && !container.querySelector(".match-controls")) {
    const matchControlsHtml = `
      <div class="match-controls">
        <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:5px 15px; border-radius:10px;">
          <span style="font-size:11px; color:#94a3b8; font-weight:800;">SPEED</span>
          <select id="matchSpeedSelect" onchange="window._matchSpeed = parseFloat(this.value)" style="background:transparent; border:none; color:var(--primary); font-weight:bold; cursor:pointer;">
            <option value="1">1x</option>
            <option value="2" selected>2x</option>
            <option value="4">4x</option>
          </select>
        </div>
        <button onclick="skipMatch(); showMatchResult(window._currentMatchResult)" class="hub-btn" style="width:auto; padding:8px 20px; background:var(--red); color:white;">SKIP MATCH ▸▸</button>
      </div>
    `;
    const div = document.createElement("div");
    div.innerHTML = matchControlsHtml;
    container.appendChild(div.firstElementChild);
  }
  window._currentMatchResult = result;
  window._matchSpeed = window._matchSpeed || 2;

  // Timeline & State
  const timeline = buildMatchTimeline(result, W, H);
  let tIdx = 0, frame = 0;
  const TOTAL_FRAMES = 420;
  let homeScore = 0, awayScore = 0;
  let flashMsg = null, flashTimer = 0;

  const ball = { cx: W/2, cy: H/2, tx: W/2, ty: H/2 };
  const players = [
    { name: "GK", role: "GK", cx: 60, cy: H/2 },
    { name: "DEF", role: "DEF", cx: 160, cy: H/3 },
    { name: "MID", role: "MID", cx: 300, cy: H/2 },
    { name: "ATT", role: "ATT", cx: 440, cy: H/2 }
  ];
  const enemies = [
    { cx: W-60, cy: H/2 }, { cx: W-160, cy: H/3 }, { cx: W-300, cy: H/2 }
  ];

  function tick() {
    const steps = Math.max(1, Math.min(4, window._matchSpeed || 1));
    for (let s=0; s<steps; s++) {
      frame++;
      // Events
      while (tIdx < timeline.length && timeline[tIdx].frame <= frame) {
        const ev = timeline[tIdx++];
        if (ev.type === "goal_home") {
          homeScore++;
          if (scoreHomeEl) scoreHomeEl.textContent = homeScore;
          flashMsg = "⚽ GOAL!"; flashTimer = 60;
        }
        if (ev.type === "goal_away") {
          awayScore++;
          if (scoreAwayEl) scoreAwayEl.textContent = awayScore;
          flashMsg = "😱 GOAL!"; flashTimer = 60;
        }
        if (ev.type === "skill") { flashMsg = "✨ " + ev.text; flashTimer = 45; }
        if (ev.type === "event") addMatchLog(ev.text);
        if (ev.ballTarget) { ball.tx = ev.ballTarget.x; ball.ty = ev.ballTarget.y; }
      }
      if (frame >= TOTAL_FRAMES) break;
    }

    ctx.clearRect(0, 0, W, H);
    drawField(ctx, W, H);

    // Ball move
    const bdx = ball.tx - ball.cx; const bdy = ball.ty - ball.cy;
    const bdist = Math.sqrt(bdx*bdx + bdy*bdy);
    const bspeed = 5 * steps;
    if (bdist > bspeed) { ball.cx += (bdx/bdist)*bspeed; ball.cy += (bdy/bdist)*bspeed; }
    else { ball.cx = ball.tx; ball.cy = ball.ty; }

    // Draw
    players.forEach(p => drawPlayerDot(ctx, p.cx + Math.sin(frame*0.05)*2, p.cy + Math.cos(frame*0.05)*2, roleColor(p.role), p.name, false));
    enemies.forEach(p => drawPlayerDot(ctx, p.cx + Math.sin(frame*0.05)*2, p.cy + Math.cos(frame*0.05)*2, "#ef4444", "", true));
    drawBall(ctx, ball.cx, ball.cy);

    // Flash
    if (flashMsg && flashTimer > 0) {
      flashTimer -= steps;
      ctx.fillStyle = "#facc15"; ctx.font = "bold 24px Orbitron"; ctx.textAlign = "center";
      ctx.fillText(flashMsg, W/2, H/2 - 20);
    }

    if (frame < TOTAL_FRAMES) {
      matchAnimFrame = requestAnimationFrame(tick);
    } else {
      setTimeout(() => showMatchResult(result), 500);
    }
  }
  tick();
}


function buildMatchTimeline(result, W, H) {
  const scoreObj = parseScore(result.score);
  const ps = scoreObj.home;
  const es = scoreObj.away;
  const TOTAL = 420;
  const events = [];

  // Goal events
  const homeGoalFrames = distributeFrames(ps, TOTAL);
  const awayGoalFrames = distributeFrames(es, TOTAL);
  homeGoalFrames.forEach(f => events.push({ frame:f, type:"goal_home", ballTarget:{ x:W-15, y:H/2 } }));
  awayGoalFrames.forEach(f => events.push({ frame:f, type:"goal_away", ballTarget:{ x:15,   y:H/2 } }));


  // Skill events
  const skills = result.skillEvents || result.skills || [];
  if (skills.length) {
    skills.slice(0,3).forEach((sk, i) => {
      events.push({ frame: 40+i*80, type:"skill", text: sk.name || sk, ballTarget:{ x:W/2+Math.random()*80-40, y:H/2+Math.random()*60-30 } });
    });
  }

  // General events
  events.push({ frame:30,  type:"event", text:"⏱ Kick Off!" });
  events.push({ frame:210, type:"event", text:"⏱ Half Time" });
  events.push({ frame:400, type:"event", text:"⏱ Full Time" });

  events.sort((a,b) => a.frame-b.frame);
  return events;
}

function distributeFrames(count, total) {
  const frames = [];
  for (let i=0;i<count;i++) frames.push(Math.floor(80 + (i+1)*(total-160)/(count+1)));
  return frames;
}

function drawPlayerDot(ctx, x, y, color, name, isEnemy) {
  ctx.beginPath(); ctx.ellipse(x, y+12, 10, 4, 0, 0, Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI*2);
  ctx.fillStyle=color; ctx.fill();
  ctx.strokeStyle=isEnemy?"#ef4444":"#fff"; ctx.lineWidth=2; ctx.stroke();
  ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,0.35)"; ctx.fill();
  if (name && !isEnemy) {
    const short = name.split(" ")[0].substring(0,6);
    ctx.font="bold 8px Arial"; ctx.textAlign="center";
    const tw = ctx.measureText(short).width;
    ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x-tw/2-2,y-24,tw+4,12,2);
    else ctx.rect(x-tw/2-2,y-24,tw+4,12);
    ctx.fill();
    ctx.fillStyle="#fff"; ctx.fillText(short, x, y-14);
  }
}

function drawBall(ctx, x, y) {
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2);
  ctx.fillStyle="#fff"; ctx.fill();
  ctx.strokeStyle="#333"; ctx.lineWidth=1.5; ctx.stroke();
  // Pola bola
  ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2);
  ctx.fillStyle="#222"; ctx.fill();
}

function addMatchLog(text) {
  const log = document.getElementById("matchEventLog");
  if (!log) return;
  const div = document.createElement("div");
  div.className = "match-log-entry";
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  // Limit 5 entries
  while (log.children.length > 5) log.removeChild(log.firstChild);
}

function showMatchResult(res) {
  if (matchAnimFrame) { cancelAnimationFrame(matchAnimFrame); matchAnimFrame=null; }
  
  const scoreObj = parseScore(res.score);
  const ps = scoreObj.home;
  const es = scoreObj.away;
  const outcome = (ps > es) ? "KEMENANGAN!" : (ps < es) ? "KEKALAHAN" : "HASIL IMBANG";
  const icon = (ps > es) ? "🏆" : (ps < es) ? "💔" : "🤝";
  const color = (ps > es) ? "#22c55e" : (ps < es) ? "#ef4444" : "#facc15";


  // Create Overlay
  const overlay = document.createElement('div');
  overlay.className = 'match-result-overlay';
  overlay.style.setProperty('--res-color', color);

  // Highlights logic
  let highlightHtml = "";
  const allEvents = [
    ...(res.goalEvents || []).map(g => ({ ...g, _type: 'goal' })),
    ...(res.cardEvents || []).map(c => ({ ...c, _type: 'card' }))
  ].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  if (allEvents.length > 0) {
    highlightHtml = `<div class="match-highlights">
      <div class="hl-title">📋 Highlights Pertandingan</div>`;
    allEvents.forEach(ev => {
      const isHome = ev.team === "home";
      if (ev._type === 'goal') {
        highlightHtml += `
        <div class="hl-event">
          <span class="hl-min">${ev.minute}'</span>
          <span>⚽</span>
          <span class="hl-scorer">${ev.scorerName || (isHome ? "My Team" : res.enemyName)}</span>
          ${ev.assistName ? `<span class="hl-assist">🅰️ ${ev.assistName}</span>` : ""}
        </div>`;
      } else {
        const cardIcon = ev.type === "red" ? "🟥" : "🟨";
        highlightHtml += `
        <div class="hl-event">
          <span class="hl-min">${ev.minute}'</span>
          <span>${cardIcon}</span>
          <span class="hl-scorer">${ev.playerName || 'Player'}</span>
        </div>`;
      }
    });
    highlightHtml += `</div>`;
  } else {
    highlightHtml = `<div class="match-highlights"><div style="text-align:center;color:#94a3b8;font-size:12px">Tidak ada highlight besar</div></div>`;
  }

  // Rewards logic
  let rewardsHtml = `
    <div class="result-rewards">
      <div class="res-reward-item">💰 +${res.reward || 0}</div>
      ${res.premiumReward ? `<div class="res-reward-item">💎 +${res.premiumReward}</div>` : ""}
    </div>`;

  // Level Up & Injuries logic
  let extraInfoHtml = "";
  if (res.injuryEvents?.length) {
    extraInfoHtml += `<div style="color:#ef4444; font-size:12px; margin-bottom:10px;">
      ${res.injuryEvents.map(e => `🩹 ${e.name} cedera: ${e.type} (${e.matches} match)`).join("<br>")}
    </div>`;
  }
  if (res.levelUpEvents?.length) {
    extraInfoHtml += `<div style="color:#facc15; font-weight:bold; font-size:13px; margin-bottom:10px;">
      ${res.levelUpEvents.map(e => `⬆️ ${e.name} naik Level ${e.level}!`).join("<br>")}
    </div>`;
  }

  // Tournament End Logic
  let tournamentEndHtml = "";
  if (res.ligaFinished || res.seasonFinished || res.champion) {
    const title = res.champion ? "🏆 CHAMPIONS!" : "🏁 Musim Selesai";
    const bonus = res.ligaReward || (res.seasonResult?.coinReward) || 0;
    tournamentEndHtml = `
      <div style="background:rgba(255,215,0,0.1); border:1px solid #ffd700; border-radius:12px; padding:15px; margin-bottom:20px;">
        <div style="color:#ffd700; font-weight:800; font-size:14px; margin-bottom:5px;">${title}</div>
        <div style="font-size:12px;">Bonus Musim: +${bonus} 💰</div>
      </div>`;
  }

  const returnTo = res.returnTo || "liga";
  const returnLabel = { match: "🏆 Kompetisi", career: "⚽ Career", liga: "🏆 Liga", afc: "🏆 AFC", aff: "🌏 AFF", cups: "🎪 Special Cup", derby: "🔥 Derby" }[returnTo] || "🏠 Menu";
  const returnFn = { match: "showCompetitions()", career: "showCareer()", liga: "showLiga()", afc: "showAFC()", aff: "showAFF()", cups: "showCups()", derby: "showDerby()" }[returnTo] || "showLiga()";
  
  // Logic for "Main Lagi" button
  let mainLagiAction = "";
  if (returnTo === "match") {
    mainLagiAction = "showCompetitions()";
  } else if (returnTo === "career") {
    mainLagiAction = "playCareerMatch()"; // We need to define this or handle it
  } else if (returnTo === "liga" && res.ligaMatchIdx !== undefined) {
    mainLagiAction = `playMatch(${Number(res.ligaMatchIdx) + 1})`; // Next match
  } else {
    mainLagiAction = returnFn;
  }

  overlay.innerHTML = `
    <div class="result-card">
      <div class="result-header">${icon} ${outcome}</div>
      
      <div class="result-score-row">
        <div class="res-team">
          <img src="https://api.dicebear.com/7.x/identicon/svg?seed=myteam&backgroundColor=1e293b">
          <div class="res-team-name">${res.userTeam?.name || "My Team"}</div>
        </div>
        <div class="res-score-box">${ps} - ${es}</div>
        <div class="res-team">
          <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${res.enemyName}&backgroundColor=1e293b">
          <div class="res-team-name">${res.enemyName || "Enemy FC"}</div>
        </div>
      </div>

      ${rewardsHtml}
      ${tournamentEndHtml}
      ${extraInfoHtml}
      ${highlightHtml}

      <div class="result-actions">
        <button class="res-btn res-btn-secondary" onclick="this.closest('.match-result-overlay').remove(); ${returnFn}">${returnLabel}</button>
        ${["liga", "career", "cup", "afc", "aff"].includes(returnTo) ? 
          `<button class="res-btn res-btn-primary" onclick="this.closest('.match-result-overlay').remove(); ${mainLagiAction}">Main Lagi ⚽</button>` : ""}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  showStatus();
}

function loadLineupPanels() {
  fetch("/formation").then(r=>r.json()).then(d => {
    const list = document.getElementById("myLineupList");
    if (!list) return;
    const entries = Object.entries(d.lineup).filter(([,p])=>p);
    if (!entries.length) { list.innerHTML=`<div class="lineup-empty">Lineup kosong</div>`; return; }
    const roleOrd = { GK:0, DEF:1, MID:2, ATT:3 };
    entries.sort(([pa],[pb]) => (roleOrd[roleOrderFromPos(pa)]||0)-(roleOrd[roleOrderFromPos(pb)]||0));
    list.innerHTML = entries.map(([pos,p],i) => {
      const stBg = p.curStamina<30?"#ef444440":p.curStamina<60?"#f59e0b40":"transparent";
      const injBadge = p.injury ? `<span style="color:#ef4444;font-size:9px">🩹</span>` : "";
      return `<div class="lineup-row home-row" style="background:${stBg}">
        <span class="lineup-num">${i+1}</span>
        <span class="lineup-dot" style="background:${roleColor(roleOrderFromPos(pos))}"></span>
        <span class="lineup-name">${p.name}${injBadge}</span>
        <span class="lineup-pos">${pos}</span>
      </div>`;
    }).join("");

    const enemyList = document.getElementById("enemyLineupList");
    if (enemyList) {
      const eNames = ["Blaze","Thunder","Storm","Viper","Hawk","Frost","Nova","Rex","Titan","Ghost","Ace"];
      const positions = Object.keys(d.lineup).filter(k=>d.lineup[k]);
      enemyList.innerHTML = positions.map((pos,i)=>`
        <div class="lineup-row away-row">
          <span class="lineup-pos">${pos}</span>
          <span class="lineup-name">${eNames[i]||"Player"}</span>
          <span class="lineup-dot" style="background:#ef4444"></span>
          <span class="lineup-num">${i+1}</span>
        </div>`).join("");
    }
  });
}

function roleOrderFromPos(pos) {
  const p=pos.toUpperCase();
  if(p.startsWith("GK")) return "GK";
  if(p.includes("CB")||p==="LB"||p==="RB") return "DEF";
  if(p.includes("CM")||p.includes("DM")||p.includes("AM")||p==="LM"||p==="RM") return "MID";
  return "ATT";
}
function roleColor(r) { return {GK:"#facc15",DEF:"#3b82f6",MID:"#22c55e",ATT:"#ef4444"}[r]||"#fff"; }
function checkActiveBuff() {
  fetch("/status").then(r=>r.json()).then(d=>{
    const el=document.getElementById("matchBuffLabel");
    if(el&&d.activeBuff) el.textContent=`🔥 ${d.activeBuff.name} aktif (+${d.activeBuff.value})`;
  }).catch(()=>{});
}


/* =====================
   GACHA
===================== */
/* =====================
   GACHA — Event System
===================== */
const RARITY_RATE = { C:45, B:30, A:16, S:7, SS:1.5, SSR:0.5 };
const RARITY_COLOR = { C:"#94a3b8", B:"#3b82f6", A:"#a855f7", S:"#f59e0b", SS:"#f97316", SSR:"#ffd700" };
const RARITY_LABEL = { C:"Common", B:"Rare", A:"Epic", S:"Legend", SS:"Mythic", SSR:"SSR ✨" };
const UPGRADE_CFG = [
  {level:0,successRate:90,failDmg:0,  cost:80},
  {level:1,successRate:75,failDmg:5,  cost:140},
  {level:2,successRate:60,failDmg:10, cost:200},
  {level:3,successRate:45,failDmg:15, cost:280},
  {level:4,successRate:30,failDmg:20, cost:380},
  {level:5,successRate:25,failDmg:25, cost:500}
];
let gachaSkipFlag  = false;
let _currentGachaEvent = "standard";

function showGacha() {
  fetch("/gacha/events").then(r=>r.json()).then(({events}) => {
    content.innerHTML = `
    <div class="gacha-page-v2">

      <!-- KIRI: Banner list + pull controls -->
      <div class="gacha-left-col">
        <div class="gacha-left-header">
          <h2>🎰 Gacha</h2>
          <p style="color:#64748b;font-size:12px">Pilih banner</p>
        </div>

        <!-- Banner cards (vertikal list) -->
        <div class="gacha-banner-list">
          ${Object.values(events).map(ev => `
          <div class="gbl-card ${_currentGachaEvent===ev.id?'active':''}"
            id="gevCard_${ev.id}" onclick="selectGachaEvent('${ev.id}')">
            ${ev.badge?`<div class="gbl-badge" style="background:${ev.badgeColor}">${ev.badge}</div>`:""}
            <div class="gbl-icon">${ev.icon}</div>
            <div class="gbl-info">
              <div class="gbl-name">${ev.name}</div>
              <div class="gbl-desc">${ev.desc}</div>
            </div>
            <div class="gbl-price">
              ${ev.costType==="premiumCoin"
                ?`<span class="price-badge premium-price">💎${ev.cost}</span>`
                :`<span class="price-badge normal-price">💰${ev.cost}</span>`}
            </div>
          </div>`).join("")}
        </div>

        <!-- Pull controls (muncul setelah pilih banner) -->
        <div id="gachaPullControls" class="gacha-pull-controls"></div>

        <!-- History -->
        <div class="gacha-history-wrap" style="margin-top:12px">
          <div style="font-size:11px;color:#64748b;letter-spacing:1px;margin-bottom:6px">RIWAYAT PULL</div>
          <div id="historyList" class="gacha-history-list"></div>
        </div>
      </div>

      <!-- KANAN: Stage animasi BESAR -->
      <div class="gacha-right-col">
        <div id="gachaStageWrap" class="gacha-stage-wrap">
          <!-- Default state: banner art -->
          <div class="gacha-stage-default" id="gachaDefaultView">
            <div class="gsd-orb">🎰</div>
            <div class="gsd-title">GACHA CENTER</div>
            <div class="gsd-sub">Pilih banner & pull untuk mendapat equipment</div>
            <!-- Rate display -->
            <div class="gsd-rates" id="gachaRateDisplay">
              ${Object.entries(RARITY_RATE).map(([r,pct])=>`
              <div class="gsd-rate-item" style="border-color:${RARITY_COLOR[r]}20">
                <div class="gsd-rate-rarity" style="color:${RARITY_COLOR[r]}">${r}</div>
                <div class="gsd-rate-pct">${pct}%</div>
              </div>`).join("")}
            </div>
          </div>
          <!-- Animasi hasil pull ditaruh di sini -->
          <div id="gachaStage" class="gacha-stage-area"></div>
        </div>
      </div>

    </div>`;
    animateContent();
    selectGachaEvent(_currentGachaEvent);
    renderGachaHistory();
  });
}

function selectGachaEvent(id) {
  _currentGachaEvent = id;

  document.querySelectorAll(".gbl-card").forEach(c=>c.classList.remove("active"));
  const card = document.getElementById(`gevCard_${id}`);
  if (card) card.classList.add("active");

  fetch("/gacha/events").then(r=>r.json()).then(({events}) => {
    const ev = events[id];
    if (!ev) return;

    // Update rate display di kanan
    const baseRates = {C:45,B:30,A:16,S:7,SS:1.5,SSR:0.5};
    const rateDisp = document.getElementById("gachaRateDisplay");
    if (rateDisp) {
      rateDisp.innerHTML = Object.entries(baseRates).map(([r,base])=>{
        const boosted = ev.rateBoost?.[r] ? base*ev.rateBoost[r] : base;
        const isUp = ev.rateBoost?.[r] > 1;
        return `<div class="gsd-rate-item" style="border-color:${RARITY_COLOR[r]}30;background:${RARITY_COLOR[r]}08">
          <div class="gsd-rate-rarity" style="color:${RARITY_COLOR[r]}">${r}</div>
          <div class="gsd-rate-pct" style="color:${isUp?'#22c55e':'#64748b'}">${boosted.toFixed(1)}%${isUp?`<span style="font-size:9px;color:#22c55e"> ▲${ev.rateBoost[r]}x</span>`:""}</div>
        </div>`;
      }).join("");
    }

    // Update banner title
    const defView = document.getElementById("gachaDefaultView");
    if (defView) {
      const titleEl = defView.querySelector(".gsd-title");
      const subEl   = defView.querySelector(".gsd-sub");
      const orbEl   = defView.querySelector(".gsd-orb");
      if (titleEl) titleEl.textContent = ev.name.replace(/[🎉💎⚽🔧]/g,"").trim();
      if (subEl)   subEl.textContent   = ev.desc;
      if (orbEl)   orbEl.textContent   = ev.icon;
    }

    // Render pull controls di kiri bawah
    const cType = ev.costType==="premiumCoin"?"💎":"💰";
    const ctrl  = document.getElementById("gachaPullControls");
    if (ctrl) ctrl.innerHTML = `
      <div class="gpc-inner">
        <div class="gpc-event-name">${ev.icon} ${ev.name}</div>
        <div class="gacha-btns" style="margin-top:8px">
          <button class="gacha-btn-1x" id="gachaBtnSingle" onclick="rollGacha(1,'${id}')">
            Pull 1x<br><span style="font-size:11px">${cType} ${ev.cost}</span>
          </button>
          <button class="gacha-btn-10x" id="gachaBtnMulti" onclick="rollGacha(10,'${id}')">
            Pull 10x<br><span style="font-size:11px">${cType} ${ev.cost10} <small style="opacity:.6">hemat!</small></span>
          </button>
        </div>
      </div>`;
  });
}

const gachaHistory = [];

function renderGachaHistory() {
  const hl = document.getElementById("historyList");
  if (!hl) return;
  if (!gachaHistory.length) { hl.innerHTML=`<span style="color:#334155;font-size:12px">Belum ada pull</span>`; return; }
  hl.innerHTML = gachaHistory.slice(0,24).map(eq => `
    <div class="history-chip" style="border-color:${RARITY_COLOR[eq.rarity]||'#334155'};color:${RARITY_COLOR[eq.rarity]||'#fff'}"
      title="${eq.name} · ${eq.slot||eq.category||''} · ⚡${eq.power||''}">
      ${eq.icon||slotIcon(eq.slot)||"📦"} <span>${eq.name}</span>
    </div>`).join("");
}

async function rollGacha(times=1, eventId="standard") {
  const btnS = document.getElementById("gachaBtnSingle");
  const btnM = document.getElementById("gachaBtnMulti");
  if (btnS) btnS.disabled=true;
  if (btnM) btnM.disabled=true;

  const results = [];
  for (let i=0; i<times; i++) {
    const res = await fetch(`/gacha?event=${eventId}`).then(r=>r.json());
    if (res.error) { showToast("❌ "+res.error,"error"); break; }
    results.push(res.reward);
    if (i===0) showStatus();
  }

  if (btnS) btnS.disabled=false;
  if (btnM) btnM.disabled=false;
  if (!results.length) return;

  gachaHistory.unshift(...results);
  showStatus();
  renderGachaHistory();

  // Sembunyikan default view, tampilkan stage
  const defView = document.getElementById("gachaDefaultView");
  const stage   = document.getElementById("gachaStage");
  if (defView) defView.style.display = "none";
  if (stage)   stage.style.display   = "flex";

  if (times===1) await playGachaFlipSingle(results[0]);
  else           await playGachaFlip10(results);

  // Setelah animasi selesai: tampilkan tombol "Kembali"
  if (stage) {
    const backBtn = document.createElement("button");
    backBtn.textContent = "↩ Kembali ke Gacha";
    backBtn.className   = "gacha-back-btn";
    backBtn.onclick = () => {
      stage.innerHTML = "";
      stage.style.display = "none";
      if (defView) defView.style.display = "flex";
    };
    stage.appendChild(backBtn);
  }
}

/* Animasi flip 1 kartu — lebih besar di stage kanan */
async function playGachaFlipSingle(eq) {
  const stage = document.getElementById("gachaStage");
  if (!stage) return;

  gachaSkipFlag = false;
  const color = RARITY_COLOR[eq.rarity] || "#fff";
  const itemIcon = eq.icon || slotIcon(eq.slot) || "⚡";

  stage.innerHTML = `
    <div class="flip-scene-lg" id="flipScene">
      <div class="flip-card-lg" id="flipCard">
        <div class="flip-front">
          <div class="flip-front-inner" style="font-size:80px">❓</div>
          <div style="font-size:13px;color:#334155;margin-top:10px">Klik untuk buka</div>
        </div>
        <div class="flip-back" style="border-color:${color};box-shadow:0 0 40px ${color}50">
          <div class="flip-back-rarity" style="color:${color};font-size:18px;letter-spacing:2px">${RARITY_LABEL[eq.rarity]}</div>
          <div style="font-size:72px;margin:12px 0;filter:drop-shadow(0 0 16px ${eq.iconColor||color})">${itemIcon}</div>
          <div class="flip-back-name" style="font-size:18px">${eq.name}</div>
          <div class="flip-back-power" style="color:#facc15;font-size:16px">⚡ +${eq.power||""}</div>
          ${eq.slot?`<div class="flip-back-sub">${eq.slot} · ${eq.role}</div>`:""}
          ${renderBonusTags(eq)}
        </div>
      </div>
    </div>
    <button class="gacha-skip-btn" onclick="skipGachaAnim()">⏭ Skip</button>`;

  if (["S","SS","SSR"].includes(eq.rarity)) {
    spawnParticles(stage, color, eq.rarity==="SSR"?40:20);
  }

  await delay(900);
  if (gachaSkipFlag) { doInstantReveal(eq, color); return; }
  const card = document.getElementById("flipCard");
  if (card) card.classList.add("flipped");
  if (eq.rarity==="SSR") { await delay(300); if(!gachaSkipFlag) addSSRBeam(stage,color); }
} // end playGachaFlipSingle

/* Animasi flip 10 kartu — reveal satu-satu */
async function playGachaFlip10(results) {
  const stage = document.getElementById("gachaStage");
  if (!stage) return;

  gachaSkipFlag = false;

  stage.innerHTML = `
    <div class="flip10-grid" id="flip10Grid"></div>
    <button class="gacha-skip-btn" onclick="skipGachaAnim()">⏭ Skip All</button>`;

  const grid = document.getElementById("flip10Grid");

  // Render semua kartu tertutup dulu
  results.forEach((eq, i) => {
    const color = RARITY_COLOR[eq.rarity] || "#fff";
    const div = document.createElement("div");
    div.className = "flip10-card";
    div.id = `fc10_${i}`;
    div.innerHTML = `
      <div class="flip-card" id="fc10card_${i}">
        <div class="flip-front"><div class="flip-front-inner">❓</div></div>
        <div class="flip-back" style="border-color:${color};box-shadow:0 0 16px ${color}40">
          <div class="flip-back-rarity" style="color:${color};font-size:10px">${eq.rarity}</div>
          <div style="font-size:22px">${slotIcon(eq.slot)}</div>
          <div style="font-size:10px;font-weight:bold;margin:2px 0">${eq.name}</div>
          <div style="font-size:10px;color:#facc15">⚡${eq.power}</div>
        </div>
      </div>`;
    grid.appendChild(div);
  });

  // Reveal satu-satu
  for (let i = 0; i < results.length; i++) {
    if (gachaSkipFlag) break;
    await delay(220);
    const card = document.getElementById(`fc10card_${i}`);
    if (card) card.classList.add("flipped");
    if (["S","SS","SSR"].includes(results[i].rarity)) {
      const wrap = document.getElementById(`fc10_${i}`);
      if (wrap) wrap.classList.add("fc10-highlight");
    }
  }

  // Kalau skip, reveal semua sekaligus
  if (gachaSkipFlag) {
    results.forEach((_, i) => {
      const card = document.getElementById(`fc10card_${i}`);
      if (card) card.classList.add("flipped");
    });
  }
}

function skipGachaAnim() {
  gachaSkipFlag = true;
}

function doInstantReveal(eq, color) {
  const stage = document.getElementById("gachaStage");
  if (!stage) return;
  stage.innerHTML = `
    <div class="gacha-result-instant" style="border-color:${color};box-shadow:0 0 30px ${color}60">
      <div style="color:${color};font-weight:bold;font-size:16px">${RARITY_LABEL[eq.rarity]}</div>
      <div style="font-size:48px;margin:8px 0">${slotIcon(eq.slot)}</div>
      <div style="font-size:16px;font-weight:bold">${eq.name}</div>
      <div style="color:#facc15">⚡ +${eq.power}</div>
      <div style="color:#94a3b8;font-size:12px">${eq.slot} · ${eq.role}</div>
      ${renderBonusTags(eq)}
    </div>`;
}

function renderBonusTags(eq) {
  if (!eq.bonus && !eq.statTags) return "";
  let html = `<div class="gacha-bonus-tags">`;
  if (eq.bonus) {
    Object.entries(eq.bonus).forEach(([k,v]) => {
      const statName = { pace:"⚡Speed", shooting:"🎯Shot", passing:"🎲Pass", defense:"🛡Tackle", stamina:"💪Stam", mentality:"🧠Ment" }[k] || k;
      html += `<span class="bonus-tag">+${v} ${statName}</span>`;
    });
  }
  html += `</div>`;
  return html;
}

function spawnParticles(stage, color, count) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "gacha-particle";
    p.style.cssText = `
      left:${20 + Math.random()*60}%;
      top:${10 + Math.random()*80}%;
      background:${color};
      animation-delay:${Math.random()*1}s;
      width:${4+Math.random()*6}px;
      height:${4+Math.random()*6}px;`;
    stage.appendChild(p);
    setTimeout(() => p.remove(), 2500);
  }
}

function addSSRBeam(stage, color) {
  const beam = document.createElement("div");
  beam.className = "ssr-beam";
  beam.style.background = `radial-gradient(circle, ${color}80 0%, transparent 70%)`;
  stage.appendChild(beam);
  setTimeout(() => beam.remove(), 2000);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function slotIcon(slot) {
  const icons = { HEAD:"🪖", BODY:"👕", HAND:"🧤", FEET:"👟", ACC:"💍" };
  return icons[slot] || "📦";
}

/* =====================
   SVG MANEKIN
   Slot body parts di-overlay per equipment
===================== */
function buildMannequinSVG(equipment, inventory) {
  // Cari equipment yang dipakai per slot
  const worn = {};
  Object.entries(equipment || {}).forEach(([slot, id]) => {
    if (!id) return;
    const eq = inventory.find(e => String(e.id) === String(id));
    if (eq) worn[slot] = eq;
  });

  const headColor  = worn.HEAD ? "#facc15" : "#94a3b8";
  const bodyColor  = worn.BODY ? "#3b82f6" : "#94a3b8";
  const handColor  = worn.HAND ? "#a855f7" : "#94a3b8";
  const feetColor  = worn.FEET ? "#22c55e" : "#94a3b8";
  const accColor   = worn.ACC  ? "#f97316" : "#94a3b8";
  const skinColor  = "#c8b4a0";
  const skinDark   = "#b0967e";

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 280" width="120" height="280">

    <!-- ===== KEPALA ===== -->
    <!-- Helm / HEAD equipment -->
    ${worn.HEAD ? `
    <ellipse cx="60" cy="24" rx="24" ry="14" fill="${headColor}" opacity="0.9"/>
    <rect x="36" y="30" width="48" height="8" rx="4" fill="${headColor}" opacity="0.7"/>
    <text x="60" y="22" text-anchor="middle" font-size="9" fill="#000" font-weight="bold">🪖</text>
    ` : ""}
    <!-- Kepala -->
    <ellipse cx="60" cy="38" rx="20" ry="22" fill="${skinColor}"/>
    <ellipse cx="60" cy="32" rx="20" ry="16" fill="${skinDark}" opacity="0.15"/>
    <!-- Wajah -->
    <ellipse cx="53" cy="36" rx="3" ry="3.5" fill="#555"/>
    <ellipse cx="67" cy="36" rx="3" ry="3.5" fill="#555"/>
    <path d="M53,46 Q60,51 67,46" stroke="#555" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <!-- Telinga -->
    <ellipse cx="40" cy="38" rx="5" ry="7" fill="${skinDark}"/>
    <ellipse cx="80" cy="38" rx="5" ry="7" fill="${skinDark}"/>

    <!-- ===== LEHER ===== -->
    <rect x="54" y="58" width="12" height="12" rx="3" fill="${skinColor}"/>

    <!-- ===== BADAN ===== -->
    <!-- Jersey / BODY -->
    <rect x="34" y="70" width="52" height="62" rx="8"
      fill="${worn.BODY ? bodyColor : skinColor}"
      opacity="${worn.BODY ? 0.95 : 1}"/>
    ${worn.BODY ? `
    <text x="60" y="104" text-anchor="middle" font-size="18" opacity="0.7">👕</text>
    ` : `
    <ellipse cx="48" cy="85" rx="4" ry="2" fill="${skinDark}" opacity="0.2"/>
    <ellipse cx="72" cy="85" rx="4" ry="2" fill="${skinDark}" opacity="0.2"/>
    `}

    <!-- ===== TANGAN KIRI ===== -->
    <!-- Sarung tangan / HAND -->
    <rect x="14" y="72" width="18" height="46" rx="9"
      fill="${worn.HAND ? handColor : skinColor}"
      opacity="${worn.HAND ? 0.9 : 1}"/>
    ${worn.HAND ? `<text x="23" y="100" text-anchor="middle" font-size="12" opacity="0.8">🧤</text>` : ""}
    <!-- Jari -->
    <rect x="14" y="112" width="4" height="12" rx="2" fill="${worn.HAND ? handColor : skinColor}"/>
    <rect x="19" y="114" width="4" height="13" rx="2" fill="${worn.HAND ? handColor : skinColor}"/>
    <rect x="24" y="114" width="4" height="12" rx="2" fill="${worn.HAND ? handColor : skinColor}"/>

    <!-- ===== TANGAN KANAN ===== -->
    <rect x="88" y="72" width="18" height="46" rx="9"
      fill="${worn.HAND ? handColor : skinColor}"
      opacity="${worn.HAND ? 0.9 : 1}"/>
    ${worn.HAND ? `<text x="97" y="100" text-anchor="middle" font-size="12" opacity="0.8">🧤</text>` : ""}
    <rect x="88" y="112" width="4" height="12" rx="2" fill="${worn.HAND ? handColor : skinColor}"/>
    <rect x="93" y="114" width="4" height="13" rx="2" fill="${worn.HAND ? handColor : skinColor}"/>
    <rect x="98" y="114" width="4" height="12" rx="2" fill="${worn.HAND ? handColor : skinColor}"/>

    <!-- ===== ACC (Cincin/aksesoris) ===== -->
    ${worn.ACC ? `
    <circle cx="19" cy="110" r="4" fill="none" stroke="${accColor}" stroke-width="2.5"/>
    <circle cx="101" cy="110" r="4" fill="none" stroke="${accColor}" stroke-width="2.5"/>
    <text x="60" y="72" text-anchor="middle" font-size="9" fill="${accColor}" font-weight="bold">◆ ACC</text>
    ` : ""}

    <!-- ===== PINGGUL / CELANA ===== -->
    <rect x="36" y="130" width="48" height="28" rx="6"
      fill="${worn.BODY ? bodyColor : "#475569"}" opacity="0.8"/>

    <!-- ===== PAHA KIRI ===== -->
    <rect x="38" y="156" width="20" height="40" rx="8"
      fill="${worn.FEET ? feetColor : skinColor}" opacity="${worn.FEET ? 0.6 : 1}"/>

    <!-- ===== PAHA KANAN ===== -->
    <rect x="62" y="156" width="20" height="40" rx="8"
      fill="${worn.FEET ? feetColor : skinColor}" opacity="${worn.FEET ? 0.6 : 1}"/>

    <!-- ===== BETIS KIRI ===== -->
    <rect x="40" y="192" width="16" height="36" rx="6"
      fill="${worn.FEET ? feetColor : skinColor}" opacity="${worn.FEET ? 0.7 : 1}"/>

    <!-- ===== BETIS KANAN ===== -->
    <rect x="64" y="192" width="16" height="36" rx="6"
      fill="${worn.FEET ? feetColor : skinColor}" opacity="${worn.FEET ? 0.7 : 1}"/>

    <!-- ===== SEPATU / FEET ===== -->
    <rect x="33" y="224" width="24" height="14" rx="7"
      fill="${worn.FEET ? feetColor : "#334155"}"/>
    <rect x="63" y="224" width="24" height="14" rx="7"
      fill="${worn.FEET ? feetColor : "#334155"}"/>
    ${worn.FEET ? `
    <text x="45" y="234" text-anchor="middle" font-size="10">👟</text>
    <text x="75" y="234" text-anchor="middle" font-size="10">👟</text>
    ` : ""}

    <!-- Legend bawah -->
    ${Object.keys(worn).length > 0 ? `
    <rect x="10" y="248" width="100" height="24" rx="5" fill="rgba(0,0,0,0.4)"/>
    <text x="60" y="263" text-anchor="middle" font-size="8" fill="#aaa">
      ${Object.values(worn).map(e => e.name.split(" ")[0]).join(" · ")}
    </text>
    ` : `
    <text x="60" y="260" text-anchor="middle" font-size="9" fill="#64748b">No Equipment</text>
    `}
  </svg>`;
}

/* =====================
   PLAYER POPUP (klik kartu player)
===================== */
function openPlayerPopup(playerId, teamData) {
  const p = teamData.team.find(x => x.id == playerId);
  if (!p) return;

  // Hapus popup lama
  document.getElementById("playerPopupOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "playerPopupOverlay";
  overlay.className = "popup-overlay";
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const svgHtml = buildMannequinSVG(p.equipment, teamData.inventory);
  const roleLabel = p.role || p.type || "?";
  const rarityColors = { C:"#94a3b8", B:"#3b82f6", A:"#a855f7", S:"#f59e0b", SSR:"gold" };
  const rc = rarityColors[p.rarity] || "#fff";

  overlay.innerHTML = `
  <div class="popup-box">
    <button class="popup-close" onclick="document.getElementById('playerPopupOverlay').remove()">✕</button>

    <div class="popup-header" style="border-color:${rc}">
      <div>
        <h2 style="margin:0;color:${rc}">${p.name}</h2>
        <div style="color:#94a3b8;font-size:13px">${roleLabel} · Rarity <b style="color:${rc}">${p.rarity}</b></div>
        <div style="font-size:22px;color:#facc15;font-weight:bold;margin-top:4px">⚡ ${p.power}</div>
      </div>
    </div>

    <div class="popup-body">

      <!-- Manekin SVG -->
      <div class="popup-mannequin">
        <div class="mannequin-wrap">
          ${svgHtml}
        </div>
        <div class="mannequin-legend">
          ${["HEAD","BODY","HAND","FEET","ACC"].map(s => {
            const eqId = p.equipment?.[s];
            const eq = eqId ? teamData.inventory.find(e => String(e.id) === String(eqId)) : null;
            return `<div class="mq-slot ${eq ? "mq-has" : ""}">
              ${slotIcon(s)} ${eq ? `<span title="${eq.name}">${eq.name.split(" ")[0]}</span>` : `<span style="opacity:0.4">${s}</span>`}
            </div>`;
          }).join("")}
        </div>
      </div>

      <!-- Stats -->
      <div class="popup-stats">
        <h3 style="margin:0 0 10px;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:1px">Stats</h3>
        ${[
          ["👟","Pace",    p.finalStats.pace],
          ["🎯","Shooting",p.finalStats.shooting],
          ["🎲","Passing", p.finalStats.passing],
          ["🛡️","Defense", p.finalStats.defense],
          ["💪","Stamina", p.finalStats.stamina],
          ["🧠","Mentality",p.finalStats.mentality]
        ].map(([icon, label, val]) => {
          const pct = Math.min(100, Math.floor(val));
          const barColor = pct >= 80 ? "#22c55e" : pct >= 60 ? "#facc15" : pct >= 40 ? "#f97316" : "#ef4444";
          return `
          <div class="stat-bar-row">
            <span class="stat-bar-label">${icon} ${label}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <span class="stat-bar-val">${Math.floor(val)}</span>
          </div>`;
        }).join("")}

        <div style="margin-top:14px;border-top:1px solid #1e293b;padding-top:10px">
          <h3 style="margin:0 0 8px;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:1px">Equipment</h3>
          ${["HEAD","BODY","HAND","FEET","ACC"].map(s => {
            const eqId = p.equipment?.[s];
            const eq = eqId ? teamData.inventory.find(e => String(e.id) === String(eqId)) : null;
            return `<div class="popup-eq-row ${eq ? "" : "empty"}">
              <span>${slotIcon(s)}</span>
              <span>${eq ? eq.name : `—`}</span>
              ${eq ? `<span style="color:#facc15">⚡${eq.power}</span>` : ""}
            </div>`;
          }).join("")}
        </div>
      </div>

    </div>
  </div>`;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add("popup-visible"), 10);
}

/* =====================
   TEAM + EQUIPMENT
===================== */
function dragEquip(id, slot) {
  dragEquipId   = id;
  dragEquipSlot = slot;
}

// FIX BUG 8: dropEquip sekarang tahu slot targetnya
function dropEquip(playerId, targetSlot) {
  if (!dragEquipId) return;

  fetch("/equip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId,
      equipmentId: dragEquipId,
      slot: targetSlot
    })
  }).then(r => r.json()).then(res => {
    dragEquipId = null;
    dragEquipSlot = null;
    if (res.error) {
      showToast("❌ " + res.error, "error");
    } else {
      showToast("✅ Equipment dipasang!", "success");
      const active = document.querySelector(".nav-btn.active")?.id || "";
      if (active === "navInventory") showInventory();
      else showTeam();
    }
  });
}

function unequipSlot(playerId, slot) {
  fetch("/unequip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, slot })
  }).then(() => {
    showToast("🗑️ Equipment dilepas", "info");
    const active = document.querySelector(".nav-btn.active")?.id || "";
    if (active === "navInventory") showInventory();
    else showTeam();
  });
}

function useConsumable(id) {
  fetch("/use-consumable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  }).then(r => r.json()).then(res => {
    if (res.error) { showToast("❌ " + res.error, "error"); return; }
    const msg = res.msg || (res.buff ? `🔥 ${res.buff.name} aktif!` : "✅ Item digunakan!");
    showToast(msg, "success");
    showStatus();
    const active = document.querySelector(".nav-btn.active")?.id || "";
    if (active === "navInventory") showInventory();
    else showTeam();
  });
}

/* =====================
   FORMATION
   FIX: semua formasi punya map, bench check fix
===================== */
function _benchSortKey(p, mode) {
  if (mode === "stamina") return -(p.curStamina ?? 100);
  if (mode === "rarity") { const r = {SSR:0,SR:1,A:2,B:3,C:4}; return (r[p.rarity]??5); }
  return -(p.currentPower || p.power || 0); // default: stat/power
}
let _benchSortMode = "stat";

function showFormation() {
  fetch("/formation").then(r => r.json()).then(d => {
    const posMap = getPositionMap(d.formation);
    const ROLE_COLORS = { GK:"#facc15", DEF:"#3b82f6", MID:"#22c55e", ATT:"#ef4444" };
    function posRole(pos) {
      if(pos.startsWith("GK")) return "GK";
      if(["LB","CB1","CB2","CB3","RB"].includes(pos)) return "DEF";
      if(["DM1","DM2","CM1","CM2","CM3","AM1","AM2","AM3","LM","RM"].includes(pos)) return "MID";
      return "ATT";
    }

    let html = `
    <div class="formation-header">
      <button class="formation-auto-btn" onclick="autoAI()">🤖 Auto Lineup</button>
      <select id="formationSelect" onchange="changeFormation()" class="formation-select">
        ${["4-3-3","4-4-2","4-2-3-1","3-5-2","5-3-2"].map(f =>
          `<option value="${f}" ${f===d.formation?"selected":""}>${f}</option>`).join("")}
      </select>
      <span class="formation-label">Formasi: <b>${d.formation}</b></span>
      <span class="formation-total">👥 ${d.players.length + Object.values(d.lineup).filter(Boolean).length} pemain</span>
    </div>
    <div class="formation-layout">
      <div class="formation-field-wrap">
        <div class="field-v2">
          <div class="field-lines">
            <div class="field-line field-mid"></div>
            <div class="field-circle"></div>
            <div class="field-box field-box-left"></div>
            <div class="field-box field-box-right"></div>
          </div>`;

    Object.entries(posMap).forEach(([pos, style]) => {
      const p = d.lineup[pos];
      const role = posRole(pos);
      const color = ROLE_COLORS[role];
      html += `<div class="fv2-pos" style="top:${style.top};left:${style.left};"
        ondragover="event.preventDefault()" ondrop="dropPlayer('${pos}')">`;
      if (p) {
        const stamPct = p.curStamina ?? 100;
        const injIcon = p.injury ? "🩹" : "";
        html += `<div class="fv2-card" draggable="true" ondragstart="dragPlayer(${p.id},'${pos}')"
          title="${p.name} — ⚡${p.power} | ${pos}" style="--role-color:${color}">
          <div class="fv2-role-bar" style="background:${color}"></div>
          <img class="fv2-avatar" src="${p.image||'https://i.imgur.com/8QfQYpL.png'}">
          <div class="fv2-name">${p.name.split(" ")[0]}${injIcon}</div>
          <div class="fv2-power" style="color:${color}">⚡${p.power}</div>
          <div class="fv2-stam-bar"><div style="width:${stamPct}%;background:${stamPct>60?"#22c55e":stamPct>30?"#f59e0b":"#ef4444"}"></div></div>
        </div>`;
      } else {
        html += `<div class="fv2-empty" ondragover="event.preventDefault()" ondrop="dropPlayer('${pos}')"
          style="--role-color:${color}"><span>${pos}</span></div>`;
      }
      html += `</div>`;
    });

    html += `</div></div>
      <div class="formation-bench-panel">
        <div class="bench-panel-title">🪑 BENCH</div>
        <div class="bench-sort-bar">
          <span style="font-size:10px;color:#4a8860;margin-right:6px">Urutkan:</span>
          <button class="bench-sort-btn ${_benchSortMode==='stat'?'active':''}" onclick="setBenchSort('stat')">⚡ Power</button>
          <button class="bench-sort-btn ${_benchSortMode==='stamina'?'active':''}" onclick="setBenchSort('stamina')">💪 Stamina</button>
          <button class="bench-sort-btn ${_benchSortMode==='rarity'?'active':''}" onclick="setBenchSort('rarity')">⭐ Rarity</button>
        </div>`;

    const usedIds = new Set(Object.values(d.lineup).filter(Boolean).map(v=>String(v.id||v)));
    const benchPlayers = d.players.filter(p => !usedIds.has(String(p.id)));
    const ROLE_LABELS = { GK:"GK", DEF:"DEF", MID:"MID", ATT:"ATT" };
    const roleOrder = { GK:0, DEF:1, MID:2, ATT:3 };
    const roleGroup = r => { r=(r||"").toUpperCase(); if(r==="GK")return"GK"; if(["CB","LB","RB","DEF"].some(x=>r.includes(x)))return"DEF"; if(["CM","DM","AM","LM","RM","MID"].some(x=>r.includes(x)))return"MID"; return"ATT"; };

    // Feature #1: Sort by selected mode
    const sorted = [...benchPlayers].sort((a,b) => {
      const ka = _benchSortKey(a, _benchSortMode);
      const kb = _benchSortKey(b, _benchSortMode);
      if (ka !== kb) return ka - kb;
      // Secondary: role order
      return (roleOrder[roleGroup(a.role)]||0)-(roleOrder[roleGroup(b.role)]||0);
    });

    sorted.forEach(p => {
      const rg = roleGroup(p.role||p.type);
      const color = ROLE_COLORS[rg]||"#fff";
      const stamPct = p.curStamina ?? 100;
      html += `<div class="bench-card-v2" draggable="true" ondragstart="dragPlayer(${p.id},null)"
        title="${p.name} — ${p.role||p.type} — ⚡${p.power}">
        <div class="bcv2-role-dot" style="background:${color}"></div>
        <img class="bcv2-avatar" src="${p.image||'https://i.imgur.com/8QfQYpL.png'}">
        <div class="bcv2-info">
          <div class="bcv2-name">${p.name}</div>
          <div class="bcv2-sub" style="color:${color}">${p.role||p.type} · ⚡${p.power}</div>
          <div class="bcv2-stam"><div style="width:${stamPct}%;background:${stamPct>60?"#22c55e":stamPct>30?"#f59e0b":"#ef4444"}"></div></div>
        </div>
      </div>`;
    });

    html += `</div></div>`;
    content.innerHTML = html;
    animateContent();
  });
}

function dragPlayer(id, from) {
  dragPlayerData = { id, from };
}

function dropPlayer(pos) {
  if (!dragPlayerData) return;

  fetch("/formation/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position: pos, playerId: dragPlayerData.id })
  }).then(r => r.json()).then(res => {
    dragPlayerData = null;
    if (res.error) {
      showToast("❌ " + res.error, "error");
    } else {
      showFormation();
    }
  });
}

function autoAI() {
  fetch("/formation/auto", { method: "POST" })
    .then(r => r.json())
    .then(() => {
      showToast("🤖 Auto lineup selesai!", "success");
      showFormation();
    });
}

// Feature #1: Bench sort
function setBenchSort(mode) {
  _benchSortMode = mode;
  showFormation();
}

// FIX BUG 5: Ganti formasi
function changeFormation() {
  const sel = document.getElementById("formationSelect");
  if (!sel) return;

  fetch("/formation/change", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formation: sel.value })
  }).then(r => r.json()).then(res => {
    if (res.error) { showToast("❌ " + res.error, "error"); return; }
    showToast(`✅ Formasi diganti ke ${res.formation}`, "success");
    showFormation();
  });
}

/* =====================
   SHOP — Redesign Total
   Grid kartu item, preview sticky, klik item bisa ganti
===================== */
let _shopTab     = "equipment";
let _shopRoleTab = "ALL";
let _shopConsTab = "ALL";
let _shopSelectedId = null;

function showShop() {
  content.innerHTML = `
  <div class="shop-page">
    <!-- Header -->
    <div class="shop-page-header">
      <h2>🛒 Shop</h2>
      <div class="shop-currency-info">
        <span class="shop-cur normal"><span>💰</span> Normal Coin</span>
        <span class="shop-cur premium"><span>💎</span> Premium Coin</span>
      </div>
    </div>

    <!-- Main tab switcher -->
    <div class="shop-main-tabs">
      <button class="smt-btn ${_shopTab==='equipment'?'active':''}" onclick="switchShopTab('equipment')">
        ⚔️ Equipment
      </button>
      <button class="smt-btn ${_shopTab==='consumable'?'active':''}" onclick="switchShopTab('consumable')">
        💊 Consumable
      </button>
    </div>

    <!-- Content area -->
    <div id="shopTabContent"></div>
  </div>`;
  animateContent();
  _loadShopTabContent();
}

function switchShopTab(tab) {
  _shopTab = tab;
  _shopSelectedId = null;
  document.querySelectorAll(".smt-btn").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
  _loadShopTabContent();
}

function _loadShopTabContent() {
  if (_shopTab === "equipment") _loadEquipmentShop();
  else _loadConsumableShop();
}

function _loadEquipmentShop() {
  fetch("/shop/equipment").then(r=>r.json()).then(items => {
    const roles    = ["ALL","GK","DEF","MID","ATT","PREMIUM"];
    const roleColors = {ALL:"#64748b",GK:"#facc15",DEF:"#3b82f6",MID:"#22c55e",ATT:"#ef4444",PREMIUM:"#a855f7"};
    const container = document.getElementById("shopTabContent");
    if (!container) return;

    const filtered = _shopRoleTab === "ALL"
      ? items
      : _shopRoleTab === "PREMIUM"
      ? items.filter(i=>i.premium)
      : items.filter(i=>i.role===_shopRoleTab||i.role==="ALL");

    container.innerHTML = `
    <div class="equip-shop-layout">

      <!-- Kiri: filter + grid -->
      <div class="equip-shop-left">

        <!-- Role filter pills -->
        <div class="equip-role-bar">
          ${roles.map(r => {
            const cnt = r==="ALL"?items.length:r==="PREMIUM"?items.filter(i=>i.premium).length:items.filter(i=>i.role===r||i.role==="ALL").length;
            const isActive = _shopRoleTab===r;
            const rc = roleColors[r]||"#64748b";
            return `<button class="erp-btn ${isActive?'active':''}"
              style="${isActive?`border-color:${rc};background:${rc}18;color:${rc}`:''}"
              onclick="_shopFilterRole('${r}')">
              ${_roleIcon(r)} ${r}
              <span class="erp-cnt">${cnt}</span>
            </button>`;
          }).join("")}
        </div>

        <!-- Item grid cards -->
        <div class="equip-item-grid" id="equipItemGrid">
          ${filtered.map(i => {
            const rc = RARITY_COLOR[i.rarity]||"#64748b";
            const isPremium = i.premium||(i.premiumPrice>0&&!i.price);
            const isSelected = _shopSelectedId === i.id;
            return `
            <div class="equip-card ${isSelected?'selected':''}"
              style="--rc:${rc}"
              onclick="selectShopItem(${JSON.stringify(i).replace(/"/g,'&quot;')})">

              <!-- Rarity glow top bar -->
              <div class="ec-rarity-bar" style="background:${rc}"></div>

              <!-- Item icon area -->
              <div class="ec-icon-area" style="background:radial-gradient(circle at 50% 40%,${rc}22,transparent 70%)">
                <div class="ec-icon" style="filter:drop-shadow(0 0 8px ${i.iconColor||rc})">${i.icon||slotIcon(i.slot)||"⚡"}</div>
                ${isPremium?`<div class="ec-premium-badge">💎</div>`:""}
                ${isSelected?`<div class="ec-selected-mark">✓</div>`:""}
              </div>

              <!-- Info -->
              <div class="ec-info">
                <div class="ec-name">${i.name}</div>
                <div class="ec-rarity" style="color:${rc}">${RARITY_LABEL[i.rarity]||i.rarity}</div>
                <div class="ec-slot-role">${i.slot} · ${i.role}</div>
                <div class="ec-power">⚡ ${i.power}</div>
              </div>

              <!-- Price -->
              <div class="ec-price">
                ${isPremium
                  ? `<span class="price-badge premium-price">💎 ${i.premiumPrice}</span>`
                  : `<span class="price-badge normal-price">💰 ${i.price}</span>`}
              </div>
            </div>`;
          }).join("")}
          ${filtered.length===0?`<div style="color:#334155;padding:30px;text-align:center">Tidak ada item di kategori ini</div>`:""}
        </div>
      </div>

      <!-- Kanan: preview panel sticky -->
      <div class="equip-preview-panel" id="shopPreviewCol">
        <div class="epp-empty">
          <div style="font-size:56px;opacity:0.15">🛒</div>
          <p style="color:#334155;font-size:13px;margin-top:8px">Pilih item untuk<br>melihat detail</p>
        </div>
      </div>

    </div>`;
  });
}

/* Klik item → update preview, highlight kartu, bisa ganti */
function selectShopItem(item) {
  _shopSelectedId = item.id;

  // Update highlight semua kartu
  document.querySelectorAll(".equip-card").forEach(c => c.classList.remove("selected"));
  // Cari card yang dipilih dan highlight
  document.querySelectorAll(".equip-card").forEach(c => {
    if (c.querySelector(".ec-name")?.textContent.trim() === item.name) {
      c.classList.add("selected");
      // Tambah centang
      const area = c.querySelector(".ec-icon-area");
      if (area && !area.querySelector(".ec-selected-mark")) {
        const m = document.createElement("div");
        m.className = "ec-selected-mark"; m.textContent = "✓";
        area.appendChild(m);
      }
    } else {
      c.querySelector(".ec-selected-mark")?.remove();
    }
  });

  // Render preview
  _renderItemPreview(item);
}

function _renderItemPreview(item) {
  const col = document.getElementById("shopPreviewCol");
  if (!col) return;

  const rc = RARITY_COLOR[item.rarity]||"#64748b";
  const isPremium = item.premium||(item.premiumPrice>0&&!item.price);
  const isEquip   = !!item.slot;
  const fakeEquip = isEquip ? { [item.slot]:"preview" } : {};
  const fakeInv   = isEquip ? [{ id:"preview", ...item }] : [];
  const svgHtml   = isEquip ? buildMannequinSVG(fakeEquip, fakeInv) : "";

  col.innerHTML = `
  <div class="epp-content">

    <!-- Header item -->
    <div class="epp-header" style="border-bottom:2px solid ${rc}30">
      <div class="epp-icon" style="filter:drop-shadow(0 0 12px ${item.iconColor||rc})">${item.icon||slotIcon(item.slot)||"⚡"}</div>
      <div>
        <div class="epp-name">${item.name}</div>
        <div class="epp-rarity" style="color:${rc}">${RARITY_LABEL[item.rarity]||item.rarity}${isPremium?' <span class="prem-tag">PREMIUM</span>':''}</div>
        ${isEquip?`<div style="font-size:11px;color:#64748b;margin-top:2px">${item.slot} · ${item.role}</div>`:""}
      </div>
    </div>

    <!-- Manekin SVG (equipment only) -->
    ${isEquip?`
    <div class="epp-mannequin">
      ${svgHtml}
    </div>`:""}

    <!-- Power -->
    ${item.power?`<div class="epp-power">⚡ Power <b style="color:#facc15">+${item.power}</b></div>`:""}

    <!-- Bonus stats -->
    ${item.bonus?`
    <div class="epp-stats">
      <div class="epp-stats-title">BONUS STATS</div>
      ${Object.entries(item.bonus).map(([k,v])=>{
        const label={pace:"⚡ Speed",shooting:"🎯 Shooting",passing:"🎲 Passing",defense:"🛡 Defense",stamina:"💪 Stamina",mentality:"🧠 Mentality"}[k]||k;
        const pct=Math.min(100,v*2);
        const bc=v>=20?"#22c55e":v>=12?"#facc15":"#3b82f6";
        return `<div class="epp-stat-row">
          <span class="epp-stat-label">${label}</span>
          <div class="epp-stat-track"><div style="width:${pct}%;background:${bc}"></div></div>
          <span class="epp-stat-val" style="color:${bc}">+${v}</span>
        </div>`;
      }).join("")}
    </div>`:""}

    <!-- Tags -->
    ${item.statTags?`
    <div class="epp-tags">
      ${item.statTags.map(t=>`<span class="stag">${t.replace(/_/g," ")}</span>`).join("")}
    </div>`:""}

    <!-- Desc (consumable) -->
    ${item.desc?`<div class="epp-desc">${item.desc}</div>`:""}

    <!-- Buy button -->
    <div class="epp-buy-area">
      <div class="epp-price">
        ${isPremium
          ?`<span class="price-badge premium-price" style="font-size:15px">💎 ${item.premiumPrice} Premium</span>`
          :`<span class="price-badge normal-price" style="font-size:15px">💰 ${item.price} Coin</span>`}
      </div>
      <button class="epp-buy-btn" style="border-color:${rc};color:${rc}" onclick="buyItem('${item.id}')">
        ${isPremium?"💎":"💰"} Beli Sekarang
      </button>
    </div>

  </div>`;
}

function _loadConsumableShop() {
  fetch("/shop/consumable").then(r=>r.json()).then(items => {
    const cats = ["ALL","stamina","injury","repair","upgrade","boost","exp"];
    const catMeta = {
      ALL:    {label:"Semua",     icon:"📦"},
      stamina:{label:"Stamina",   icon:"⚡"},
      injury: {label:"Cedera",    icon:"🩹"},
      repair: {label:"Repair",    icon:"🔧"},
      upgrade:{label:"Upgrade",   icon:"💎"},
      boost:  {label:"Boost",     icon:"🚀"},
      exp:    {label:"EXP",       icon:"📚"}
    };

    const filtered = _shopConsTab==="ALL" ? items : items.filter(i=>i.category===_shopConsTab);

    document.getElementById("shopTabContent").innerHTML = `
    <div class="cons-shop-layout">

      <!-- Sidebar kategori -->
      <div class="cons-cat-sidebar">
        ${cats.map(c => {
          const cnt = c==="ALL"?items.length:items.filter(i=>i.category===c).length;
          const m   = catMeta[c]||{label:c,icon:"📦"};
          const isActive = _shopConsTab===c;
          return `<button class="ccs-btn ${isActive?'active':''}" onclick="_shopFilterCons('${c}')">
            <span class="ccs-icon">${m.icon}</span>
            <span class="ccs-label">${m.label}</span>
            <span class="ccs-cnt">${cnt}</span>
          </button>`;
        }).join("")}
      </div>

      <!-- Item grid (bukan list!) -->
      <div class="cons-items-grid-new">
        ${filtered.map(i => {
          const rc = RARITY_COLOR[i.rarity]||"#64748b";
          const isPremium = i.premium||(i.premiumPrice>0&&!i.price);
          return `
          <div class="cons-card-new" style="--rc:${rc}">
            <div class="ccn-top">
              <div class="ccn-icon" style="background:${rc}18;border:1px solid ${rc}30">${i.icon||"⚡"}</div>
              <div class="ccn-rarity" style="color:${rc}">${RARITY_LABEL[i.rarity]||i.rarity}${isPremium?' <span class="prem-tag">P</span>':''}</div>
            </div>
            <div class="ccn-name">${i.name}</div>
            <div class="ccn-desc">${i.desc||""}</div>
            <div class="ccn-bottom">
              ${isPremium
                ?`<span class="price-badge premium-price">💎 ${i.premiumPrice}</span>`
                :`<span class="price-badge normal-price">💰 ${i.price}</span>`}
              <button class="ccn-buy" onclick="buyItem('${i.id}')">Beli</button>
            </div>
          </div>`;
        }).join("")}
        ${filtered.length===0?`<p style="color:#334155;padding:20px">Tidak ada item</p>`:""}
      </div>

    </div>`;
  });
}

function _shopFilterRole(role) { _shopRoleTab=role; _shopSelectedId=null; _loadEquipmentShop(); }
function _shopFilterCons(cat)  { _shopConsTab=cat;  _loadConsumableShop(); }

// Legacy support
function previewShopItem(item) { selectShopItem(item); }

function buyItem(id) {
  fetch("/buy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  }).then(r => r.json()).then(res => {
    if (res.error) {
      showToast("❌ " + res.error, "error");
    } else {
      showToast("✅ Item berhasil dibeli!", "success");
      showStatus();
      const col = document.getElementById("shopPreviewCol");
      if (col) { col.style.animation = "buyFlash 0.4s ease"; setTimeout(() => col.style.animation="", 400); }
    }
  });
}

/* =====================
   INVENTORY — Menu Terpisah
   Fitur: filter role, upgrade, repair, lihat detail
===================== */
let _invFilter = "ALL";
let _invSort   = "rarity";

function showInventory() {
  fetch("/team").then(r=>r.json()).then(d => {
    const allInv = [...(d.inventory||[]), ...(d.consumables||[])];
    const equips     = allInv.filter(e => e.slot);
    const consumables= d.consumables || allInv.filter(e => !e.slot);
    const equippedCount = (d.team || []).flatMap(p => Object.values(p.equipment || {}).filter(Boolean)).length;

    const roleGroups = ["ALL","GK","DEF","MID","ATT"];
    const slotGroups = ["ALL","HEAD","BODY","HAND","FEET","ACC"];

    const filtered = _invFilter === "ALL"
      ? equips
      : equips.filter(e => e.role === _invFilter || e.role === "ALL");

    content.innerHTML = `
    <div class="inventory-page">

      <!-- Header -->
      <div class="inv-page-header">
        <h2 style="margin:0">🎒 Inventory</h2>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="invSortSel" onchange="_sortInv(this.value)" class="inv-select">
            <option value="rarity">Sort: Rarity</option>
            <option value="power">Sort: Power</option>
            <option value="upgrade">Sort: Upgrade</option>
            <option value="hp">Sort: HP</option>
          </select>
          <span style="color:#64748b;font-size:12px">
            ${equips.length} equipment (terpasang ${equippedCount}) · ${consumables.length} consumable · total ${equips.length + consumables.length} item
          </span>
        </div>
      </div>

      <!-- Role filter -->
      <div class="inv-filter-bar">
        ${roleGroups.map(r => `
        <button class="inv-filter-btn ${_invFilter===r?'active':''}"
          onclick="_filterInv('${r}')" style="${_invFilter===r?`border-color:${_roleColorMap(r)};color:${_roleColorMap(r)}`:''}">
          ${_roleIcon(r)} ${r}
          <span class="inv-filter-cnt">${r==="ALL"?equips.length:equips.filter(e=>e.role===r||e.role==="ALL").length}</span>
        </button>`).join("")}
      </div>

      <!-- Equipment grid -->
      <div class="inv-equip-grid" id="invEquipGrid">
        ${_buildInvGrid(filtered, d)}
      </div>

      <!-- Consumables section -->
      <div class="inv-section-title">💊 Consumables (${consumables.length})</div>
      <div class="inv-consumable-grid">
        ${consumables.length === 0
          ? `<p style="color:#334155">Tidak ada consumable. Beli di Shop!</p>`
          : consumables.map(c => _buildConsumableCard(c, d.team)).join("")}
      </div>

    </div>`;
    animateContent();
  });
}

function _buildInvGrid(equips, d) {
  if (!equips.length) return `<p style="color:#334155;padding:20px">Tidak ada equipment untuk filter ini.</p>`;

  // Sort
  const sorted = [...equips].sort((a,b) => {
    if (_invSort === "power")   return (b.power||0) - (a.power||0);
    if (_invSort === "upgrade") return (b.upgrade||0) - (a.upgrade||0);
    if (_invSort === "hp")      return (a.hp??100) - (b.hp??100);
    // rarity default
    const ro = {C:0,B:1,A:2,S:3,SS:4,SSR:5};
    return (ro[b.rarity]||0) - (ro[a.rarity]||0);
  });

  return sorted.map(e => {
    const rc   = RARITY_COLOR[e.rarity] || "#64748b";
    const hp   = e.hp ?? 100;
    const hpColor = hp>=60?"#22c55e":hp>=30?"#f59e0b":"#ef4444";
    const hpBar   = `<div class="inv-hp-bar"><div style="width:${hp}%;background:${hpColor}"></div></div>`;
    const upLvl   = e.upgrade || 0;
    const nextCfg = UPGRADE_CFG[Math.min(upLvl, UPGRADE_CFG.length-1)];
    const equippedBy = _findEquippedBy(e.id, d.team);

    return `
    <div class="inv-equip-card ${e.rarity}" onclick="openUpgradeModal('${e.id}')">
      <div class="iec-top">
        <div class="iec-icon" style="filter:drop-shadow(0 0 6px ${e.iconColor||rc})">${e.icon||slotIcon(e.slot)}</div>
        <div class="iec-rarity-badge" style="background:${rc}20;color:${rc};border-color:${rc}40">${e.rarity}</div>
        ${upLvl>0?`<div class="iec-upgrade-lv">+${upLvl}</div>`:""}
      </div>
      <div class="iec-name">${e.name}</div>
      <div class="iec-sub">${e.slot} · ${e.role}</div>
      <div class="iec-power">⚡ ${e.power}${upLvl>0?` <span style="color:#22c55e">(+${upLvl*Math.floor(e.power*0.15)})</span>`:""}</div>
      ${hpBar}
      <div class="iec-hp-val" style="color:${hpColor}">${hp}/100 HP</div>
      ${equippedBy?`<div class="iec-worn">📌 ${equippedBy}</div>`:""}
    </div>`;
  }).join("");
}

function _buildConsumableCard(c, team) {
  const isIconPlayer = c.category === "icon_player" || c.special === "icon" || c.type === "icon_player";
  const needTarget = ["stamina_single","heal_injury","exp_single"].includes(c.effect);
  const rc = RARITY_COLOR[c.rarity]||"#94a3b8";

  if (isIconPlayer) {
    const role = c.role || "ST";
    const pow = c.basePower || c.power || 80;
    const desc = c.iconDesc || c.desc || "Icon Player";
    return `
    <div class="inv-cons-card" style="border-color:${rc}30">
      <div class="icc-icon">⭐</div>
      <div class="icc-info">
        <b>${c.name}</b>
        <div style="font-size:11px;color:#64748b">${desc}</div>
        <div style="font-size:11px;color:#4a8860">${c.rarity || "SS"} · ${role} · ⚡ ${pow}</div>
      </div>
      <div class="icc-action">
        <button class="icc-btn" onclick="useConsumable('${c.id}')">Rekrut</button>
      </div>
    </div>`;
  }

  if (needTarget) {
    // Tampilkan dropdown pilih pemain
    const opts = team.map(p=>`<option value="${p.id}">${p.name} (${p.role||p.type})</option>`).join("");
    return `
    <div class="inv-cons-card" style="border-color:${rc}30">
      <div class="icc-icon">${c.icon||"⚡"}</div>
      <div class="icc-info">
        <b>${c.name}</b>
        <div style="font-size:11px;color:#64748b">${c.desc||c.effect}</div>
      </div>
      <div class="icc-action">
        <select class="inv-select" id="tgt_${c.id}" style="font-size:11px;margin-bottom:4px"><option value="">Pilih pemain</option>${opts}</select>
        <button class="icc-btn" onclick="useConsumableTarget('${c.id}','tgt_${c.id}')">Pakai</button>
      </div>
    </div>`;
  }

  return `
  <div class="inv-cons-card" style="border-color:${rc}30">
    <div class="icc-icon">${c.icon||"⚡"}</div>
    <div class="icc-info">
      <b>${c.name}</b>
      <div style="font-size:11px;color:#64748b">${c.desc||c.effect}</div>
    </div>
    <div class="icc-action">
      <button class="icc-btn" onclick="useConsumable('${c.id}')">Pakai</button>
    </div>
  </div>`;
}

function openUpgradeModal(equipId) {
  fetch("/team").then(r=>r.json()).then(d=>{
    const eq = d.inventory.find(e=>String(e.id)===String(equipId));
    if (!eq || !eq.slot) return;

    const rc    = RARITY_COLOR[eq.rarity]||"#64748b";
    const hp    = eq.hp ?? 100;
    const upLvl = eq.upgrade || 0;
    const cfg   = UPGRADE_CFG[Math.min(upLvl, UPGRADE_CFG.length-1)];
    const hpColor = hp>=60?"#22c55e":hp>=30?"#f59e0b":"#ef4444";

    // Cek apakah ada repair items atau protect scroll di inventory
    const repairItems = d.inventory.filter(i=>i.type==="consumable" && i.effect?.includes("repair"));
    const hasProtect  = d.inventory.some(i=>i.type==="consumable" && i.effect==="upgrade_protect");
    const hasBoost    = d.inventory.some(i=>i.type==="consumable" && i.effect==="upgrade_boost");

    const overlay = document.createElement("div");
    overlay.id = "upgradeModal";
    overlay.className = "popup-overlay";
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

    overlay.innerHTML = `
    <div class="popup-box" style="max-width:420px">
      <button class="popup-close" onclick="document.getElementById('upgradeModal').remove()">✕</button>

      <!-- Item info -->
      <div class="popup-header" style="border-color:${rc}">
        <div style="font-size:40px;filter:drop-shadow(0 0 8px ${eq.iconColor||rc})">${eq.icon||slotIcon(eq.slot)}</div>
        <div>
          <h3 style="margin:0;color:${rc}">${eq.name}</h3>
          <div style="font-size:12px;color:#64748b">${eq.rarity} · ${eq.slot} · ${eq.role}</div>
          <div style="color:#facc15;font-weight:bold">⚡ ${eq.power} ${upLvl>0?`<span style="color:#22c55e">+${upLvl}</span>`:""}</div>
        </div>
      </div>

      <div style="padding:16px">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button onclick="document.getElementById('upgradeModal').remove();openEquipPickerModal('${String(eq.id).replace(/'/g,"\\\\'")}','${eq.slot}')"
            style="flex:1;padding:10px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);color:#22c55e;border-radius:10px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">
            🧩 Pasang ke Pemain
          </button>
        </div>
        <!-- HP Bar -->
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
            <span style="color:#64748b">Durability</span>
            <span style="color:${hpColor};font-weight:bold">${hp}/100 HP</span>
          </div>
          <div style="height:10px;background:#1e293b;border-radius:5px;overflow:hidden">
            <div style="width:${hp}%;height:100%;background:${hpColor};border-radius:5px;transition:0.3s"></div>
          </div>
          ${hp<100?`
          <div style="margin-top:8px">
            <div style="font-size:11px;color:#64748b;margin-bottom:5px">🔧 Repair dengan:</div>
            ${repairItems.length?repairItems.map(r=>`
              <button onclick="useRepair('${eq.id}','${r.id}')" style="margin:2px;padding:4px 10px;background:#1e3a2a;border:1px solid #22c55e40;color:#22c55e;border-radius:6px;font-size:11px;cursor:pointer">
                ${r.icon} ${r.name} (+${r.value} HP)
              </button>`).join(""):`<span style="font-size:11px;color:#334155">Tidak ada repair kit di inventory</span>`}
          </div>`:""}
        </div>

        <!-- Upgrade section -->
        <div class="upgrade-section">
          <div style="font-size:13px;font-weight:bold;margin-bottom:10px">
            ⬆️ Upgrade ke +${upLvl+1}
            ${upLvl>=6?`<span style="color:#64748b">(Max +6)</span>`:""}
          </div>

          ${upLvl<6?`
          <div class="upgrade-info-grid">
            <div class="uig-box">
              <span>Sukses</span>
              <b style="color:#22c55e">${cfg.successRate}%</b>
            </div>
            <div class="uig-box">
              <span>Gagal HP</span>
              <b style="color:${cfg.failDmg>0?'#ef4444':'#22c55e'}">${cfg.failDmg===0?"Aman":`-${cfg.failDmg} HP`}</b>
            </div>
            <div class="uig-box">
              <span>Biaya</span>
              <b style="color:#facc15">💰 ${cfg.cost}</b>
            </div>
            <div class="uig-box">
              <span>Bonus Power</span>
              <b style="color:#22c55e">+${Math.floor(eq.power*0.15*(upLvl+1))}</b>
            </div>
          </div>

          <!-- Warning jika HP rendah -->
          ${hp<=30?`<div style="background:rgba(239,68,68,0.1);border:1px solid #ef444430;border-radius:6px;padding:8px;font-size:11px;color:#ef4444;margin:8px 0">⚠️ HP rendah! Repair dulu sebelum upgrade untuk menghindari equipment hancur</div>`:""}

          <div style="display:flex;gap:8px;margin-top:10px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
              <input type="checkbox" id="useProtectChk" ${!hasProtect?"disabled":""}>
              🛡️ Pakai Protection Scroll ${hasProtect?`<span style="color:#22c55e">(tersedia)</span>`:`<span style="color:#334155">(tidak ada)</span>`}
            </label>
          </div>
          ${hasBoost?`<div style="font-size:11px;color:#22c55e;margin-top:4px">✅ Upgrade Stone aktif (+rate boost)</div>`:""}

          <button onclick="doUpgrade('${eq.id}')" class="upgrade-btn" style="margin-top:12px">
            ⬆️ Upgrade Sekarang (💰 ${cfg.cost})
          </button>
          ` : `<div style="text-align:center;color:#f59e0b;padding:20px;font-size:24px">🏆 MAX LEVEL!</div>`}
        </div>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    setTimeout(()=>overlay.classList.add("popup-visible"),10);
  });
}

function doUpgrade(equipId) {
  const useProtect = document.getElementById("useProtectChk")?.checked || false;
  const btn = document.querySelector(".upgrade-btn");
  if (btn) { btn.disabled=true; btn.textContent="⏳ Upgrading..."; }

  fetch("/upgrade",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({equipId, useProtect})
  }).then(r=>r.json()).then(res=>{
    document.getElementById("upgradeModal")?.remove();

    if (res.broken) {
      // Equipment hancur — efek dramatis
      showBrokenEffect(res.msg);
    } else if (res.success) {
      showToast(`✅ ${res.msg}`, "success");
    } else {
      showToast(`❌ ${res.msg}`, "error");
    }
    showStatus();
    showInventory();
  });
}

function showBrokenEffect(msg) {
  const div = document.createElement("div");
  div.style.cssText = `position:fixed;inset:0;background:rgba(239,68,68,0.2);z-index:99999;display:flex;align-items:center;justify-content:center;animation:brokenFlash 0.5s ease`;
  div.innerHTML = `<div style="text-align:center;color:#ef4444;font-size:28px;font-family:Rajdhani,sans-serif">💥 ${msg}</div>`;
  document.body.appendChild(div);
  setTimeout(()=>div.remove(),1500);
}

function useRepair(equipId, repairItemId) {
  fetch("/repair",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({equipId,repairItemId})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast(res.msg,"success");
      document.getElementById("upgradeModal")?.remove();
      showInventory();
    });
}

function useConsumableTarget(id, selectId) {
  const sel = document.getElementById(selectId);
  const targetPlayerId = sel?.value;
  if (!targetPlayerId) { showToast("⚠️ Pilih pemain dulu","error"); return; }
  fetch("/use-consumable",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,targetPlayerId})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast(res.msg||"✅ Berhasil!","success");
      if(res.levelUpEvents?.length) res.levelUpEvents.forEach(e=>showToast(`⬆️ ${e.name} naik Level ${e.level}!`,"success"));
      showInventory();
    });
}

function _filterInv(role) { _invFilter=role; showInventory(); }
function _sortInv(val)     { _invSort=val; showInventory(); }

function _findEquippedBy(equipId, team) {
  for (const p of team) {
    if (!p.equipment) continue;
    for (const [slot, eid] of Object.entries(p.equipment)) {
      if (String(eid) === String(equipId)) return `${p.name} (${slot})`;
    }
  }
  return null;
}

function _roleColorMap(r) {
  return {GK:"#facc15",DEF:"#3b82f6",MID:"#22c55e",ATT:"#ef4444"}[r]||"#64748b";
}
function _roleIcon(r) {
  return {ALL:"⚽",GK:"🧤",DEF:"🛡️",MID:"🎲",ATT:"⚡"}[r]||"⚽";
}

/* =====================
   FORMATION MAP
   Field: GK di kiri, ATT di kanan
   top = y%, left = x%
===================== */
function getPositionMap(f) {
  const maps = {
    "4-3-3": {
      GK:  {top:"50%",  left:"7%"},
      RB:  {top:"12%",  left:"23%"},
      CB2: {top:"35%",  left:"23%"},
      CB1: {top:"65%",  left:"23%"},
      LB:  {top:"88%",  left:"23%"},
      CM3: {top:"20%",  left:"50%"},
      CM2: {top:"50%",  left:"50%"},
      CM1: {top:"80%",  left:"50%"},
      RW:  {top:"15%",  left:"78%"},
      ST:  {top:"50%",  left:"88%"},
      LW:  {top:"85%",  left:"78%"}
    },
    "4-4-2": {
      GK:  {top:"50%",  left:"7%"},
      RB:  {top:"12%",  left:"23%"},
      CB2: {top:"35%",  left:"23%"},
      CB1: {top:"65%",  left:"23%"},
      LB:  {top:"88%",  left:"23%"},
      RM:  {top:"12%",  left:"50%"},
      CM2: {top:"37%",  left:"50%"},
      CM1: {top:"63%",  left:"50%"},
      LM:  {top:"88%",  left:"50%"},
      ST2: {top:"35%",  left:"87%"},
      ST1: {top:"65%",  left:"87%"}
    },
    "4-2-3-1": {
      GK:  {top:"50%",  left:"7%"},
      RB:  {top:"12%",  left:"23%"},
      CB2: {top:"35%",  left:"23%"},
      CB1: {top:"65%",  left:"23%"},
      LB:  {top:"88%",  left:"23%"},
      DM2: {top:"35%",  left:"42%"},
      DM1: {top:"65%",  left:"42%"},
      AM3: {top:"15%",  left:"63%"},
      AM2: {top:"50%",  left:"63%"},
      AM1: {top:"85%",  left:"63%"},
      ST:  {top:"50%",  left:"87%"}
    },
    "3-5-2": {
      GK:  {top:"50%",  left:"7%"},
      CB3: {top:"20%",  left:"23%"},
      CB2: {top:"50%",  left:"23%"},
      CB1: {top:"80%",  left:"23%"},
      RM:  {top:"8%",   left:"50%"},
      CM3: {top:"30%",  left:"50%"},
      CM2: {top:"50%",  left:"50%"},
      CM1: {top:"70%",  left:"50%"},
      LM:  {top:"92%",  left:"50%"},
      ST2: {top:"33%",  left:"87%"},
      ST1: {top:"67%",  left:"87%"}
    },
    "5-3-2": {
      GK:  {top:"50%",  left:"7%"},
      RB:  {top:"8%",   left:"20%"},
      CB3: {top:"28%",  left:"20%"},
      CB2: {top:"50%",  left:"20%"},
      CB1: {top:"72%",  left:"20%"},
      LB:  {top:"92%",  left:"20%"},
      CM3: {top:"25%",  left:"52%"},
      CM2: {top:"50%",  left:"52%"},
      CM1: {top:"75%",  left:"52%"},
      ST2: {top:"35%",  left:"87%"},
      ST1: {top:"65%",  left:"87%"}
    }
  };
  return maps[f] || maps["4-3-3"];
}

/* =====================
   LIGA — Season Fixtures Style
===================== */
function showLiga() {
  fetch("/liga/status").then(r=>r.json()).then(d => {
    const liga = d.liga;
    const history = d.history || [];

    if (!liga || liga.finished) {
      _renderLigaHome(liga, history);
      return;
    }

    fetch("/liga/standings").then(r=>r.json()).then(st => {
      _renderLigaRunning(liga, st);
    });
  });
}

function _renderLigaHome(liga, history) {
  const prevInfo = liga ? `
    <div class="liga-prev-result">
      <span>Season ${liga.season}</span>
      <span>${liga.myPoints} Poin</span>
      <span style="color:#facc15">+${liga.reward} 💰</span>
      <span style="color:#a855f7">+${liga.premiumReward||0} 💎</span>
    </div>` : "";

  const lbRows = history.map((h,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${h.rank}</td>
      <td>Season ${h.season}</td>
      <td><b>${h.points}</b></td>
      <td style="color:#facc15">+${h.reward} 💰</td>
      <td style="color:#a855f7">+${h.premBonus} 💎</td>
      <td style="color:#64748b">${h.date}</td>
    </tr>`).join("");

  content.innerHTML = `
  <div class="liga-page">

    <!-- === SEASON FIXTURES HERO (inspired by FS2 style) === -->
    <div class="liga-fixture-hero">
      <div class="lfh-bg-overlay"></div>
      <div class="lfh-content">
        <div class="lfh-logo">
          <span class="lfh-ball">⚽</span>
          <div>
            <div class="lfh-title">LIGA NUSANTARA</div>
            <div class="lfh-sub">Season ${(liga?.season||0)+1} · ${(liga?.schedule?.length||11)} Pertandingan</div>
          </div>
        </div>
        ${prevInfo}
        <button class="liga-start-btn" onclick="startLiga()">▶ MULAI SEASON BARU</button>
      </div>
    </div>

    <!-- Reward Tiers -->
    <div class="liga-reward-section">
      <div class="lrs-title">🎁 HADIAH AKHIR SEASON</div>
      <div class="liga-reward-tiers">
        <div class="lrt rank-1">
          <div class="lrt-rank">🥇 RANK 1</div>
          <div class="lrt-pts">24+ Poin</div>
          <div class="lrt-rewards">
            <span class="coin-badge normal">+1000 💰</span>
            <span class="coin-badge premium">+20 💎</span>
          </div>
        </div>
        <div class="lrt rank-2">
          <div class="lrt-rank">🥈 RANK 2-5</div>
          <div class="lrt-pts">18-23 Poin</div>
          <div class="lrt-rewards">
            <span class="coin-badge normal">+600 💰</span>
            <span class="coin-badge premium">+12 💎</span>
          </div>
        </div>
        <div class="lrt rank-3">
          <div class="lrt-rank">🥉 RANK 6-10</div>
          <div class="lrt-pts">12-17 Poin</div>
          <div class="lrt-rewards">
            <span class="coin-badge normal">+300 💰</span>
            <span class="coin-badge premium">+6 💎</span>
          </div>
        </div>
        <div class="lrt rank-4">
          <div class="lrt-rank">😐 RANK 11+</div>
          <div class="lrt-pts">&lt;12 Poin</div>
          <div class="lrt-rewards">
            <span class="coin-badge normal">+100 💰</span>
            <span class="coin-badge premium">+2 💎</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Leaderboard history -->
    ${history.length ? `
    <div class="liga-leaderboard-section">
      <div class="lrs-title">📊 LEADERBOARD SEASON</div>
      <table class="lb-table">
        <thead><tr><th>#</th><th>Rank</th><th>Season</th><th>Pts</th><th>Coin</th><th>Premium</th><th>Tanggal</th></tr></thead>
        <tbody>${lbRows}</tbody>
      </table>
    </div>` : ""}

  </div>`;
  animateContent();
}

function _renderLigaRunning(liga, st) {
  const nextMatch = liga.schedule[liga.currentMatch];
  const myTeamName = window._statusCache?.myClub?.name || "My Team";

  content.innerHTML = `
  <div class="liga-page">

    <!-- Header Season Fixtures style -->
    <div class="liga-running-header">
      <div class="lrh-left">
        <div class="lrh-title">⚽ LIGA NUSANTARA</div>
        <div class="lrh-season">Season ${liga.season} · Match Day ${liga.currentMatch+1}/${liga.schedule.length}</div>
      </div>
      <div class="lrh-pts-box">
        <div class="lrh-pts">${liga.myPoints}</div>
        <div class="lrh-pts-label">POIN</div>
        <div style="font-size:10px;color:#64748b">Rank #${st.myRank||"?"}</div>
      </div>
    </div>

    <!-- Fixture grid (calendar style) -->
    <div class="fixture-grid-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div class="fixture-grid-label">📅 FIXTURE</div>
        <button onclick="showTopScorers('liga')" style="padding:4px 10px;font-size:11px;background:#1e3a5f;border:1px solid #3b82f6;border-radius:6px;color:#93c5fd;cursor:pointer">📊 Statistik</button>
      </div>
      <div class="fixture-grid">
        ${liga.schedule.map((m,i) => {
          const cls = m.played ? (m.result==="WIN"?"fg-win":m.result==="LOSE"?"fg-lose":"fg-draw")
                                : i===liga.currentMatch ? "fg-next" : "fg-pending";
          const clickFn = m.played ? `showMatchDetail(${i},'liga')` : `showFixtureDetail(${i})`;
          return `
          <div class="fixture-cell ${cls}" title="${m.name}" onclick="${clickFn}" style="cursor:pointer">
            <div class="fc-num">${i+1}</div>
            <div class="fc-logo">${m.logo}</div>
            <div class="fc-score">${m.played ? m.score : i===liga.currentMatch?"NOW":"—"}</div>
          </div>`;
        }).join("")}
      </div>
      <!-- Legend -->
      <div class="fixture-legend">
        <span class="fl-item fg-win">WIN</span>
        <span class="fl-item fg-draw">DRAW</span>
        <span class="fl-item fg-lose">LOSE</span>
        <span class="fl-item fg-next">NEXT</span>
        <span class="fl-item fg-pending">TBD</span>
      </div>
    </div>

    <div class="liga-layout">
      <div class="liga-left">
        ${nextMatch ? `
        <div class="liga-next-match">
          <div class="lnm-label">⚡ NEXT MATCH — MATCH DAY ${liga.currentMatch+1}</div>
          <div class="lnm-matchup">
            <div class="lnm-team home">🏠 ${myTeamName}</div>
            <div class="lnm-vs">VS</div>
            <div class="lnm-team away">${nextMatch.logo} ${nextMatch.name}</div>
          </div>
          <div class="lnm-str">Kekuatan lawan: <b style="color:${nextMatch.strength>1?'#ef4444':nextMatch.strength>0.9?'#f59e0b':'#22c55e'}">${Math.round(nextMatch.strength*100)}%</b></div>
          <button class="liga-play-btn" onclick="playLigaMatch(${liga.currentMatch})">⚽ KICK OFF!</button>
        </div>` : `
        <div class="liga-next-match">
          <p style="color:#22c55e;font-size:18px;text-align:center;font-family:'Rajdhani',sans-serif">✅ SEASON SELESAI!</p>
          <p style="text-align:center;color:#64748b;font-size:13px">Total ${liga.myPoints} poin</p>
        </div>`}
      </div>

      <div class="liga-right">
        <div class="standings-header">📊 KLASEMEN</div>
        <table class="standings-table">
          <thead><tr><th>#</th><th>Tim</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>
            ${st.standings.map((t,i)=>`
            <tr class="${t.isMe?'standings-me':''}">
              <td>${i+1}</td>
              <td title="${t.name||''}">${t.logo||''} ${(t.name||'').split(' ')[0]}</td>
              <td>${t.played||0}</td>
              <td style="color:#22c55e">${t.won||0}</td>
              <td style="color:#facc15">${t.drawn||0}</td>
              <td style="color:#ef4444">${t.lost||0}</td>
              <td style="color:${(t.gd||0)>=0?'#22c55e':'#ef4444'}">${(t.gd||0)>=0?'+':''}${t.gd||0}</td>
              <td><b>${t.points||0}</b></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>

  </div>`;
  animateContent();
}

function showFixtureDetail(idx) {
  fetch("/liga/status").then(r=>r.json()).then(d=>{
    const m = d.liga?.schedule[idx];
    if (!m) return;
    const status = m.played ? `Hasil: <b>${m.score}</b> (${m.result})` : idx===d.liga.currentMatch ? "Match selanjutnya!" : "Belum dimainkan";
    showToast(`${m.logo} ${m.name} — ${status}`, m.result==="WIN"?"success":m.result==="LOSE"?"error":"info");
  });
}

function startLiga() {
  fetch("/liga/start",{method:"POST"}).then(r=>r.json()).then(res=>{
    if(res.error){ showToast("❌ "+res.error,"error"); return; }
    showToast("🏆 Liga Season "+res.liga.season+" dimulai!","success");
    showLiga();
  });
}

function playLigaMatch(idx) {
  const btn = document.querySelector(".liga-play-btn");
  if(btn){ btn.disabled=true; btn.textContent="⏳ Loading..."; }
  fetch(`/match?ligaMatchIdx=${idx}`).then(r=>r.json()).then(res=>{
    if(res.error){ showToast("❌ "+res.error,"error"); if(btn){btn.disabled=false;btn.textContent="⚽ KICK OFF!";} return; }
    startMatchAnimation(res);
  });
}

/* =====================
   TRANSFER MARKET
===================== */
function manualRefreshTransfer() {
  fetch("/transfer/refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast("🔄 Pemain transfer direset!","success");
      showStatus(); showTransfer();
    });
}

function buyTransfer(id) {
  fetch("/transfer/buy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({playerId:id})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast(`✅ ${res.player.name} bergabung!`,"success");
      showStatus();
      showTransfer();
    });
}

function sellPlayer(id) {
  if(!confirm("Yakin jual pemain ini?")) return;
  fetch("/transfer/sell",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({playerId:id})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast(`✅ Pemain terjual +${res.sellPrice} coin`,"success");
      showStatus();
      showTransfer();
    });
}

/* =====================
   STAMINA & RECOVERY (di Team page)
===================== */
function recoverAll() {
  fetch("/player/recover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"all"})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast(`✅ Semua pemain pulih! (pakai ${res.usedItem?.name||"item"})`,"success");
      showStatus(); showTeam();
    });
}

function confirmRecoverInjury(id) {
  const sid = String(id).replace(/'/g, "\\'");
  // BUG7 FIX: Tampilkan konfirmasi sebelum potong 120 coin untuk sembuhkan cedera
  const overlay = document.createElement("div");
  overlay.id = "injConfirmOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px";
  overlay.innerHTML = `
    <div style="background:#0f172a;border:1px solid rgba(239,68,68,0.4);border-radius:14px;padding:24px;max-width:320px;width:100%;text-align:center">
      <div style="font-size:32px;margin-bottom:8px">🩹</div>
      <h3 style="margin:0 0 8px;color:#f1f5f9;font-family:'Rajdhani',sans-serif">Sembuhkan Cedera</h3>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 16px">Pakai <b style="color:#facc15">Medical Treatment</b> untuk menyembuhkan cedera pemain ini.</p>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('injConfirmOverlay').remove()"
          style="flex:1;padding:10px;background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:13px">
          Batal
        </button>
        <button onclick="document.getElementById('injConfirmOverlay').remove();recoverPlayer('${sid}','injury')"
          style="flex:1;padding:10px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#ef4444;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700">
          ✅ Ya, Sembuhkan
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

function recoverPlayer(id, type) {
  fetch("/player/recover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({playerId:id,type})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      if (type === "injury") showToast(`✅ Cedera disembuhkan (pakai ${res.usedItem?.name||"item"})`,"success");
      else showToast(`✅ Stamina +${res.usedItem?.value??"?"} (pakai ${res.usedItem?.name||"item"})`,"success");
      showStatus(); showTeam();
    });
}

/* =====================
   INIT
===================== */
showStatus();
/* =====================================================================
   CAREER MODE — Liga Nusantara
   showCareer(), showCareerStandings(), playCareerMatch()
===================================================================== */

const DIVISION_COLORS = {
  "Divisi 1": { color: "#f59e0b", glow: "rgba(245,158,11,0.3)", badge: "⭐ DIVISI 1", name: "Liga Utama" },
  "Divisi 2": { color: "#a855f7", glow: "rgba(168,85,247,0.3)", badge: "🥈 DIVISI 2", name: "Liga Nusantara" },
  "Divisi 3": { color: "#64748b", glow: "rgba(100,116,139,0.3)", badge: "🥉 DIVISI 3", name: "Liga Amatir" }
};

function showCareer() {
  Promise.all([
    fetch("/career").then(r=>r.json()),
    fetch("/status").then(r=>r.json())
  ]).then(([cd, st]) => {
    const career = cd.career;
    const history = cd.careerHistory || [];

    if (!career) {
      // Tampilkan halaman start career
      showCareerStart(history, st);
      return;
    }

    // Tampilkan career dashboard
    showCareerDashboard(career, history, st);
  });
}

function showCareerStart(history, st) {
  const divs = ["Divisi 3", "Divisi 2", "Divisi 1"];
  content.innerHTML = `
  <div class="career-page">
    <div class="career-header">
      <div class="career-title-wrap">
        <div class="career-icon">🏟️</div>
        <div>
          <h1 class="career-title">CAREER MODE</h1>
          <div class="career-subtitle">Liga Nusantara — Dari bawah menuju puncak Indonesia</div>
        </div>
      </div>
    </div>

    <div class="career-start-layout">
      <!-- Pilih Divisi -->
      <div class="career-start-left">
        <h3 style="color:#f59e0b;font-family:'Orbitron',sans-serif;font-size:13px;letter-spacing:2px;margin-bottom:14px">
          📋 PILIH STARTING DIVISI
        </h3>
        ${divs.map(div => {
          const dc = DIVISION_COLORS[div];
          const clubs = 10; // per division
          return `
          <div class="career-div-card" onclick="startCareer('${div}')" style="--dc:${dc.color};--dg:${dc.glow}">
            <div class="cdc-badge" style="color:${dc.color}">${dc.badge}</div>
            <div class="cdc-name" style="color:${dc.color}">${div}</div>
            <div class="cdc-league">${dc.name}</div>
            <div class="cdc-info">${clubs} Klub · 18 Matchday · Promosi/Degradasi</div>
            <div class="cdc-action" style="background:${dc.color}20;border-color:${dc.color}50">
              ${div === "Divisi 3" ? "🌱 Start dari bawah (Recommended)" :
                div === "Divisi 2" ? "⚡ Langsung Divisi 2" :
                "🔥 Langsung Liga Utama (Hard Mode)"}
            </div>
          </div>`;
        }).join("")}
      </div>

      <!-- Info Panel -->
      <div class="career-start-right">
        <div class="career-info-panel">
          <h3 style="color:#22c55e;font-family:'Orbitron',sans-serif;font-size:12px;letter-spacing:2px;margin-bottom:12px">
            ℹ️ CARA MAIN CAREER
          </h3>
          <div class="career-rule-list">
            <div class="career-rule"><span>🏆</span><div><b>Tujuan:</b> Naik dari Divisi 3 ke Divisi 1 dan raih gelar Liga Utama</div></div>
            <div class="career-rule"><span>📅</span><div><b>Musim:</b> 18 matchday per season. Main vs semua klub di divisimu</div></div>
            <div class="career-rule"><span>⬆️</span><div><b>Promosi:</b> Top 3 klasemen akhir → naik ke divisi lebih tinggi</div></div>
            <div class="career-rule"><span>⬇️</span><div><b>Degradasi:</b> Bottom 3 → turun divisi. Jaga konsistensi!</div></div>
            <div class="career-rule"><span>🤖</span><div><b>Bot AI:</b> Lawan dikendalikan AI berdasarkan kekuatan klub kota</div></div>
            <div class="career-rule"><span>💰</span><div><b>Reward:</b> Semakin tinggi divisi, reward coin & premium makin besar</div></div>
            <div class="career-rule"><span>🇮🇩</span><div><b>30 Klub:</b> Dari Persija Jakarta sampai Perspal Palopo!</div></div>
          </div>
        </div>

        ${history.length ? `
        <div class="career-history-panel">
          <h3 style="color:#64748b;font-size:12px;margin-bottom:10px;font-family:'Rajdhani',sans-serif;letter-spacing:2px">
            📖 RIWAYAT CAREER
          </h3>
          ${history.map(h => {
            const oc = h.outcome==="promoted"?"#22c55e":h.outcome==="relegated"?"#ef4444":"#64748b";
            const oi = h.outcome==="promoted"?"⬆️":h.outcome==="relegated"?"⬇️":"➡️";
            return `<div class="career-hist-row">
              <div style="color:#64748b;font-size:11px">S${h.seasonNum} · ${h.division}</div>
              <div style="color:${oc};font-size:11px">${oi} Rank #${h.rank} · ${h.outcome==="promoted"?"Promosi ke "+h.nextDivision:h.outcome==="relegated"?"Degradasi":h.nextDivision}</div>
              <div style="color:#f59e0b;font-size:11px">+${h.coinReward} 💰</div>
            </div>`;
          }).join("")}
        </div>` : ""}
      </div>
    </div>
  </div>`;
  animateContent();
}

function showCareerDashboard(career, history, st) {
  const dc = DIVISION_COLORS[career.division] || DIVISION_COLORS["Divisi 3"];
  const ms = career.myStats;
  const nextMatch = !career.finished ? career.schedule[career.currentMatchday] : null;
  const progress = Math.round((career.currentMatchday / career.schedule.length) * 100);

  // Recent results
  const recentPlayed = career.schedule.filter(m => m.played).slice(-5).reverse();

  content.innerHTML = `
  <div class="career-page">
    <div class="career-header">
      <div class="career-title-wrap">
        <div class="career-icon">🏟️</div>
        <div>
          <h1 class="career-title">CAREER MODE</h1>
          <div class="career-subtitle" style="color:${dc.color}">${dc.badge} — ${career.division} · Season ${career.seasonNum}</div>
        </div>
      </div>
      <div class="career-header-stats">
        <div class="chs-item">
          <div class="chs-val" style="color:${dc.color}">${ms.points}</div>
          <div class="chs-lbl">Poin</div>
        </div>
        <div class="chs-item">
          <div class="chs-val" style="color:#22c55e">${ms.won}</div>
          <div class="chs-lbl">Menang</div>
        </div>
        <div class="chs-item">
          <div class="chs-val" style="color:#f59e0b">${ms.drawn}</div>
          <div class="chs-lbl">Seri</div>
        </div>
        <div class="chs-item">
          <div class="chs-val" style="color:#ef4444">${ms.lost}</div>
          <div class="chs-lbl">Kalah</div>
        </div>
        <div class="chs-item">
          <div class="chs-val">${ms.goalsFor}:${ms.goalsAgainst}</div>
          <div class="chs-lbl">Gol</div>
        </div>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="career-progress-wrap">
      <div class="career-progress-label">
        <span>Matchday ${career.currentMatchday} / ${career.schedule.length}</span>
        <span style="color:${dc.color}">${progress}%</span>
      </div>
      <div class="career-progress-bar">
        <div class="career-progress-fill" style="width:${progress}%;background:${dc.color};box-shadow:0 0 12px ${dc.glow}"></div>
      </div>
    </div>

    <div class="career-dashboard-layout">
      <!-- LEFT: Next match + schedule -->
      <div class="career-dashboard-left">

        ${career.finished ? `
        <div class="career-finished-card" style="--dc:${dc.color};--dg:${dc.glow}">
          <div style="font-size:48px;margin-bottom:8px">${ms.points >= 36 ? "🏆" : ms.points >= 24 ? "🥈" : "🎖️"}</div>
          <div style="font-family:'Orbitron',sans-serif;font-size:20px;color:${dc.color}">SEASON SELESAI!</div>
          <div style="color:#64748b;margin:8px 0">Total ${ms.points} poin dari ${ms.played} pertandingan</div>
          <button class="career-new-season-btn" onclick="checkCareerPromotion()">
            📊 Lihat Hasil & Mulai Season Baru
          </button>
        </div>
        ` : nextMatch ? `
        <div class="career-next-match">
          <div class="cnm-label">⚡ NEXT MATCH — MATCHDAY ${career.currentMatchday + 1}</div>
          <div class="cnm-matchup">
            <div class="cnm-team home">
              <div class="cnm-badge">🏠 My Team</div>
              <div class="cnm-teamname">Liga Nusantara FC</div>
            </div>
            <div class="cnm-vs">VS</div>
            <div class="cnm-team away">
              <div class="cnm-badge" style="color:${dc.color}">${nextMatch.club.logo} ${nextMatch.club.city}</div>
              <div class="cnm-teamname">${nextMatch.club.name}</div>
            </div>
          </div>
          <div class="cnm-meta">
            <span>📍 ${nextMatch.isHome ? "Kandang" : "Tandang"}</span>
            <span style="color:${nextMatch.club.str > 1 ? '#ef4444' : nextMatch.club.str > 0.85 ? '#f59e0b' : '#22c55e'}">
              Kekuatan Lawan: ${Math.round(nextMatch.club.str * 100)}%
            </span>
            <span>🏟️ ${nextMatch.club.stadium || "Stadion"}</span>
          </div>
          <button class="career-play-btn" onclick="playCareerMatchday(${career.currentMatchday})" style="--dc:${dc.color};--dg:${dc.glow}">
            ⚽ KICK OFF!
          </button>
        </div>
        ` : ""}

        <!-- Recent results -->
        ${recentPlayed.length ? `
        <div class="career-recent">
          <div class="cr-title">📋 HASIL TERAKHIR</div>
          ${recentPlayed.map(m => {
            const rc = m.result==="WIN"?"#22c55e":m.result==="LOSE"?"#ef4444":"#f59e0b";
            const ri = m.result==="WIN"?"✅":m.result==="LOSE"?"❌":"🤝";
            return `<div class="cr-row">
              <span class="cr-result" style="color:${rc}">${ri} ${m.result}</span>
              <span class="cr-opp">${m.club.logo} ${m.club.name}</span>
              <span class="cr-score" style="color:${rc}">${m.score}</span>
              <span class="cr-home" style="color:#64748b">${m.isHome?"H":"A"}</span>
            </div>`;
          }).join("")}
        </div>
        ` : ""}
      </div>

      <!-- RIGHT: Standings + Schedule grid -->
      <div class="career-dashboard-right">
        <!-- Standings -->
        <div class="career-standings-wrap">
          <div class="csw-header">📊 KLASEMEN ${career.division.toUpperCase()}</div>
          <div id="careerStandingsTable">
            <div style="text-align:center;padding:20px;color:#64748b">
              <div class="loading-spinner" style="margin:auto;margin-bottom:8px"></div>
              Memuat klasemen...
            </div>
          </div>
          <button class="career-standings-btn" onclick="loadCareerStandings()">🔄 Refresh Klasemen</button>
          <button class="career-standings-btn" onclick="showTopScorers('career')" style="margin-left:8px;background:#1e3a5f;border-color:#3b82f6;color:#93c5fd">📊 Statistik</button>
        </div>

        <!-- Schedule grid -->
        <div class="career-schedule-grid">
          <div class="csg-title">📅 JADWAL</div>
          <div class="csg-grid">
            ${career.schedule.map((m, i) => {
              const played = m.played;
              const isNext = !played && i === career.currentMatchday;
              const cls = played
                ? (m.result==="WIN"?"csg-win":m.result==="LOSE"?"csg-lose":"csg-draw")
                : isNext ? "csg-next" : "csg-pending";
              const clickable = played ? `onclick="showMatchDetail(${i},'career')" style="cursor:pointer"` : "";
              return `<div class="csg-cell ${cls}" title="${m.club.name}${played?' · '+m.score:''}" ${clickable}>
                <div class="csg-num">${i+1}</div>
                <div class="csg-logo">${m.club.logo}</div>
                <div class="csg-score">${played ? m.score : isNext ? "▶" : "—"}</div>
              </div>`;
            }).join("")}
          </div>
        </div>
      </div>
    </div>
  </div>`;

  animateContent();
  loadCareerStandings();
}

function loadCareerStandings() {
  fetch("/career/standings").then(r=>r.json()).then(d => {
    const el = document.getElementById("careerStandingsTable");
    if(!el || !d.standings) return;
    const dc = DIVISION_COLORS[d.division] || DIVISION_COLORS["Divisi 3"];
    const promo = 3, relega = d.standings.length - 3;
    // Normalize standings: handle old format {club:{name,logo}} and new flat {name,logo}
    const standings = d.standings.map(t => {
      if (t.club && typeof t.club === "object") {
        return {
          ...t,
          name: t.club.name || t.club.id || "Tim",
          logo: t.club.logo || "⚽",
          gd: (t.goalsFor||0) - (t.goalsAgainst||0),
        };
      }
      return { ...t, gd: t.gd !== undefined ? t.gd : (t.goalsFor||0)-(t.goalsAgainst||0) };
    });
    el.innerHTML = `<table class="career-table">
      <colgroup>
        <col style="width:28px">
        <col>
        <col style="width:28px">
        <col style="width:28px">
        <col style="width:28px">
        <col style="width:28px">
        <col style="width:34px">
        <col style="width:36px">
      </colgroup>
      <thead><tr><th>#</th><th>Tim</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>
        ${standings.map((t, i) => {
          const rank = i + 1;
          const isPromo  = rank <= promo;
          const isRelega = rank > relega;
          const rowCls   = t.isMe ? "career-me-row" : isPromo ? "career-promo-row" : isRelega ? "career-relega-row" : "";
          return `<tr class="${rowCls}">
            <td><span class="ct-rank" style="color:${isPromo?"#22c55e":isRelega?"#ef4444":"#64748b"}">${rank}</span></td>
            <td title="${t.name||''}">
              <span style="margin-right:3px">${t.logo||''}</span>
              <span class="ct-club-name" style="font-weight:${t.isMe?"700":"400"}">${t.name||'Tim'}</span>
              ${t.isMe?"<span style='color:#f59e0b;font-size:9px;margin-left:3px'>★</span>":""}
            </td>
            <td>${t.played||0}</td>
            <td style="color:#22c55e">${t.won||0}</td>
            <td style="color:#f59e0b">${t.drawn||0}</td>
            <td style="color:#ef4444">${t.lost||0}</td>
            <td style="color:${t.gd>=0?"#22c55e":"#ef4444"}">${t.gd>=0?"+":""}${t.gd}</td>
            <td><b style="color:${dc.color}">${t.points}</b></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    <div class="career-legend">
      <span class="cl-item cl-promo">⬆️ Zona Promosi</span>
      <span class="cl-item cl-safe">✅ Aman</span>
      <span class="cl-item cl-relega">⬇️ Zona Degradasi</span>
    </div>`;
  });
}

function startCareer(division) {
  fetch("/career/start", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ division })
  }).then(r=>r.json()).then(res => {
    if(res.error) { showToast("❌ " + res.error, "error"); return; }
    showToast(`🏟️ Career Season ${res.career.seasonNum} dimulai di ${division}!`, "success");
    showCareer();
  });
}

function playCareerMatchday(idx) {
  const btn = document.querySelector(".career-play-btn");
  if(btn) { btn.disabled = true; btn.textContent = "⏳ Memuat..."; }

  fetch("/career/match", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ matchdayIdx: idx })
  }).then(r=>r.json()).then(res => {
    if(res.error) {
      showToast("❌ " + res.error, "error");
      if(btn) { btn.disabled=false; btn.textContent="⚽ KICK OFF!"; }
      return;
    }
    startMatchAnimation(res);
  }).catch(() => {
    showToast("❌ Gagal konek server", "error");
    if(btn) { btn.disabled=false; btn.textContent="⚽ KICK OFF!"; }
  });
}

function checkCareerPromotion() {
  fetch("/career/standings").then(r=>r.json()).then(d => {
    const career = d.career;
    const dc = DIVISION_COLORS[career.division] || DIVISION_COLORS["Divisi 3"];
    const myRank = d.myRank;
    const total = d.standings.length;
    const isPromoted = myRank <= 3 && career.division !== "Divisi 1";
    const isRelegated = myRank > total - 3 && career.division !== "Divisi 3";

    const ms = career.myStats;
    let outcome = isPromoted ? "promoted" : isRelegated ? "relegated" : "mid";
    const divKeys = ["Divisi 3","Divisi 2","Divisi 1"];
    const curIdx = divKeys.indexOf(career.division);
    const nextDiv = isPromoted ? divKeys[curIdx+1] : isRelegated ? divKeys[curIdx-1] : career.division;

    content.innerHTML = `
    <div class="career-page" style="text-align:center">
      <div style="padding:40px 20px">
        <div style="font-size:64px;margin-bottom:16px">
          ${myRank===1?"🏆":isPromoted?"⬆️":isRelegated?"⬇️":"🎖️"}
        </div>
        <div style="font-family:'Orbitron',sans-serif;font-size:24px;color:${isPromoted?"#22c55e":isRelegated?"#ef4444":"#f59e0b"};margin-bottom:8px">
          ${myRank===1?"JUARA LIGA!":isPromoted?"PROMOSI!":isRelegated?"DEGRADASI":"SEASON SELESAI"}
        </div>
        <div style="color:#64748b;margin-bottom:24px">
          ${career.division} · Season ${career.seasonNum} · Rank #${myRank} dari ${total} tim
        </div>

        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:24px">
          <div style="background:#071f0d;border:1px solid #0d3018;border-radius:12px;padding:16px 24px;min-width:100px">
            <div style="font-size:24px;color:#22c55e;font-family:'Orbitron',sans-serif">${ms.won}</div>
            <div style="font-size:11px;color:#64748b">Menang</div>
          </div>
          <div style="background:#071f0d;border:1px solid #0d3018;border-radius:12px;padding:16px 24px;min-width:100px">
            <div style="font-size:24px;color:#f59e0b;font-family:'Orbitron',sans-serif">${ms.points}</div>
            <div style="font-size:11px;color:#64748b">Total Poin</div>
          </div>
          <div style="background:#071f0d;border:1px solid #0d3018;border-radius:12px;padding:16px 24px;min-width:100px">
            <div style="font-size:24px;color:#22c55e;font-family:'Orbitron',sans-serif">${ms.goalsFor}</div>
            <div style="font-size:11px;color:#64748b">Gol Cetak</div>
          </div>
        </div>

        ${isPromoted ? `<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:16px;margin-bottom:20px;max-width:400px;margin-inline:auto">
          <div style="color:#22c55e;font-weight:700;margin-bottom:4px">🎉 Selamat! Tim Anda Promosi!</div>
          <div style="color:#64748b;font-size:12px">Season depan akan bermain di <b style="color:#22c55e">${nextDiv}</b></div>
        </div>` : ""}
        ${isRelegated ? `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:16px;margin-bottom:20px;max-width:400px;margin-inline:auto">
          <div style="color:#ef4444;font-weight:700;margin-bottom:4px">😔 Tim Anda Terdegradasi</div>
          <div style="color:#64748b;font-size:12px">Season depan akan bermain di <b style="color:#ef4444">${nextDiv}</b></div>
        </div>` : ""}

        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button onclick="startCareer('${nextDiv}')" style="background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(34,197,94,0.4);color:#22c55e;padding:12px 24px;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;letter-spacing:1px">
            🏟️ Mulai Season ${career.seasonNum+1} di ${nextDiv}
          </button>
          <button onclick="navigate(document.getElementById('navFormation'),showFormation)" style="background:#0a1a0a;border:1px solid #1a4a28;color:#64748b;padding:12px 24px;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:14px">
            📋 Atur Tim Dulu
          </button>
        </div>
      </div>
    </div>`;
    animateContent();
  });
}
/* =========================================================
   FOOTBALL SAGA 2 — UPGRADE PACK
   1. Second Position System
   2. Ball-Following Player AI Movement
   3. Match Highlights (Yellow/Red Card, Foul, Penalty, Goal)
   4. Boot Animation on Mannequin (Equipment Shop)
   5. Enhanced Mannequin SVG with Real Boots Visual
========================================================= */

/* =========================================================
   1. SECOND POSITION DATA
   Setiap pemain bisa punya posisi kedua dengan -15% power
========================================================= */
const SECOND_POSITION_MAP = {
  // Dari → Bisa juga main di (dengan penalti)
  GK:  [],
  LB:  ["CB","LM","RB"],
  RB:  ["CB","RM","LB"],
  CB:  ["DM","LB","RB"],
  LM:  ["LW","CM","LB"],
  RM:  ["RW","CM","RB"],
  CM:  ["DM","AM","LM","RM"],
  DM:  ["CB","CM"],
  AM:  ["CM","LW","RW","ST"],
  LW:  ["LM","ST","AM"],
  RW:  ["RM","ST","AM"],
  ST:  ["LW","RW","AM"],
  CF:  ["ST","AM"]
};

const SECOND_POS_PENALTY = 0.85; // -15% power jika main di second position

/* =========================================================
   2. ENHANCED MATCH ANIMATION ENGINE
   - Ball-following AI per role
   - Highlight system (yellow card, red card, penalty, goal)
   - Smooth player movement dengan easing
========================================================= */

// Global match state
let _matchHighlightQueue = [];
let _activeHighlight     = null;
let _highlightTimer      = 0;
let _penaltyMode         = false;
let _penaltyStep         = 0;
let _redCardedPlayers    = [];

/* ── Build match timeline ── */
function buildMatchTimeline(result, W, H) {
  const scoreObj = parseScore(result.score);
  const ps = scoreObj.home;
  const es = scoreObj.away;
  const TOTAL = 420;
  const events = [];

  // Kick off
  events.push({ frame: 10, type: "event", text: "⏱ Kick Off!", ballTarget: { x: W/2, y: H/2 } });

  // Goals home
  const hGoalFrames = distributeFrames(ps, TOTAL);
  hGoalFrames.forEach(f => {
    events.push({ frame: f, type: "goal_home", ballTarget: { x: W - 15, y: H / 2 } });
    events.push({ frame: f, type: "event", text: "⚽ GOAL untuk tim kita!" });
  });

  // Goals away
  const aGoalFrames = distributeFrames(es, TOTAL);
  aGoalFrames.forEach(f => {
    events.push({ frame: f, type: "goal_away", ballTarget: { x: 15, y: H / 2 } });
    events.push({ frame: f, type: "event", text: "😱 Kebobolan!" });
  });

  // Skills
  const skills = result.skillEvents || result.skills || [];
  skills.slice(0, 3).forEach((sk, i) => {
    events.push({
      frame: 60 + i * 100,
      type: "skill",
      text: sk.name || sk,
      ballTarget: { x: W/2 + (Math.random()-0.5)*100, y: H/2 + (Math.random()-0.5)*80 }
    });
  });

  // Standard events
  events.push({ frame: Math.floor(TOTAL/2), type: "event", text: "⏱ Half Time" });
  events.push({ frame: TOTAL - 10, type: "event", text: "⏱ Full Time" });

  events.sort((a, b) => a.frame - b.frame);
  return events;
}

function distributeFrames(count, total) {
  const frames = [];
  if (count <= 0) return frames;
  for (let i=0; i<count; i++) {
    frames.push(Math.floor(60 + (i+1)*(total-120)/(count+1)));
  }
  return frames;
}


/* ── Ball movement dengan smooth easing ── */
function moveBallSmooth(ball, frame) {
  const dx   = ball.tx - ball.cx;
  const dy   = ball.ty - ball.cy;
  const dist = Math.hypot(dx, dy);
  const SPEED = 5.5;
  if (dist > SPEED) {
    ball.cx += (dx / dist) * SPEED;
    ball.cy += (dy / dist) * SPEED;
  } else {
    ball.cx = ball.tx;
    ball.cy = ball.ty;
    // Idle drift jika sudah sampai
    ball.cx += Math.sin(frame * 0.12) * 0.6;
    ball.cy += Math.cos(frame * 0.09) * 0.5;
  }
  ball.spinning++;
}

/* ── Player AI Movement — mengikuti bola sesuai role ── */
function movePlayersAI(players, opponents, ball, W, H, frame, side) {
  const isHome = side === "home";
  const goalX  = isHome ? W - 15 : 15;
  const ownX   = isHome ? 15 : W - 15;

  players.forEach((p, idx) => {
    if (p.redCarded) return;

    const role = (p.role || "MID").toUpperCase();
    let targetX = p.baseCx, targetY = p.baseCy;

    const ballDist = Math.hypot(ball.cx - p.cx, ball.cy - p.cy);
    const ballNearby = ballDist < 80;

    // Idiosyncratic movement per role
    if (role === "GK") {
      // GK tetap di garis, geser vertikal ikuti bola
      targetX = p.baseCx;
      targetY = p.baseCy + (ball.cy - H / 2) * 0.25;
      targetY = Math.max(H * 0.2, Math.min(H * 0.8, targetY));
    } else if (role === "DEF") {
      // DEF ikuti bola sedikit, tapi tidak maju jauh
      if (ballNearby) {
        targetX = p.baseCx + (ball.cx - p.cx) * 0.3;
        targetY = p.baseCy + (ball.cy - p.cy) * 0.45;
        // Jangan terlalu maju
        if (isHome) targetX = Math.min(targetX, W * 0.55);
        else        targetX = Math.max(targetX, W * 0.45);
      } else {
        targetX = p.baseCx + Math.sin(frame * 0.03 + idx) * 8;
        targetY = p.baseCy + Math.cos(frame * 0.04 + idx) * 6;
      }
    } else if (role === "MID") {
      // MID paling aktif, cover area tengah + ikuti bola
      if (ballNearby) {
        targetX = ball.cx + (Math.random() - 0.5) * 30;
        targetY = ball.cy + (Math.random() - 0.5) * 30;
      } else {
        targetX = p.baseCx + (ball.cx - W / 2) * 0.2;
        targetY = p.baseCy + (ball.cy - H / 2) * 0.3;
      }
    } else if (role === "ATT" || role === "LW" || role === "RW") {
      // ATT bergerak ke arah gawang, ikuti bola
      if (ballNearby) {
        targetX = ball.cx + (goalX > W / 2 ? 20 : -20);
        targetY = ball.cy + (Math.random() - 0.5) * 40;
      } else {
        // Run in behind, positioning
        targetX = p.baseCx + (ball.cx - W/2) * 0.15 + Math.sin(frame * 0.05 + idx) * 12;
        targetY = p.baseCy + (ball.cy - H/2) * 0.2;
      }
      if (isHome) targetX = Math.min(targetX, W * 0.95);
      else        targetX = Math.max(targetX, W * 0.05);
    }

    // Clamp ke lapangan
    targetX = Math.max(12, Math.min(W - 12, targetX));
    targetY = Math.max(12, Math.min(H - 12, targetY));

    // Smooth lerp toward target
    const LERP = ballNearby ? 0.08 : 0.04;
    p.cx += (targetX - p.cx) * LERP;
    p.cy += (targetY - p.cy) * LERP;
    // Tiny idle jitter
    p.cx += (Math.random() - 0.5) * 0.2;
    p.cy += (Math.random() - 0.5) * 0.2;
  });
}

/* ── Draw enhanced player dot ── */
function drawEnhancedPlayerDot(ctx, x, y, color, name, isEnemy, yellowCarded) {
  // Glow ring untuk pemain home
  if (!isEnemy) {
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fillStyle = color + "18";
    ctx.fill();
  }

  // Body circle
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 12);
  grad.addColorStop(0, lightenColor(color, 40));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = isEnemy ? "#ff6666" : "#ffffff";
  ctx.lineWidth = isEnemy ? 1.5 : 2;
  ctx.stroke();

  // Inner dot
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();

  // Yellow card indicator
  if (yellowCarded) {
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + 8, y - 18, 7, 10);
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 8, y - 18, 7, 10);
  }

  // Name label
  if (name && !isEnemy) {
    const short = name.split(" ")[0].substring(0, 7);
    ctx.font = "bold 7.5px 'Inter', Arial";
    ctx.textAlign = "center";
    const tw = ctx.measureText(short).width;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - tw / 2 - 3, y - 26, tw + 6, 13, 3);
    else ctx.rect(x - tw / 2 - 3, y - 26, tw + 6, 13);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(short, x, y - 15);
  }
}

/* ── Draw enhanced ball dengan spin ── */
function drawEnhancedBall(ctx, ball, frame) {
  const x = ball.cx, y = ball.cy, r = 7;
  const rot = (frame * 0.15) % (Math.PI * 2);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(x, y + r + 4, r + 2, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();

  // Ball body
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const bg = ctx.createRadialGradient(-2, -2, 1, 0, 0, r);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pentagon pattern (simplified)
  ctx.fillStyle = "#1e293b";
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3.8, 2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-3.8, 2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* ── Draw Highlight Overlay ── */
function drawHighlightOverlay(ctx, W, H, hl, timer) {
  const fade = Math.min(1, timer / 20);

  ctx.save();
  ctx.globalAlpha = fade;

  if (hl.type === "goal") {
    // GOAL! — full screen flash + text
    ctx.fillStyle = `rgba(250,204,21,0.08)`;
    ctx.fillRect(0, 0, W, H);

    // Big text
    const scale = 1 + Math.sin((hl.duration - timer) * 0.1) * 0.1;
    ctx.save();
    ctx.translate(W / 2, H / 2 - 15);
    ctx.scale(scale, scale);
    ctx.font = "bold 44px 'Orbitron','Rajdhani',Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "#000"; ctx.shadowBlur = 16;
    ctx.fillText("⚽ GOAL!", 0, 0);
    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(hl.scorer || "", 0, 32);
    ctx.restore();

    // Confetti particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (hl.duration - timer) * 0.05;
      const r = 60 + (hl.duration - timer) * 2;
      const px = W / 2 + Math.cos(angle) * r;
      const py = H / 2 + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = ["#facc15","#22c55e","#ef4444","#fff"][i % 4];
      ctx.fill();
    }

  } else if (hl.type === "goal_away") {
    ctx.fillStyle = "rgba(239,68,68,0.08)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 36px 'Rajdhani',Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#000"; ctx.shadowBlur = 12;
    ctx.fillText("😱 GOAL! " + (hl.teamName || ""), W / 2, H / 2);

  } else if (hl.type === "yellow_card") {
    // Yellow card — panel di pojok
    ctx.fillStyle = "rgba(250,204,21,0.12)";
    ctx.fillRect(0, 0, W, H);
    drawCardPanel(ctx, W, H, "#facc15", "🟨", "KARTU KUNING", hl.player, hl.reason);

  } else if (hl.type === "red_card") {
    // Red card
    ctx.fillStyle = "rgba(239,68,68,0.15)";
    ctx.fillRect(0, 0, W, H);
    drawCardPanel(ctx, W, H, "#ef4444", "🟥", "KARTU MERAH", hl.player, hl.reason);

  } else if (hl.type === "foul") {
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f97316";
    ctx.shadowColor = "#000"; ctx.shadowBlur = 8;
    ctx.fillText("🦵 PELANGGARAN! " + (hl.player || ""), W / 2, H * 0.25);

  } else if (hl.type === "penalty") {
    // PENALTY!
    ctx.fillStyle = "rgba(168,85,247,0.12)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 38px 'Rajdhani',Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#a855f7";
    ctx.shadowColor = "#000"; ctx.shadowBlur = 14;
    ctx.fillText("⚡ PENALTI!", W / 2, H / 2 - 10);
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(hl.player || "", W / 2, H / 2 + 18);

  } else if (hl.type === "skill") {
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#000"; ctx.shadowBlur = 8;
    ctx.fillText("✨ " + (hl.text || ""), W / 2, H * 0.18);

  } else if (hl.type === "halftime") {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 28px 'Rajdhani',Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748b";
    ctx.fillText("⏱ HALF TIME", W / 2, H / 2);
  }

  ctx.restore();
}

function drawCardPanel(ctx, W, H, color, cardEmoji, title, player, reason) {
  const pw = 200, ph = 80;
  const px = W / 2 - pw / 2, py = H / 2 - ph / 2;

  ctx.fillStyle = "rgba(0,0,0,0.8)";
  if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 10);
  else ctx.rect(px, py, pw, ph);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 10);
  else ctx.rect(px, py, pw, ph);
  ctx.stroke();

  // Card icon
  ctx.font = "28px Arial";
  ctx.textAlign = "left";
  ctx.fillText(cardEmoji, px + 12, py + 36);

  // Text
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.fillText(title, px + 50, py + 24);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText(player || "", px + 50, py + 42);
  ctx.font = "10px Arial";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(reason || "", px + 50, py + 60);
}

/* ── Penalty scene ── */
function drawPenaltyScene(ctx, W, H, ball, players, enemies, frame) {
  const penX = W * 0.88;  // Titik penalti
  const penY = H / 2;

  // Move ball to penalty spot
  ball.cx += (penX - ball.cx) * 0.1;
  ball.cy += (penY - ball.cy) * 0.1;

  // Shooter (attacker)
  const shooter = players.find(p => p.role === "ATT") || players[0];
  if (shooter) {
    const shootTarget = { x: penX - 15, y: penY };
    shooter.cx += (shootTarget.x - shooter.cx) * 0.08;
    shooter.cy += (shootTarget.y - shooter.cy) * 0.08;
  }

  // GK (enemy) spreads arms
  const gk = enemies.find(p => p.role === "GK") || enemies[0];
  if (gk) {
    gk.cx = W - 15;
    gk.cy = H / 2 + Math.sin(frame * 0.2) * 25;
  }

  // Draw other players at edges
  [...players.filter(p => p !== shooter), ...enemies.filter(p => p !== gk)].forEach(p => {
    const tX = p.baseCx > W / 2 ? W * 0.55 : W * 0.45;
    p.cx += (tX - p.cx) * 0.05;
    p.cy += (p.baseCy - p.cy) * 0.05;
  });
}

/* ── Minute HUD ── */
function drawMinuteHUD(ctx, minute, homeScore, awayScore) {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  if (ctx.roundRect) ctx.roundRect(8, 8, 62, 22, 5);
  else ctx.rect(8, 8, 62, 22);
  ctx.fill();
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 11px 'Orbitron',Arial";
  ctx.textAlign = "left";
  ctx.fillText(`⏱ ${minute}'`, 13, 23);
}

/* ── Build enhanced timeline ── */
function buildEnhancedTimeline(result, W, H, players, enemies) {
  const scoreObj = parseScore(result.score);
  const ps = scoreObj.home;
  const es = scoreObj.away;
  const TOTAL = 480;
  const events = [];
  const playerNames = players.map(p => p.name || "Player");

  // Kick off
  events.push({ frame: 5, type: "event", text: "⏱ Kick Off!", ballTarget: { x: W/2, y: H/2 } });

  // Fouls (random 1-2)
  const foulCount = Math.floor(Math.random() * 3);
  for (let i = 0; i < foulCount; i++) {
    const foulFrame = 60 + Math.floor(Math.random() * 140);
    const isHomeFoul = Math.random() > 0.5;
    const foulPlayer = isHomeFoul
      ? playerNames[Math.floor(Math.random() * playerNames.length)]
      : "Lawan";
    const foulX = W * (0.3 + Math.random() * 0.4);
    const foulY = H * (0.2 + Math.random() * 0.6);

    events.push({
      frame: foulFrame,
      type: "foul_event",
      ballTarget: { x: foulX, y: foulY },
      highlight: { type: "foul", player: foulPlayer, reason: "Pelanggaran", duration: 55 }
    });

    // Yellow card chance dari foul
    if (Math.random() < 0.55) {
      events.push({
        frame: foulFrame + 15,
        type: "card_event",
        highlight: {
          type: "yellow_card",
          player: foulPlayer,
          reason: isHomeFoul ? "Pelanggaran keras" : "Obstruction",
          duration: 90,
          isHome: isHomeFoul
        }
      });
    }
  }

  // Red card (rare, 8% chance)
  if (Math.random() < 0.08) {
    const redFrame = 150 + Math.floor(Math.random() * 150);
    const isHomeRed = Math.random() > 0.5;
    const redPlayer = isHomeRed
      ? playerNames[Math.floor(Math.random() * playerNames.length)]
      : "Lawan #" + Math.ceil(Math.random() * 11);
    events.push({
      frame: redFrame,
      type: "red_card_event",
      highlight: {
        type: "red_card",
        player: redPlayer,
        reason: "Tackle dari belakang",
        duration: 110,
        isHome: isHomeRed
      }
    });
  }

  // Penalty (12% chance)
  if (Math.random() < 0.12) {
    const penFrame = 100 + Math.floor(Math.random() * 200);
    const isHomePen = Math.random() > 0.5;
    const penPlayer = isHomePen
      ? playerNames.find(n => n) || "Striker"
      : "Lawan";
    events.push({
      frame: penFrame,
      type: "penalty_event",
      ballTarget: { x: isHomePen ? W * 0.88 : W * 0.12, y: H / 2 },
      highlight: {
        type: "penalty",
        player: penPlayer,
        reason: isHomePen ? "Penalti untuk My Team!" : "Penalti untuk lawan!",
        duration: 100
      }
    });
  }

  // Goals home
  const hGoalFrames = distributeFrames(ps, TOTAL);
  hGoalFrames.forEach((f, i) => {
    const scorer = playerNames[Math.floor(Math.random() * playerNames.length)];
    events.push({
      frame: f,
      type: "goal_home",
      ballTarget: { x: W - 12, y: H / 2 },
      highlight: { type: "goal", scorer, duration: 120 }
    });
    events.push({ frame: f, type: "event", text: `⚽ GOAL! ${scorer}` });
  });

  // Goals away
  const aGoalFrames = distributeFrames(es, TOTAL);
  aGoalFrames.forEach((f, i) => {
    events.push({
      frame: f,
      type: "goal_away",
      ballTarget: { x: 12, y: H / 2 },
      highlight: { type: "goal_away", teamName: result.enemyName || "Enemy", duration: 100 }
    });
    events.push({ frame: f, type: "event", text: `😱 ${result.enemyName || "Enemy"} mencetak gol!` });
  });

  // Skills
  if (result.skillEvents?.length) {
    result.skillEvents.slice(0, 3).forEach((sk, i) => {
      events.push({
        frame: 40 + i * 90,
        type: "skill_event",
        ballTarget: { x: W/2 + (Math.random()-0.5)*100, y: H/2 + (Math.random()-0.5)*70 },
        highlight: { type: "skill", text: sk.name || sk.skill, duration: 50 }
      });
    });
  }

  // Half time
  events.push({
    frame: Math.floor(TOTAL * 0.47),
    type: "event",
    text: "⏱ Half Time",
    highlight: { type: "halftime", duration: 70 }
  });

  events.push({ frame: TOTAL - 10, type: "event", text: "⏱ Full Time" });

  events.sort((a, b) => a.frame - b.frame);
  return events;
}

function processMatchEvent(ev, ball, players, enemies, W, H, result) {
  if (ev.ballTarget) {
    ball.tx = ev.ballTarget.x;
    ball.ty = ev.ballTarget.y;
  }
  if (ev.highlight) {
    _matchHighlightQueue.push({ ...ev.highlight });
  }
  if (ev.type === "red_card_event" && ev.highlight?.isHome) {
    // Remove a player from field
    const toRemove = players.find(p => p.name === ev.highlight.player);
    if (toRemove) toRemove.redCarded = true;
    else players[players.length - 1].redCarded = true;
  }
  if (ev.type === "penalty_event") {
    _penaltyMode = true;
    setTimeout(() => { _penaltyMode = false; }, 3000);
  }
  if (ev.type === "event") addMatchLog(ev.text);
}

/* ── Utility ── */
function lightenColor(hex, amount) {
  const num = parseInt(hex.replace("#",""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

/* =========================================================
   3. SECOND POSITION SYSTEM — Formation UI
   Tambahkan badge "2nd pos" di slot formasi
========================================================= */

function getSecondPositions(playerRole) {
  const role = (playerRole || "").toUpperCase().replace(/[0-9]/g, "");
  return SECOND_POSITION_MAP[role] || [];
}

function canPlaySecondPos(playerRole, targetPos) {
  const cleanRole = (playerRole || "").replace(/[0-9]/g, "").toUpperCase();
  const cleanPos  = (targetPos || "").replace(/[0-9]/g, "").toUpperCase();
  const alts = getSecondPositions(cleanRole);
  return alts.some(p => cleanPos.includes(p) || p.includes(cleanPos));
}

// Tambahkan info second pos di popup player
function buildSecondPosInfo(player) {
  const role = player.role || player.type || "";
  const alts = getSecondPositions(role);
  if (!alts.length) return "";
  return `<div class="second-pos-wrap">
    <div class="sp-label">🔄 Posisi Alternatif</div>
    <div class="sp-pills">
      ${alts.map(p => `<span class="sp-pill">${p} <span style="color:#ef4444;font-size:9px">-15% PWR</span></span>`).join("")}
    </div>
  </div>`;
}

/* =========================================================
   4. ENHANCED MANNEQUIN — Boot Animation
   Ketika player punya FEET equipment → sepatu muncul
   dengan animasi "pakai sepatu"
========================================================= */

function buildEnhancedMannequinSVG(equipment, inventory, animateSlot) {
  const worn = {};
  Object.entries(equipment || {}).forEach(([slot, id]) => {
    if (!id) return;
    const eq = inventory.find(e => String(e.id) === String(id));
    if (eq) worn[slot] = eq;
  });

  const skin     = "#c8b4a0";
  const skinDark = "#b0967e";
  const jersey   = worn.BODY  ? (worn.BODY.iconColor  || "#3b82f6") : "#334155";
  const gloves   = worn.HAND  ? (worn.HAND.iconColor  || "#a855f7") : skin;
  const boots    = worn.FEET  ? (worn.FEET.iconColor  || "#22c55e") : "#1e293b";
  const helmet   = worn.HEAD  ? (worn.HEAD.iconColor  || "#facc15") : null;
  const acc      = worn.ACC   ? (worn.ACC.iconColor   || "#f97316") : null;
  const animate  = animateSlot || "";

  // Boot animation class
  const bootAnim = animate === "FEET" ? `
    <style>
      @keyframes bootSlide {
        0%  { transform: translateY(20px); opacity: 0; }
        60% { transform: translateY(-4px); opacity: 1; }
        100%{ transform: translateY(0px);  opacity: 1; }
      }
      .boot-anim { animation: bootSlide 0.5s ease forwards; }
    </style>` : "";

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 290" width="130" height="290">
    ${bootAnim}
    <defs>
      <radialGradient id="skinGrad" cx="40%" cy="35%">
        <stop offset="0%" stop-color="${lightenColor(skin, 20)}"/>
        <stop offset="100%" stop-color="${skin}"/>
      </radialGradient>
      <radialGradient id="jerseyGrad" cx="30%" cy="30%">
        <stop offset="0%" stop-color="${lightenColor(jersey, 30)}"/>
        <stop offset="100%" stop-color="${jersey}"/>
      </radialGradient>
      <radialGradient id="bootGrad" cx="30%" cy="30%">
        <stop offset="0%" stop-color="${lightenColor(boots, 30)}"/>
        <stop offset="100%" stop-color="${boots}"/>
      </radialGradient>
    </defs>

    <!-- ======= KEPALA ======= -->
    ${helmet ? `
    <ellipse cx="65" cy="26" rx="26" ry="15" fill="${helmet}" opacity="0.85"/>
    <rect x="40" y="32" width="50" height="7" rx="4" fill="${helmet}" opacity="0.65"/>
    <text x="65" y="26" text-anchor="middle" font-size="11" fill="#000">🪖</text>` : ""}

    <!-- Kepala -->
    <ellipse cx="65" cy="44" rx="22" ry="24" fill="url(#skinGrad)"/>
    <!-- Mata -->
    <ellipse cx="57" cy="42" rx="3" ry="3.5" fill="#3d2b1f"/>
    <ellipse cx="73" cy="42" rx="3" ry="3.5" fill="#3d2b1f"/>
    <ellipse cx="57" cy="41" rx="1.2" ry="1.2" fill="#fff" opacity="0.6"/>
    <ellipse cx="73" cy="41" rx="1.2" ry="1.2" fill="#fff" opacity="0.6"/>
    <!-- Mulut -->
    <path d="M58,52 Q65,57 72,52" stroke="${skinDark}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <!-- Telinga -->
    <ellipse cx="43" cy="44" rx="5" ry="7" fill="${skinDark}"/>
    <ellipse cx="87" cy="44" rx="5" ry="7" fill="${skinDark}"/>
    <!-- Rambut -->
    <ellipse cx="65" cy="22" rx="22" ry="10" fill="#3d2b1f" opacity="0.7"/>

    <!-- ======= LEHER ======= -->
    <rect x="59" y="66" width="12" height="11" rx="3" fill="${skinDark}"/>

    <!-- ======= BADAN (JERSEY) ======= -->
    <path d="M30,77 Q30,72 38,72 L92,72 Q100,72 100,77 L100,138 Q100,146 92,146 L38,146 Q30,146 30,138 Z"
      fill="url(#jerseyGrad)" opacity="0.95"/>

    <!-- Jersey number -->
    ${worn.BODY ? `
    <text x="65" y="116" text-anchor="middle" font-size="22" fill="rgba(255,255,255,0.25)" font-weight="bold">10</text>
    <text x="65" y="133" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.4)" letter-spacing="1">LIGA NUSANTARA</text>
    ` : ""}

    <!-- Collar -->
    <path d="M54,72 Q65,84 76,72" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/>

    <!-- ======= ACC (Ring/Aksesori) ======= -->
    ${acc ? `
    <circle cx="24" cy="115" r="4.5" fill="none" stroke="${acc}" stroke-width="2.5"/>
    <circle cx="24" cy="115" r="2" fill="${acc}" opacity="0.5"/>
    <circle cx="106" cy="115" r="4.5" fill="none" stroke="${acc}" stroke-width="2.5"/>
    <circle cx="106" cy="115" r="2" fill="${acc}" opacity="0.5"/>
    ` : ""}

    <!-- ======= TANGAN KIRI ======= -->
    <rect x="10" y="74" width="20" height="50" rx="10"
      fill="${worn.HAND ? gloves : "url(#skinGrad)"}" opacity="${worn.HAND ? 0.9 : 1}"/>
    ${worn.HAND ? `<text x="20" y="106" text-anchor="middle" font-size="13">🧤</text>` : ""}
    <!-- Jari kiri -->
    <rect x="10" y="118" width="4" height="14" rx="2" fill="${worn.HAND ? gloves : skinDark}"/>
    <rect x="15" y="120" width="4" height="15" rx="2" fill="${worn.HAND ? gloves : skinDark}"/>
    <rect x="20" y="120" width="4" height="14" rx="2" fill="${worn.HAND ? gloves : skinDark}"/>

    <!-- ======= TANGAN KANAN ======= -->
    <rect x="100" y="74" width="20" height="50" rx="10"
      fill="${worn.HAND ? gloves : "url(#skinGrad)"}" opacity="${worn.HAND ? 0.9 : 1}"/>
    ${worn.HAND ? `<text x="110" y="106" text-anchor="middle" font-size="13">🧤</text>` : ""}
    <rect x="100" y="118" width="4" height="14" rx="2" fill="${worn.HAND ? gloves : skinDark}"/>
    <rect x="105" y="120" width="4" height="15" rx="2" fill="${worn.HAND ? gloves : skinDark}"/>
    <rect x="110" y="120" width="4" height="14" rx="2" fill="${worn.HAND ? gloves : skinDark}"/>

    <!-- ======= SHORTS ======= -->
    <rect x="35" y="143" width="55" height="32" rx="5"
      fill="${worn.BODY ? lightenColor(jersey, -30) : "#1e293b"}" opacity="0.9"/>
    <!-- Stripe on shorts -->
    <rect x="37" y="145" width="3" height="28" rx="1" fill="rgba(255,255,255,0.15)"/>
    <rect x="90" y="145" width="3" height="28" rx="1" fill="rgba(255,255,255,0.15)"/>

    <!-- ======= SHIN GUARD (left) ======= -->
    ${worn.FEET ? `
    <rect x="40" y="192" width="14" height="26" rx="3" fill="${boots}" opacity="0.4"/>
    ` : ""}

    <!-- ======= PAHA KIRI ======= -->
    <rect x="38" y="173" width="22" height="26" rx="8"
      fill="${worn.FEET ? lightenColor(boots, -10) : "url(#skinGrad)"}" opacity="${worn.FEET ? 0.7 : 0.9}"/>

    <!-- ======= PAHA KANAN ======= -->
    <rect x="70" y="173" width="22" height="26" rx="8"
      fill="${worn.FEET ? lightenColor(boots, -10) : "url(#skinGrad)"}" opacity="${worn.FEET ? 0.7 : 0.9}"/>

    <!-- ======= SHIN GUARD (right) ======= -->
    ${worn.FEET ? `
    <rect x="76" y="192" width="14" height="26" rx="3" fill="${boots}" opacity="0.4"/>
    ` : ""}

    <!-- ======= BETIS KIRI ======= -->
    <rect x="40" y="196" width="18" height="34" rx="6"
      fill="${worn.FEET ? lightenColor(boots, -5) : "url(#skinGrad)"}" opacity="${worn.FEET ? 0.75 : 0.9}"/>

    <!-- ======= BETIS KANAN ======= -->
    <rect x="72" y="196" width="18" height="34" rx="6"
      fill="${worn.FEET ? lightenColor(boots, -5) : "url(#skinGrad)"}" opacity="${worn.FEET ? 0.75 : 0.9}"/>

    <!-- ======= SEPATU KIRI (dengan animasi) ======= -->
    <g class="${animate==='FEET' ? 'boot-anim' : ''}">
      <!-- Boot sole -->
      <rect x="32" y="228" width="30" height="6" rx="3"
        fill="${worn.FEET ? lightenColor(boots, -50) : "#0f172a"}" opacity="0.9"/>
      <!-- Boot body -->
      <path d="M33,228 L33,218 Q33,212 40,212 L56,212 Q62,212 62,218 L62,228 Z"
        fill="url(#bootGrad)" opacity="${worn.FEET ? 1 : 0.4}"/>
      <!-- Boot details -->
      ${worn.FEET ? `
      <!-- Stripes / logo detail -->
      <line x1="36" y1="220" x2="59" y2="220" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <line x1="36" y1="223" x2="59" y2="223" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <!-- Laces -->
      <line x1="40" y1="214" x2="40" y2="226" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
      <line x1="44" y1="213" x2="44" y2="227" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
      <line x1="48" y1="213" x2="48" y2="227" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
      <line x1="52" y1="214" x2="52" y2="226" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
      <!-- Toe cap -->
      <ellipse cx="33" cy="222" rx="4" ry="6" fill="${lightenColor(boots, 20)}" opacity="0.6"/>
      <!-- Heel -->
      <rect x="57" y="218" width="5" height="10" rx="2" fill="${lightenColor(boots, -20)}" opacity="0.8"/>
      ` : ""}
      <!-- Ankle -->
      <ellipse cx="47" cy="213" rx="9" ry="4" fill="${worn.FEET ? lightenColor(boots, 10) : skinDark}" opacity="0.9"/>
    </g>

    <!-- ======= SEPATU KANAN ======= -->
    <g class="${animate==='FEET' ? 'boot-anim' : ''}" style="${animate==='FEET' ? 'animation-delay:0.08s' : ''}">
      <rect x="68" y="228" width="30" height="6" rx="3"
        fill="${worn.FEET ? lightenColor(boots, -50) : "#0f172a"}" opacity="0.9"/>
      <path d="M68,228 L68,218 Q68,212 75,212 L91,212 Q97,212 97,218 L97,228 Z"
        fill="url(#bootGrad)" opacity="${worn.FEET ? 1 : 0.4}"/>
      ${worn.FEET ? `
      <line x1="71" y1="220" x2="94" y2="220" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <line x1="71" y1="223" x2="94" y2="223" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <line x1="75" y1="214" x2="75" y2="226" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
      <line x1="79" y1="213" x2="79" y2="227" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
      <line x1="83" y1="213" x2="83" y2="227" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
      <line x1="87" y1="214" x2="87" y2="226" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
      <ellipse cx="68" cy="222" rx="4" ry="6" fill="${lightenColor(boots, 20)}" opacity="0.6"/>
      <rect x="92" y="218" width="5" height="10" rx="2" fill="${lightenColor(boots, -20)}" opacity="0.8"/>
      ` : ""}
      <ellipse cx="82" cy="213" rx="9" ry="4" fill="${worn.FEET ? lightenColor(boots, 10) : skinDark}" opacity="0.9"/>
    </g>

    <!-- ======= EQUIPMENT WORN LABELS ======= -->
    ${worn.FEET ? `
    <rect x="18" y="243" width="94" height="14" rx="4" fill="rgba(0,0,0,0.6)"/>
    <text x="65" y="253" text-anchor="middle" font-size="8" fill="${boots}" font-weight="bold">
      👟 ${(worn.FEET.name || "Boots").substring(0, 18)}
    </text>` : ""}

    <!-- ======= "NO EQUIPMENT" label ======= -->
    ${Object.keys(worn).length === 0 ? `
    <text x="65" y="270" text-anchor="middle" font-size="9" fill="#475569">No Equipment</text>
    ` : ""}

    <!-- ======= Equipment summary bar ======= -->
    ${Object.keys(worn).length > 0 ? `
    <rect x="10" y="260" width="110" height="22" rx="5" fill="rgba(0,0,0,0.5)"/>
    <text x="65" y="274" text-anchor="middle" font-size="7.5" fill="#94a3b8">
      ${Object.values(worn).slice(0,3).map(e => e.name.split(" ")[0]).join(" · ")}
    </text>
    ` : ""}
  </svg>`;
}

/* Override buildMannequinSVG dengan yang baru */
function buildMannequinSVG(equipment, inventory, animateSlot) {
  return buildEnhancedMannequinSVG(equipment, inventory, animateSlot);
}

/* =========================================================
   5. SECOND POSITION UI — Patch openPlayerPopup
========================================================= */
const _origOpenPlayerPopup = window.openPlayerPopup;
window.openPlayerPopup = function(playerId, teamData) {
  const p = teamData.team.find(x => x.id == playerId);
  if (!p) return;

  document.getElementById("playerPopupOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "playerPopupOverlay";
  overlay.className = "popup-overlay";
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const svgHtml = buildEnhancedMannequinSVG(p.equipment, teamData.inventory);
  const roleLabel = p.role || p.type || "?";
  const rarityColors = { C:"#94a3b8", B:"#3b82f6", A:"#a855f7", S:"#f59e0b", SSR:"gold" };
  const rc = rarityColors[p.rarity] || "#fff";
  const secondPos = buildSecondPosInfo(p);

  overlay.innerHTML = `
  <div class="popup-box">
    <button class="popup-close" onclick="document.getElementById('playerPopupOverlay').remove()">✕</button>
    <div class="popup-header" style="border-color:${rc}">
      <div>
        <h2 style="margin:0;color:${rc};font-family:'Orbitron',sans-serif;font-size:18px">${p.name}</h2>
        <div style="color:#94a3b8;font-size:12px;margin-top:2px">${roleLabel} · Rarity <b style="color:${rc}">${p.rarity}</b> · Age ${p.age || "?"}</div>
        <div style="font-size:22px;color:#facc15;font-weight:bold;margin-top:4px;font-family:'Orbitron',sans-serif">⚡ ${p.power}</div>
        ${p.trait ? `<div style="font-size:11px;color:#22c55e;margin-top:2px">✨ ${p.trait}</div>` : ""}
        ${p.skill && p.skill!=="NONE" ? `<div style="font-size:11px;color:#a855f7;margin-top:2px">🎯 Skill: ${p.skill.replace(/_/g," ")}</div>` : ""}
      </div>
    </div>

    <div class="popup-body">
      <!-- Manekin -->
      <div class="popup-mannequin">
        <div class="mannequin-wrap" id="mannequinWrap_${p.id}">
          ${svgHtml}
        </div>
        <div class="mannequin-legend">
          ${["HEAD","BODY","HAND","FEET","ACC"].map(s => {
            const eqId = p.equipment?.[s];
            const eq = eqId ? teamData.inventory.find(e => String(e.id) === String(eqId)) : null;
            return `<div class="mq-slot ${eq ? "mq-has" : ""}">
              ${slotIcon(s)} ${eq ? `<span title="${eq.name}">${eq.name.split(" ")[0]}</span>` : `<span style="opacity:0.4">${s}</span>`}
            </div>`;
          }).join("")}
        </div>
        ${secondPos}
      </div>

      <!-- Stats -->
      <div class="popup-stats">
        <h3 style="margin:0 0 10px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:2px;font-family:'Rajdhani',sans-serif">⚡ STATS</h3>
        ${[
          ["👟","Pace",    p.finalStats?.pace     || p.pace],
          ["🎯","Shooting",p.finalStats?.shooting || p.shooting],
          ["🎲","Passing", p.finalStats?.passing  || p.passing],
          ["🛡️","Defense", p.finalStats?.defense  || p.defense],
          ["💪","Stamina", p.finalStats?.stamina  || p.stamina],
          ["🧠","Mentality",p.finalStats?.mentality|| p.mentality]
        ].map(([icon, label, val]) => {
          const v   = Math.floor(val || 0);
          const pct = Math.min(100, v);
          const col = pct>=80?"#22c55e":pct>=60?"#facc15":pct>=40?"#f97316":"#ef4444";
          return `<div class="stat-bar-row">
            <span class="stat-bar-label">${icon} ${label}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${pct}%;background:${col};box-shadow:0 0 6px ${col}60"></div>
            </div>
            <span class="stat-bar-val" style="color:${col}">${v}</span>
          </div>`;
        }).join("")}

        <!-- EXP / Level -->
        <div style="margin-top:12px;background:rgba(34,197,94,0.05);border:1px solid #0d3018;border-radius:8px;padding:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#4a8860;margin-bottom:4px">
            <span>Level ${p.level || 1}</span>
            <span>${p.exp || 0} / ${p.expNeeded || 100} EXP</span>
          </div>
          <div style="background:#0a2a12;border-radius:4px;height:5px;overflow:hidden">
            <div style="width:${Math.min(100,Math.floor(((p.exp||0)/(p.expNeeded||100))*100))}%;height:100%;background:linear-gradient(90deg,#22c55e,#86efac);border-radius:4px"></div>
          </div>
        </div>

        <!-- Equipment list -->
        <div style="margin-top:12px;border-top:1px solid #0d3018;padding-top:10px">
          <h3 style="margin:0 0 8px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:2px;font-family:'Rajdhani',sans-serif">🎽 EQUIPMENT</h3>
          ${["HEAD","BODY","HAND","FEET","ACC"].map(s => {
            const eqId = p.equipment?.[s];
            const eq   = eqId ? teamData.inventory.find(e => String(e.id) === String(eqId)) : null;
            return `<div class="popup-eq-row ${eq?"":"empty"}" onclick="${eq?`refreshMannequin(${p.id},'${s}')`:""}" style="cursor:${eq?"pointer":"default"}">
              <span>${slotIcon(s)}</span>
              <span style="flex:1">${eq ? eq.name : `— ${s}`}</span>
              ${eq ? `<span style="color:#facc15;font-size:11px">⚡${eq.power}</span>` : ""}
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add("popup-visible"), 10);
};

/* Animate mannequin when slot is clicked */
function refreshMannequin(playerId, slot) {
  const wrap = document.getElementById(`mannequinWrap_${playerId}`);
  if (!wrap || !_teamDataCache) return;
  const p = _teamDataCache.team.find(x => x.id == playerId);
  if (!p) return;
  // Re-render dengan animasi slot yang diklik
  wrap.innerHTML = buildEnhancedMannequinSVG(p.equipment, _teamDataCache.inventory, slot);
}

/* =========================================================
   6. CSS INJECTED — Second Position & Highlights
========================================================= */
(function injectCSS() {
  const style = document.createElement("style");
  style.textContent = `
/* === SECOND POSITION UI === */
.second-pos-wrap {
  margin-top: 10px;
  background: rgba(34,197,94,0.05);
  border: 1px solid rgba(34,197,94,0.15);
  border-radius: 8px;
  padding: 8px 10px;
}
.sp-label {
  font-size: 10px;
  color: #4a8860;
  letter-spacing: 1px;
  font-family: 'Rajdhani', sans-serif;
  margin-bottom: 5px;
}
.sp-pills { display: flex; flex-wrap: wrap; gap: 5px; }
.sp-pill {
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.2);
  border-radius: 12px;
  padding: 3px 9px;
  font-size: 10px;
  color: #22c55e;
  font-family: 'Rajdhani', sans-serif;
}

/* === MATCH HIGHLIGHT OVERLAY (di luar canvas) === */
#matchHighlightBanner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 50;
  text-align: center;
}

/* === BOOT ANIMATION === */
@keyframes bootSlide {
  0%  { transform: translateY(20px); opacity: 0; }
  60% { transform: translateY(-4px); opacity: 1; }
  100%{ transform: translateY(0px);  opacity: 1; }
}
.boot-anim { animation: bootSlide 0.5s ease forwards; }

/* === POPUP ENHANCEMENTS === */
.popup-eq-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 6px; font-size: 12px;
  transition: background 0.15s; margin-bottom: 2px;
  border: 1px solid transparent;
}
.popup-eq-row:not(.empty):hover {
  background: rgba(34,197,94,0.06);
  border-color: rgba(34,197,94,0.15);
}
.popup-eq-row.empty { opacity: 0.4; }

/* === MATCH LOG ENTRY === */
.match-log-entry {
  font-size: 11px; color: #94a3b8; padding: 2px 0;
  border-bottom: 1px solid rgba(13,48,24,0.3);
  font-family: 'Rajdhani', sans-serif;
  animation: fadeSlide 0.3s ease;
}

/* === SECOND POS BADGE di formation === */
.second-pos-badge {
  font-size: 8px;
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 4px;
  padding: 1px 4px;
  letter-spacing: 0.5px;
}
  `;
  document.head.appendChild(style);
})();
/* ================================================================
   FOOTBALL SAGA 2 — PATCH v3
   1. FIX Gacha 10x (batch endpoint, no cooldown per-pull)
   2. Match Speed Control (1x / 2x / 3x)
   3. Smart Match AI — tactical decision making
   4. Enhanced Match UI
================================================================ */

/* ================================================================
   PATCH 1 — GACHA 10x FULL REWRITE
   Root cause: server punya 500ms cooldown per pull → 10x error
   Fix: batch endpoint /gacha/batch yang proses 10x sekaligus
================================================================ */

async function rollGacha(times = 1, eventId = "standard") {
  const btnS = document.getElementById("gachaBtnSingle");
  const btnM = document.getElementById("gachaBtnMulti");
  if (btnS) btnS.disabled = true;
  if (btnM) btnM.disabled = true;

  let results = [];

  if (times === 1) {
    // Single pull — endpoint biasa
    const res = await fetch(`/gacha?event=${eventId}`).then(r => r.json());
    if (res.error) {
      showToast("❌ " + res.error, "error");
      if (btnS) btnS.disabled = false;
      if (btnM) btnM.disabled = false;
      return;
    }
    results = [res.reward];
    showStatus();
  } else {
    // 10x pull — pakai batch endpoint
    const res = await fetch(`/gacha/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: eventId, times })
    }).then(r => r.json());

    if (res.error) {
      showToast("❌ " + res.error, "error");
      if (btnS) btnS.disabled = false;
      if (btnM) btnM.disabled = false;
      return;
    }
    results = res.rewards;
    showStatus();
  }

  if (btnS) btnS.disabled = false;
  if (btnM) btnM.disabled = false;
  if (!results || !results.length) return;

  gachaHistory.unshift(...results);
  showStatus();
  renderGachaHistory();

  // Sembunyikan default view, tampilkan stage
  const defView = document.getElementById("gachaDefaultView");
  const stage   = document.getElementById("gachaStage");
  if (defView) defView.style.display = "none";
  if (stage)   { stage.style.display = "flex"; stage.innerHTML = ""; }

  if (times === 1) {
    await playGachaFlipSingle(results[0]);
  } else {
    await playGachaFlip10Fixed(results);
  }

  // Tombol kembali
  if (stage) {
    const backBtn = document.createElement("button");
    backBtn.textContent = "↩ Kembali ke Gacha";
    backBtn.className   = "gacha-back-btn";
    backBtn.onclick = () => {
      stage.innerHTML = "";
      stage.style.display = "none";
      if (defView) defView.style.display = "flex";
    };
    stage.appendChild(backBtn);
  }
}

/* ── Gacha 10x Fixed — layout grid 2x5, reveal dengan delay ── */
async function playGachaFlip10Fixed(results) {
  const stage = document.getElementById("gachaStage");
  if (!stage) return;

  gachaSkipFlag = false;

  // Wrapper dengan scroll jika layar kecil
  stage.innerHTML = `
    <div class="g10-wrapper">
      <div class="g10-title">✨ ${results.length}x Pull Result</div>
      <div class="g10-grid" id="g10Grid"></div>
      <button class="gacha-skip-btn" onclick="skipGachaAnim()">⏭ Skip All</button>
    </div>`;

  const grid = document.getElementById("g10Grid");

  // Render semua kartu tutup dulu
  results.forEach((eq, i) => {
    const color = RARITY_COLOR[eq.rarity] || "#94a3b8";
    const isHighRarity = ["S","SS","SSR"].includes(eq.rarity);
    const itemIcon = eq.icon || slotIcon(eq.slot) || "📦";
    const card = document.createElement("div");
    card.className = "g10-card-wrap";
    card.id = `g10w_${i}`;
    card.innerHTML = `
      <div class="g10-card" id="g10c_${i}">
        <div class="g10-front">
          <div class="g10-question">❓</div>
        </div>
        <div class="g10-back" style="border-color:${color}30;--rc:${color}">
          <div class="g10-rarity" style="color:${color}">${eq.rarity}</div>
          <div class="g10-icon" style="filter:drop-shadow(0 0 8px ${color}80)">${itemIcon}</div>
          <div class="g10-name">${eq.name}</div>
          <div class="g10-power" style="color:#facc15">⚡ ${eq.power || 0}</div>
          ${eq.slot ? `<div class="g10-slot" style="color:#475569">${eq.slot}</div>` : ""}
        </div>
      </div>
      ${isHighRarity ? `<div class="g10-shine" style="--rc:${color}"></div>` : ""}`;
    grid.appendChild(card);
  });

  // Reveal satu per satu dengan delay
  for (let i = 0; i < results.length; i++) {
    if (gachaSkipFlag) break;
    await delay(160);
    const card = document.getElementById(`g10c_${i}`);
    if (card) {
      card.classList.add("flipped");
      // Flash effect untuk high rarity
      if (["S","SS","SSR"].includes(results[i].rarity)) {
        const wrap = document.getElementById(`g10w_${i}`);
        if (wrap) {
          wrap.classList.add("g10-highlight");
          if (results[i].rarity === "SSR") wrap.classList.add("g10-ssr");
        }
        await delay(120);
      }
    }
  }

  // Skip: reveal semua sekaligus
  if (gachaSkipFlag) {
    results.forEach((eq, i) => {
      const card = document.getElementById(`g10c_${i}`);
      if (card) card.classList.add("flipped");
      if (["S","SS","SSR"].includes(eq.rarity)) {
        const wrap = document.getElementById(`g10w_${i}`);
        if (wrap) wrap.classList.add("g10-highlight");
      }
    });
  }

  // Summary setelah semua reveal
  await delay(400);
  const highItems = results.filter(r => ["S","SS","SSR"].includes(r.rarity));
  if (highItems.length && stage) {
    const sumDiv = document.createElement("div");
    sumDiv.className = "g10-summary";
    sumDiv.innerHTML = `
      <div class="g10-sum-title">🎉 High Rarity Obtained!</div>
      ${highItems.map(eq => {
        const c = RARITY_COLOR[eq.rarity] || "#fff";
        return `<span class="g10-sum-item" style="border-color:${c};color:${c}">
          ${eq.icon || slotIcon(eq.slot)} ${eq.name} <b>${eq.rarity}</b>
        </span>`;
      }).join("")}`;
    stage.insertBefore(sumDiv, stage.querySelector(".gacha-back-btn") || stage.firstChild);
  }
}

/* ================================================================
   PATCH 2 — MATCH SPEED CONTROL + SMART AI
   Speed 1x / 2x / 3x dengan tombol di UI
================================================================ */

let _matchSpeed = 1;     // 1 = normal, 2 = 2x, 3 = 3x
let _matchPaused = false;

window.showMatch = showMatch;

/* ================================================================
   SMART MATCH AI ENGINE
================================================================ */

/* AI State per pemain */
function createAIState(player, side) {
  return {
    ...player,
    vx: 0, vy: 0,
    targetX: player.cx,
    targetY: player.cy,
    hasBall: false,
    stamina: 100,
    tired: false,
    side,
    // AI decision state
    aiMode: "position",   // position | chase | attack | defend | press | celebrate
    aiCooldown: 0,
    lastDecision: 0
  };
}

/* Smart AI decision */
function makeAIDecision(p, ball, teammates, opponents, W, H, side, frame) {
  if (p.redCarded) return;
  if (p.aiCooldown > 0) { p.aiCooldown--; return; }

  const isHome = side === "home";
  const ownGoalX = isHome ? 18 : W - 18;
  const enemyGoalX = isHome ? W - 18 : 18;
  const ballDist = Math.hypot(ball.cx - p.cx, ball.cy - p.cy);
  const role = (p.role || "MID").toUpperCase();

  // Stamina effect
  p.tired = (p.stamina || 100) < 40;
  const speedMod = p.tired ? 0.65 : 1;

  let tx = p.baseCx, ty = p.baseCy;
  let newMode = p.aiMode;

  // ── GK Logic ──
  if (role === "GK") {
    const threat = opponents.filter(op => !op.redCarded && Math.hypot(op.cx - ownGoalX, op.cy - H/2) < 150);
    if (threat.length > 0) {
      // Track attacker
      const mainThreat = threat.sort((a,b) => Math.hypot(a.cx-ownGoalX,a.cy-H/2)-Math.hypot(b.cx-ownGoalX,b.cy-H/2))[0];
      tx = ownGoalX + (isHome ? 12 : -12);
      ty = Math.max(H*0.2, Math.min(H*0.8, mainThreat.cy + (H/2 - mainThreat.cy) * 0.4));
      newMode = "defend";
    } else {
      tx = ownGoalX + (isHome ? 8 : -8);
      ty = H/2 + (ball.cy - H/2) * 0.3;
      ty = Math.max(H*0.22, Math.min(H*0.78, ty));
      newMode = "position";
    }
    p.aiCooldown = 2;
  }

  // ── DEF Logic ──
  else if (role === "DEF" || role === "CB" || role === "LB" || role === "RB") {
    const attackerNear = opponents.filter(op => !op.redCarded && Math.hypot(op.cx - ownGoalX, op.cy-H/2) < 200);

    if (ballDist < 60 && Math.hypot(ball.cx - ownGoalX, ball.cy-H/2) < 220) {
      // Press and challenge
      tx = ball.cx + (ownGoalX > W/2 ? 15 : -15);
      ty = ball.cy;
      newMode = "press";
      p.aiCooldown = 3;
    } else if (attackerNear.length > 0) {
      // Mark nearest attacker
      const nearest = attackerNear.sort((a,b) => Math.hypot(a.cx-p.cx,a.cy-p.cy)-Math.hypot(b.cx-p.cx,b.cy-p.cy))[0];
      tx = nearest.cx + (isHome ? -20 : 20);
      ty = nearest.cy;
      newMode = "defend";
      p.aiCooldown = 4;
    } else {
      // Compact shape
      tx = p.baseCx + (ball.cx - W/2) * 0.12;
      ty = p.baseCy + (ball.cy - H/2) * 0.25;
      if (isHome) tx = Math.min(tx, W*0.5);
      else tx = Math.max(tx, W*0.5);
      newMode = "position";
      p.aiCooldown = 5;
    }
  }

  // ── MID Logic ──
  else if (role === "CM" || role === "MID" || role === "LM" || role === "RM" || role === "DM" || role === "AM") {
    const isDM = role === "DM";
    const isAM = role === "AM";
    const maxFwdX = isHome ? (isDM ? W*0.5 : isAM ? W*0.85 : W*0.7) : (isDM ? W*0.5 : isAM ? W*0.15 : W*0.3);

    if (ballDist < 55) {
      // Chase and control
      tx = ball.cx + (isHome ? 8 : -8);
      ty = ball.cy + (Math.random()-0.5) * 20;
      newMode = "chase";
      p.aiCooldown = 2;
    } else if (ballDist < 120) {
      // Support run
      const angle = Math.atan2(ball.cy - p.cy, ball.cx - p.cx);
      tx = p.cx + Math.cos(angle) * 40;
      ty = p.cy + Math.sin(angle) * 40;
      newMode = "attack";
      p.aiCooldown = 3;
    } else {
      // Float in space, cover area
      tx = p.baseCx + (ball.cx - W/2) * 0.18 + Math.sin(frame*0.02+p.id)*15;
      ty = p.baseCy + (ball.cy - H/2) * 0.3  + Math.cos(frame*0.025+p.id)*10;
      newMode = "position";
      p.aiCooldown = 6;
    }

    if (isHome) tx = Math.min(tx, maxFwdX);
    else tx = Math.max(tx, maxFwdX);
  }

  // ── ATT / ST / LW / RW Logic ──
  else {
    const enemyDef = opponents.filter(op => !op.redCarded &&
      (op.role?.includes("CB") || op.role?.includes("LB") || op.role?.includes("RB")));

    if (ballDist < 50) {
      // Shoot! Move toward goal
      tx = enemyGoalX + (isHome ? -30 : 30);
      ty = H/2 + (Math.random()-0.5) * 60;
      newMode = "attack";
      p.aiCooldown = 2;
    } else if (ballDist < 100) {
      // Run onto ball
      tx = ball.cx + (isHome ? 25 : -25);
      ty = ball.cy + (Math.random()-0.5)*30;
      newMode = "attack";
      p.aiCooldown = 3;
    } else {
      // Make run, exploit space behind defense
      const dLine = enemyDef.length > 0
        ? enemyDef.reduce((s,d)=>s+d.cx,0)/enemyDef.length
        : isHome ? W*0.65 : W*0.35;

      // Run in behind
      tx = (isHome ? dLine+30 : dLine-30) + Math.sin(frame*0.03+p.id)*20;
      ty = p.baseCy + (ball.cy - H/2)*0.2 + Math.cos(frame*0.04+p.id)*25;
      newMode = "position";
      p.aiCooldown = 5;
    }

    // Clamp to attacking third
    if (isHome) { tx = Math.max(W*0.35, Math.min(W-15, tx)); }
    else        { tx = Math.min(W*0.65, Math.max(15, tx)); }
  }

  // Apply target
  p.targetX = Math.max(12, Math.min(W-12, tx));
  p.targetY = Math.max(10, Math.min(H-10, ty));
  p.aiMode  = newMode;
}

/* Main smart match animation */
function startSmartMatchAnimation(result) {
  const canvas = document.getElementById("matchCanvas");
  if (!canvas) { showMatchResult(result); return; }
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  fetch("/match/visual").then(r => r.json()).then(visData => {

    // Init players dengan AI state
    const homePlayers = visData.players.map(p => createAIState({
      ...p,
      cx: (p.x/visData.field.width)*W,
      cy: (p.y/visData.field.height)*H,
      baseCx: (p.x/visData.field.width)*W,
      baseCy: (p.y/visData.field.height)*H
    }, "home"));

    const awayPlayers = visData.players.map((p, i) => createAIState({
      ...p,
      cx: W - (p.x/visData.field.width)*W,
      cy: (p.y/visData.field.height)*H,
      baseCx: W - (p.x/visData.field.width)*W,
      baseCy: (p.y/visData.field.height)*H,
      role: p.role || ["GK","LB","CB","CB","RB","CM","CM","CM","LW","RW","ST"][i] || "MID",
      name: ""
    }, "away"));

    const ball = {
      cx: W/2, cy: H/2,
      tx: W/2, ty: H/2,
      vx: 0, vy: 0,
      speed: 6, spinning: 0,
      owner: null,  // "home" | "away" | null
      trail: []     // [{x,y}]
    };

    // Build event timeline
    const timeline = buildSmartTimeline(result, W, H);
    let tIdx = 0, frame = 0;
    const BASE_FRAMES = 480;
    let homeScore = 0, awayScore = 0;
    let activeFlash = null, flashTimer = 0;
    let goalCelebration = 0;
    let matchPhase = "normal"; // normal | goal | halftime | penalty
    let commentary = [];

    function pushCommentary(text, color) {
      commentary.unshift({ text, color: color||"#22c55e", age: 0 });
      if (commentary.length > 4) commentary.pop();
      addMatchLog(text);
    }

    function tick() {
      try {
        const stepsWanted = Math.max(1, Math.min(3, Number(_matchSpeed) || 1));
        const budgetMs = stepsWanted >= 3 ? 10 : 12;
        const now = typeof performance !== "undefined" && performance.now ? () => performance.now() : () => Date.now();
        const tStart = now();
        const decisionMod = stepsWanted >= 3 ? 7 : stepsWanted === 2 ? 5 : 3;
        for (let s = 0; s < stepsWanted; s++) {
          if (now() - tStart > budgetMs) break;

          frame++;
          if (frame >= BASE_FRAMES) break;

          while (tIdx < timeline.length && timeline[tIdx].frame <= frame) {
            const ev = timeline[tIdx++];
            processSmartEvent(ev, ball, homePlayers, awayPlayers, W, H, result,
              { homeScore, awayScore, pushCommentary,
                onGoalHome: () => { homeScore++; document.getElementById("matchScoreHome").textContent = homeScore; goalCelebration = 90; },
                onGoalAway: () => { awayScore++; document.getElementById("matchScoreAway").textContent = awayScore; goalCelebration = 90; },
                onFlash: (msg, col, dur) => { activeFlash = { msg, col }; flashTimer = dur || 70; }
              });
          }

          ball.trail.push({ x: ball.cx, y: ball.cy });
          if (ball.trail.length > 8) ball.trail.shift();

          if (goalCelebration > 0) {
            goalCelebration--;
            ball.cx += Math.sin(frame * 0.25) * 2.5;
            ball.cy += Math.cos(frame * 0.2) * 2;
          } else {
            const dx = (ball.tx || 0) - ball.cx, dy = (ball.ty || 0) - ball.cy;
            const dist = Math.hypot(dx, dy);
            const spd = ball.speed + (dist > 120 ? 3 : 0);
            if (dist > 0.1) {
              const move = Math.min(dist, spd);
              ball.cx += (dx/dist)*move; ball.cy += (dy/dist)*move;
            } else { ball.cx = ball.tx; ball.cy = ball.ty; }
            ball.cx += (Math.random()-0.5) * 0.3;
            ball.cy += (Math.random()-0.5) * 0.3;
          }
          ball.spinning++;

          if (frame % decisionMod === 0) {
            homePlayers.forEach(p => !p.redCarded && makeAIDecision(p, ball, homePlayers, awayPlayers, W, H, "home", frame));
            awayPlayers.forEach(p => !p.redCarded && makeAIDecision(p, ball, awayPlayers, homePlayers, W, H, "away", frame));
          }

          const lerp = goalCelebration > 0 ? 0.03 : 0.07;
          [...homePlayers, ...awayPlayers].forEach(p => {
            if (p.redCarded) return;
            const spd = goalCelebration > 0 ? 0.02 : lerp;
            const tX = p.targetX ?? p.cx;
            const tY = p.targetY ?? p.cy;
            p.cx += (tX - p.cx) * spd + (Math.random()-0.5)*0.15;
            p.cy += (tY - p.cy) * spd + (Math.random()-0.5)*0.15;
            
            // NaN safety
            if (isNaN(p.cx)) p.cx = p.baseCx || W/2;
            if (isNaN(p.cy)) p.cy = p.baseCy || H/2;
          });
        }
      } catch (e) {
        console.error("Match logic error:", e);
        if (matchAnimFrame) { cancelAnimationFrame(matchAnimFrame); matchAnimFrame = null; }
        setTimeout(() => showMatchResult(result), 0);
        return;
      }

      // ── RENDER ──
      try {
        ctx.clearRect(0, 0, W, H);
        drawField(ctx, W, H);

        // Ball trail
        ball.trail.forEach((pt, i) => {
          const alpha = (i / ball.trail.length) * 0.25;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3 * (i/ball.trail.length), 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fill();
        });

        // Draw players
        const rColor = { GK:"#facc15", DEF:"#3b82f6", MID:"#22c55e", ATT:"#ef4444" };
        function getRoleColor(role) {
          const r = (role||"").toUpperCase();
          if (r==="GK") return "#facc15";
          if (r.includes("CB")||r==="LB"||r==="RB"||r==="DEF") return "#3b82f6";
          if (r.includes("CM")||r.includes("DM")||r.includes("AM")||r==="LM"||r==="RM"||r==="MID") return "#22c55e";
          return "#ef4444";
        }

        // Shadow pass (Fixed: ellipse fallback)
        [...homePlayers, ...awayPlayers].forEach(p => {
          if (p.redCarded) return;
          ctx.beginPath();
          if (ctx.ellipse) {
            ctx.ellipse(p.cx, p.cy+13, 10, 4, 0, 0, Math.PI*2);
          } else {
            ctx.save(); ctx.translate(p.cx, p.cy+13); ctx.scale(1, 0.4);
            ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.restore();
          }
          ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
        });

        // Players
        awayPlayers.forEach(p => {
          if (p.redCarded) return;
          drawSmartPlayer(ctx, p, "#ef4444", true, frame);
        });
        homePlayers.forEach(p => {
          if (p.redCarded) return;
          drawSmartPlayer(ctx, p, getRoleColor(p.role), false, frame);
        });

        // Ball
        drawAnimBall(ctx, ball, frame);

        // Minute HUD
        const minute = Math.min(90, Math.floor((frame/BASE_FRAMES)*90));
        drawHUD(ctx, W, H, minute, homeScore, awayScore, _matchSpeed);

        // Flash overlay
        if (activeFlash && flashTimer > 0) {
          flashTimer--;
          drawFlashOverlay(ctx, W, H, activeFlash.msg, activeFlash.col, flashTimer);
          if (flashTimer <= 0) activeFlash = null;
        }

        // Commentary overlay (canvas text, non-intrusive)
        drawCommentaryOverlay(ctx, W, H, commentary, frame);
        commentary.forEach(c => c.age++);

        if (frame < BASE_FRAMES) {
          matchAnimFrame = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(matchAnimFrame);
          matchAnimFrame = null;
          setTimeout(() => showMatchResult(result), 600);
        }
      } catch (e) {
        console.error("Match render error:", e);
        if (matchAnimFrame) { cancelAnimationFrame(matchAnimFrame); matchAnimFrame = null; }
        setTimeout(() => showMatchResult(result), 0);
      }
    }

    const enLabel = document.getElementById("enemyNameLabel");
    if (enLabel && result.enemyName) enLabel.textContent = "👾 " + result.enemyName;

    tick();
  }).catch(() => showMatchResult(result));
}

/* ── Draw smart player dot ── */
function drawSmartPlayer(ctx, p, color, isEnemy, frame) {
  const x = p.cx, y = p.cy;
  const r = 12;

  // Mode indicator glow
  const modeGlow = { chase:"rgba(255,255,100,0.25)", attack:"rgba(255,50,50,0.2)", press:"rgba(255,150,0,0.2)" };
  if (modeGlow[p.aiMode]) {
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI*2);
    ctx.fillStyle = modeGlow[p.aiMode];
    ctx.fill();
  }

  // Body
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
  const g = ctx.createRadialGradient(x-3,y-3,2,x,y,r);
  g.addColorStop(0, color+"ee"); g.addColorStop(1, color+"99");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = isEnemy ? "#ff8888" : "#fff";
  ctx.lineWidth = isEnemy ? 1.5 : 2; ctx.stroke();

  // Inner
  ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();

  // Name tag (home only)
  if (!isEnemy && p.name) {
    const short = p.name.split(" ")[0].substring(0,7);
    ctx.font = "7.5px Arial"; ctx.textAlign = "center";
    const tw = ctx.measureText(short).width;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    if (ctx.roundRect) ctx.roundRect(x-tw/2-3,y-27,tw+6,12,3);
    else ctx.rect(x-tw/2-3,y-27,tw+6,12);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(short,x,y-17);
  }

  // Tired indicator
  if (p.tired) {
    ctx.fillStyle = "#f59e0b"; ctx.font = "8px Arial";
    ctx.fillText("💧", x+8, y-8);
  }
}

/* ── Draw animated ball ── */
function drawAnimBall(ctx, ball, frame) {
  const x = ball.cx, y = ball.cy, r = 7;
  const rot = (frame * 0.2 * _matchSpeed) % (Math.PI*2);

  // Shadow
  ctx.beginPath(); ctx.ellipse(x, y+r+3, r+1, 3, 0, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();

  // Ball
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
  const bg = ctx.createRadialGradient(-2,-2,1,0,0,r);
  bg.addColorStop(0,"#fff"); bg.addColorStop(1,"#cbd5e1");
  ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle="#475569"; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle="#1e293b";
  [[0,0,2.5],[-3.8,2,1.5],[3.8,2,1.5],[0,-4,1.5]].forEach(([bx,by,br]) => {
    ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

/* ── HUD ── */
function drawHUD(ctx, W, H, minute, hs, as, speed) {
  // Minute pill
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  if (ctx.roundRect) ctx.roundRect(8,8,70,22,5); else ctx.rect(8,8,70,22);
  ctx.fill();
  ctx.fillStyle = "#22c55e"; ctx.font = "bold 11px Arial"; ctx.textAlign = "left";
  ctx.fillText(`⏱ ${minute}'`, 13, 23);

  // Speed badge
  if (speed > 1) {
    ctx.fillStyle = speed===3 ? "rgba(239,68,68,0.85)" : "rgba(245,158,11,0.85)";
    if (ctx.roundRect) ctx.roundRect(W-44,8,36,22,5); else ctx.rect(W-44,8,36,22);
    ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="bold 11px Arial"; ctx.textAlign="right";
    ctx.fillText(`${speed}×`, W-11, 23);
  }
}

/* ── Flash overlay ── */
function drawFlashOverlay(ctx, W, H, msg, col, timer) {
  const alpha = Math.min(1, timer/15);
  ctx.save(); ctx.globalAlpha = alpha;

  if (msg.includes("GOAL")) {
    ctx.fillStyle = "rgba(250,204,21,0.07)"; ctx.fillRect(0,0,W,H);
    ctx.font = "bold 46px Arial"; ctx.textAlign = "center";
    ctx.fillStyle = "#facc15"; ctx.shadowColor = "#000"; ctx.shadowBlur = 18;
    const scale = 1 + Math.sin(timer*0.15)*0.08;
    ctx.save(); ctx.translate(W/2,H/2-10); ctx.scale(scale,scale);
    ctx.fillText(msg, 0, 0); ctx.restore();
    // Confetti
    for (let i=0;i<6;i++) {
      const a = (i/6)*Math.PI*2 + timer*0.08;
      const ri = 50 + (70-timer)*2;
      ctx.beginPath(); ctx.arc(W/2+Math.cos(a)*ri, H/2+Math.sin(a)*ri, 5, 0, Math.PI*2);
      ctx.fillStyle = ["#facc15","#22c55e","#ef4444","#fff","#a855f7","#f97316"][i];
      ctx.fill();
    }
  } else if (msg.includes("KARTU")) {
    const isRed = msg.includes("MERAH");
    ctx.fillStyle = isRed ? "rgba(239,68,68,0.1)" : "rgba(250,204,21,0.08)";
    ctx.fillRect(0,0,W,H);
    ctx.font = "bold 22px Arial"; ctx.textAlign = "center";
    ctx.fillStyle = isRed ? "#ef4444" : "#facc15";
    ctx.shadowColor = "#000"; ctx.shadowBlur = 10;
    ctx.fillText(msg, W/2, H*0.22);
  } else if (msg.includes("PENALTI")) {
    ctx.fillStyle = "rgba(168,85,247,0.1)"; ctx.fillRect(0,0,W,H);
    ctx.font = "bold 32px Arial"; ctx.textAlign = "center";
    ctx.fillStyle = "#a855f7"; ctx.shadowColor = "#000"; ctx.shadowBlur = 12;
    ctx.fillText(msg, W/2, H/2-8);
  } else {
    ctx.font = "bold 18px Arial"; ctx.textAlign = "center";
    ctx.fillStyle = col || "#22c55e"; ctx.shadowColor = "#000"; ctx.shadowBlur = 8;
    ctx.fillText(msg, W/2, H*0.18);
  }
  ctx.restore();
}

/* ── Commentary overlay ── */
function drawCommentaryOverlay(ctx, W, H, comments, frame) {
  if (!comments.length) return;
  comments.slice(0,2).forEach((c, i) => {
    const age = c.age;
    const maxAge = 120;
    if (age > maxAge) return;
    const alpha = age < 15 ? age/15 : age > maxAge-20 ? (maxAge-age)/20 : 0.8;
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "left";
    const tw = ctx.measureText(c.text).width;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    const bx = 10, by = H - 50 - i*22;
    if (ctx.roundRect) ctx.roundRect(bx-3, by-12, tw+10, 16, 4);
    else ctx.rect(bx-3, by-12, tw+10, 16);
    ctx.fill();
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, bx, by);
    ctx.restore();
  });
}

/* ── Smart timeline builder ── */
function buildSmartTimeline(result, W, H) {
  const [ps, es] = (result.score||"0-0").split("-").map(Number);
  const TOTAL = 480;
  const events = [];
  const playerNames = result.lineupNames || [];
  const rnd = () => Math.random();

  // Kick off
  events.push({frame:5, fn:(b,hp,ap,cb)=>{ cb.pushCommentary("⚽ Kick Off!", "#22c55e"); b.tx=W/2+30; b.ty=H/2; }});

  // Foul events (1-3)
  const foulCount = 1 + Math.floor(rnd()*3);
  for (let i=0; i<foulCount; i++) {
    const ff = 50 + Math.floor(rnd()*200);
    const isHome = rnd()>0.5;
    const foulX = W*(0.25+rnd()*0.5), foulY = H*(0.2+rnd()*0.6);
    const reasons = ["Tackle keras","Hands ball","Obstruction","Pelanggaran"];
    const reason = reasons[Math.floor(rnd()*reasons.length)];
    events.push({ frame: ff, fn:(b,hp,ap,cb)=>{
      b.tx = foulX; b.ty = foulY;
      const pname = isHome && result.lineup
        ? (Object.keys(result.lineup||{})[Math.floor(rnd()*5)] || "Player") : "Lawan";
      cb.pushCommentary(`🦵 Pelanggaran oleh ${pname}!`, "#f97316");
      // Yellow card chance 50%
      if (rnd() < 0.5) {
        setTimeout(()=> cb.onFlash(`🟨 KARTU KUNING — ${pname}`, "#facc15", 80), 500/_matchSpeed);
        cb.pushCommentary(`🟨 Kartu Kuning: ${pname}`, "#facc15");
      }
    }});
  }

  // Penalty 12% chance
  if (rnd() < 0.12) {
    const pf = 100 + Math.floor(rnd()*200);
    const isHome = rnd() > 0.5;
    events.push({ frame: pf, fn:(b,hp,ap,cb)=>{
      b.tx = isHome ? W*0.88 : W*0.12;
      b.ty = H/2;
      cb.onFlash("⚡ PENALTI!", "#a855f7", 100);
      cb.pushCommentary("⚡ PENALTI diberikan!", "#a855f7");
    }});
  }

  // Red card 8% chance
  if (rnd() < 0.08) {
    const rf = 120 + Math.floor(rnd()*180);
    const isHome = rnd() > 0.5;
    events.push({ frame: rf, fn:(b,hp,ap,cb)=>{
      cb.onFlash("🟥 KARTU MERAH!", "#ef4444", 110);
      cb.pushCommentary("🟥 Kartu Merah! 10 orang!", "#ef4444");
      // Remove a player
      const pool = isHome ? hp : ap;
      const toRemove = pool.filter(p => p.role !== "GK" && !p.redCarded);
      if (toRemove.length) toRemove[Math.floor(rnd()*toRemove.length)].redCarded = true;
    }});
  }

  // Goals home
  distributeFrames(ps, TOTAL).forEach(f => {
    events.push({ frame:f, type:"goal_home", fn:(b,hp,ap,cb)=>{
      b.tx = W-10; b.ty = H/2 + (rnd()-0.5)*30;
      cb.onGoalHome();
      cb.onFlash("⚽ GOAL!", "#facc15", 120);
      // Commentary: scorer
      const scorer = hp.find(p=>p.role?.includes("ST")||p.role?.includes("LW")) || hp[0];
      cb.pushCommentary(`⚽ GOOOL! ${scorer?.name||"My Team"}!`, "#facc15");
    }});
  });

  // Goals away
  distributeFrames(es, TOTAL).forEach(f => {
    events.push({ frame:f, type:"goal_away", fn:(b,hp,ap,cb)=>{
      b.tx = 10; b.ty = H/2 + (rnd()-0.5)*30;
      cb.onGoalAway();
      cb.onFlash("😱 GOAL! " + (result.enemyName||"Enemy"), "#ef4444", 100);
      cb.pushCommentary(`😱 ${result.enemyName||"Enemy"} mencetak gol!`, "#ef4444");
    }});
  });

  // Skills
  if (result.skillEvents?.length) {
    result.skillEvents.slice(0,3).forEach((sk,i)=>{
      events.push({ frame: 40+i*90, fn:(b,hp,ap,cb)=>{
        cb.pushCommentary(`✨ Skill: ${sk.name||sk.skill}`, "#22c55e");
        cb.onFlash("✨ " + (sk.name||sk.skill), "#22c55e", 50);
        b.tx = W/2+(rnd()-0.5)*100; b.ty=H/2+(rnd()-0.5)*70;
      }});
    });
  }

  // Half time
  events.push({ frame: Math.floor(TOTAL*0.47), fn:(b,hp,ap,cb)=>{
    b.tx=W/2; b.ty=H/2;
    cb.pushCommentary("⏱ Half Time", "#64748b");
    cb.onFlash("⏱ HALF TIME", "#64748b", 70);
  }});

  // Random commentary events
  const commentaryLines = [
    ["Umpan terobosan!", "#22c55e"], ["Tembakan melebar!", "#94a3b8"],
    ["Sundulan kuat!", "#facc15"], ["Bola dikuasai lawan", "#94a3b8"],
    ["Crossing berbahaya!", "#f97316"], ["GK bereaksi cepat!", "#3b82f6"],
    ["Peluang emas terbuang!", "#ef4444"], ["Permainan cantik!", "#22c55e"]
  ];
  for (let i=0;i<6;i++) {
    const cf = 30+Math.floor(rnd()*(TOTAL-60));
    const [line, col] = commentaryLines[Math.floor(rnd()*commentaryLines.length)];
    const bx=W*(0.2+rnd()*0.6), by=H*(0.2+rnd()*0.6);
    events.push({ frame:cf, fn:(b,hp,ap,cb)=>{ b.tx=bx; b.ty=by; cb.pushCommentary(line, col); } });
  }

  events.sort((a,b)=>a.frame-b.frame);
  return events;
}

function processSmartEvent(ev, ball, hp, ap, W, H, result, cb) {
  if (ev.fn) ev.fn(ball, hp, ap, cb);
}

/* ── distributeFrames (safe fallback) ── */
if (typeof distributeFrames === "undefined") {
  window.distributeFrames = function(count, total) {
    const frames=[];
    for(let i=0;i<count;i++) frames.push(Math.floor(80+(i+1)*(total-160)/(count+1)));
    return frames;
  };
}

/* ================================================================
   PATCH 3 — CSS INJECTED
================================================================ */
(function injectPatchCSS() {
  const s = document.createElement("style");
  s.id = "patch3-css";
  s.textContent = `
/* ── Gacha 10x Grid ── */
.g10-wrapper {
  display:flex; flex-direction:column; align-items:center;
  gap:12px; width:100%; padding:10px;
}
.g10-title {
  font-family:'Orbitron','Rajdhani',sans-serif;
  font-size:13px; color:#22c55e; letter-spacing:2px;
}
.g10-grid {
  display:grid; grid-template-columns:repeat(5,1fr);
  gap:8px; width:100%; max-width:700px;
}
@media(max-width:600px){
  .g10-grid { grid-template-columns:repeat(5,1fr); gap:5px; }
}
.g10-card-wrap {
  position:relative; aspect-ratio:2/3;
  perspective:600px;
}
.g10-card {
  width:100%; height:100%;
  transform-style:preserve-3d;
  transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);
  cursor:default;
}
.g10-card.flipped { transform:rotateY(180deg); }
.g10-front, .g10-back {
  position:absolute; inset:0; border-radius:10px;
  backface-visibility:hidden;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  gap:4px; padding:6px;
  border:1px solid #1e293b;
}
.g10-front {
  background:linear-gradient(145deg,#0f172a,#1e293b);
}
.g10-question { font-size:22px; }
.g10-back {
  background:linear-gradient(145deg,#0a0f1e,#1a2030);
  border-color:var(--rc,#334155);
  box-shadow:0 0 12px var(--rc,#334155)30;
  transform:rotateY(180deg);
}
.g10-rarity { font-size:9px; font-weight:800; letter-spacing:1px; }
.g10-icon { font-size:20px; }
.g10-name { font-size:8px; font-weight:700; text-align:center; line-height:1.2; }
.g10-power { font-size:9px; font-family:'Orbitron',sans-serif; }
.g10-slot { font-size:8px; }

.g10-card-wrap.g10-highlight .g10-back {
  box-shadow:0 0 20px var(--rc,#f59e0b)60;
  animation:g10pulse 0.8s ease-in-out;
}
.g10-card-wrap.g10-ssr .g10-back {
  animation:g10ssr 1s ease-in-out;
}
@keyframes g10pulse {
  0%,100%{ transform:rotateY(180deg) scale(1); }
  50%    { transform:rotateY(180deg) scale(1.08); }
}
@keyframes g10ssr {
  0%,100%{ box-shadow:0 0 20px gold; }
  50%    { box-shadow:0 0 50px gold, 0 0 80px gold; }
}

.g10-summary {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  justify-content:center; padding:8px 12px;
  background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.15);
  border-radius:10px; max-width:700px; width:100%;
}
.g10-sum-title { font-size:11px; color:#22c55e; font-family:'Rajdhani',sans-serif; letter-spacing:1px; width:100%; text-align:center; }
.g10-sum-item {
  border:1px solid; border-radius:8px; padding:3px 8px;
  font-size:10px; font-weight:700; font-family:'Rajdhani',sans-serif;
}

/* ── Match Speed Control ── */
.match-speed-control {
  display:flex; gap:4px; align-items:center;
  background:rgba(7,31,13,0.8); border:1px solid #0d3018;
  border-radius:8px; padding:3px 5px;
}
.speed-btn {
  padding:4px 10px; border-radius:6px;
  background:transparent; border:1px solid transparent;
  color:#4a8860; font-family:'Orbitron',sans-serif;
  font-size:11px; font-weight:700; cursor:pointer; transition:0.15s;
}
.speed-btn:hover { background:rgba(34,197,94,0.1); color:#22c55e; }
.speed-btn.active {
  background:linear-gradient(135deg,#071f0d,#0d3018);
  border-color:#22c55e; color:#22c55e;
  box-shadow:0 0 8px rgba(34,197,94,0.2);
}

/* ── Match Commentary ── */
.match-commentary {
  position:absolute; bottom:6px; left:6px;
  pointer-events:none; z-index:10;
}
.match-field-wrap { position:relative; }

/* ── Match wrapper improve ── */
.match-wrapper { max-width:1000px; margin:0 auto; }
  `;
  if (!document.getElementById("patch3-css")) document.head.appendChild(s);
})();

/* ══════════════════════════════════════════════════════
   FITUR 5: Equip Picker Modal — klik item langsung pilih player
   ══════════════════════════════════════════════════════ */
function openEquipPickerModal(equipId, slot) {
  fetch("/team").then(r=>r.json()).then(d => {
    document.getElementById("equipPickerModal")?.remove();
    const modal = document.createElement("div");
    modal.id = "equipPickerModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";

    const allEq = d.allEquipment || [...(d.inventory||[])];
    const equip = allEq.find(e => String(e.id) === String(equipId));
    const targetSlot = slot || equip?.slot || "";

    function roleGroup(r) {
      const v = (r||"").toUpperCase();
      if(["ST","CF","LW","RW","SS"].some(x=>v.includes(x))) return "ATT";
      if(["CM","AM","DM","LM","RM","MF"].some(x=>v.includes(x))) return "MID";
      if(["CB","LB","RB","SW","WB"].some(x=>v.includes(x))) return "DEF";
      if(v.includes("GK")) return "GK";
      return "ALL";
    }

    const team = d.team || [];
    const eligiblePlayers = team.filter(p => {
      if (!equip) return true;
      const eRole = (equip.role||"ALL").toUpperCase();
      if (eRole === "ALL") return true;
      const pRole = (p.role||p.type||"").toUpperCase();
      if (pRole === eRole) return true;
      if (roleGroup(pRole) === eRole) return true;
      if (roleGroup(pRole) === roleGroup(eRole)) return true;
      return false;
    });

    // Build modal box
    const box = document.createElement("div");
    box.style.cssText = "background:#0f172a;border:1px solid #1e3a5f;border-radius:14px;padding:20px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto";

    // Header
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:14px";
    const title = document.createElement("h3");
    title.style.cssText = "margin:0;color:#f1f5f9";
    title.textContent = "Pasang ke Pemain";
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = "background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer";
    closeBtn.textContent = "✕";
    closeBtn.onclick = () => modal.remove();
    header.appendChild(title); header.appendChild(closeBtn);
    box.appendChild(header);

    // Equip info
    if (equip) {
      const info = document.createElement("div");
      info.style.cssText = "background:#1e293b;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px";
      const eqRole = equip.role || "ALL";
      info.innerHTML = `<b style="color:#facc15">${equip.name}</b> <span style="color:#64748b">${equip.slot} · ⚡${equip.power}</span> <span style="font-size:11px;color:${eqRole==='ALL'?'#22c55e':'#f59e0b'}">${eqRole==='ALL'?'· Semua posisi':'· Khusus '+eqRole}</span>`;
      box.appendChild(info);
    }

    // Player list
    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px";

    if (!eligiblePlayers.length) {
      const msg = document.createElement("div");
      msg.style.cssText = "color:#ef4444;font-size:13px;padding:12px;text-align:center";
      msg.innerHTML = `❌ Tidak ada pemain yang cocok untuk equipment ini`;
      list.appendChild(msg);
    }

    eligiblePlayers.forEach(p => {
      const alreadyEquipped = p.equipment && p.equipment[targetSlot];
      const curEq = alreadyEquipped ? allEq.find(e=>String(e.id)===String(alreadyEquipped)) : null;

      const row = document.createElement("div");
      row.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 12px;background:#1e293b;border:1px solid ${alreadyEquipped?'#f59e0b':'#334155'};border-radius:8px;cursor:pointer;transition:border-color 0.2s`;
      row.onmouseover = () => row.style.borderColor = "#3b82f6";
      row.onmouseout = () => row.style.borderColor = alreadyEquipped ? "#f59e0b" : "#334155";
      row.innerHTML = `
        <img src="${p.image||'https://api.dicebear.com/7.x/bottts/svg?seed='+p.id}" style="width:36px;height:36px;border-radius:50%;border:2px solid ${alreadyEquipped?'#f59e0b':'#334155'}">
        <div style="flex:1">
          <b style="font-size:13px;color:#f1f5f9">${p.name}</b>
          <div style="font-size:11px;color:#64748b">${p.role||p.type} · Lv${p.level||1} · ⚡${p.basePower||p.power||50}</div>
          ${curEq?`<div style="font-size:10px;color:#f59e0b;margin-top:2px">🔄 Ganti: ${curEq.name}</div>`:''}
        </div>
        <span style="font-size:11px;color:${alreadyEquipped?'#f59e0b':'#22c55e'}">${alreadyEquipped?'Ada equip':'Pasang ▸'}</span>`;

      // Use closure to capture correct values
      const capturedEquipId = String(equipId);
      const capturedPlayerId = String(p.id);
      const capturedSlot = targetSlot;
      row.onclick = () => doEquipPick(capturedEquipId, capturedPlayerId, capturedSlot, row);
      list.appendChild(row);
    });

    box.appendChild(list);
    modal.appendChild(box);
    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if(e.target===modal) modal.remove(); });
  });
}

function doEquipPick(equipId, playerId, slot, el) {
  fetch("/equip", {method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({playerId, equipmentId:equipId, slot})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast("✅ Equipment terpasang!","success");
      document.getElementById("equipPickerModal")?.remove();
      const active = document.querySelector(".nav-btn.active")?.id || "";
      if (active === "navInventory") showInventory();
      else showTeam();
    });
}

/* ══════════════════════════════════════════════════════
   FITUR 4: Klik jadwal lihat highlights pertandingan
   ══════════════════════════════════════════════════════ */
function showMatchDetail(idx, mode) {
  const url = mode === "career" ? "/career/match/"+idx : "/liga/match/"+idx;
  fetch(url, {credentials:"include"}).then(r=>r.json()).then(d=>{
    const modal = document.createElement("div");
    modal.id = "matchDetailModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";

    let body = "";
    if (!d.played) {
      const opp = d.opponent || {};
      body = '<div style="text-align:center;color:#64748b;padding:20px">'
        +(opp.logo||"⚽")+' <b>'+(opp.name||opp.club?.name||"?")+'</b><br>'
        +'<span style="font-size:13px">Belum dimainkan</span></div>';
    } else {
      const hl = d.highlights || {};
      const goals = hl.goalEvents || [];
      const cards = hl.cardEvents || [];
      const opp = d.opponent || d.club || {};
      const [myG, opG] = (d.score||"0-0").split("-");
      const rc = d.result==="WIN"?"#22c55e":d.result==="LOSE"?"#ef4444":"#facc15";

      body = '<div style="text-align:center;margin-bottom:16px">'
        +'<div style="font-size:28px;font-weight:bold;color:'+rc+'">'+d.result+'</div>'
        +'<div style="font-size:22px;margin:6px 0">'
        +'<span style="color:#22c55e">'+myG+'</span>'
        +' <span style="color:#475569">–</span> '
        +'<span style="color:#ef4444">'+opG+'</span></div>'
        +'<div style="font-size:13px;color:#94a3b8">'+(opp.logo||"⚽")+' '+(opp.name||opp.club?.name||"Lawan")+'</div>'
        +'</div>';

      if (goals.length) {
        body += '<div style="margin-bottom:12px"><div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">⚽ Gol</div>';
        goals.forEach(g => {
          const isHome = g.team === "home";
          body += '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1e293b">'
            +'<span style="font-size:11px;color:#64748b;min-width:28px">'+g.minute+"'</span>"
            +'<span style="font-size:14px">⚽</span>'
            +'<div style="flex:1"><span style="color:'+(isHome?"#22c55e":"#ef4444")+'">'+g.scorerName+'</span>'
            +(g.assistName?'<span style="font-size:11px;color:#64748b"> (🅰️ '+g.assistName+')</span>':'')
            +'</div></div>';
        });
        body += '</div>';
      }

      if (cards.length) {
        body += '<div><div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">🟨 Kartu</div>';
        cards.forEach(c => {
          body += '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1e293b">'
            +'<span style="font-size:11px;color:#64748b;min-width:28px">'+c.minute+"'</span>"
            +'<span>'+(c.type==="red"?"🟥":"🟨")+'</span>'
            +'<span style="color:#f1f5f9">'+c.playerName+'</span>'
            +'</div>';
        });
        body += '</div>';
      }

      if (!goals.length && !cards.length) {
        body += '<div style="color:#64748b;text-align:center;padding:16px">Tidak ada highlight tersimpan</div>';
      }
    }

    modal.innerHTML = '<div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:14px;padding:20px;max-width:400px;width:100%;max-height:80vh;overflow-y:auto">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
      +'<h3 style="margin:0;color:#f1f5f9">Matchday '+(d.matchday||"")+'</h3>'
      +'<button onclick="document.getElementById(\'matchDetailModal\').remove()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer">✕</button></div>'
      +body+'</div>';

    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if(e.target===modal) modal.remove(); });
  });
}

/* ══════════════════════════════════════════════════════
   FITUR 2: Top Scorer / Assist / Kartu
   ══════════════════════════════════════════════════════ */
function showTopScorers(mode) {
  const url = mode === "career" ? "/career/topscorers" : "/liga/topscorers";
  fetch(url, {credentials:"include"}).then(r=>r.json()).then(d=>{
    const modal = document.createElement("div");
    modal.id = "topScorerModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";

    function buildTable(title, icon, data, cols) {
      if (!data || !data.length) return '<div style="color:#64748b;font-size:12px;padding:8px">Belum ada data</div>';
      return '<div style="margin-bottom:18px">'
        +'<div style="font-size:13px;font-weight:bold;color:#94a3b8;margin-bottom:8px">'+icon+' '+title+'</div>'
        +data.map((p,i)=>'<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1e293b">'
          +'<span style="font-size:12px;color:#475569;min-width:20px">'+(i+1)+'.</span>'
          +'<span style="flex:1;color:#f1f5f9;font-size:13px">'+p.name+'</span>'
          +cols.map(c=>'<span style="font-size:13px;font-weight:bold;color:'+c.color+'">'+c.icon+(p[c.key]||0)+'</span>').join("")
          +'</div>'
        ).join("")+'</div>';
    }

    const body = buildTable("Top Pencetak Gol","⚽",d.topScorers,[{key:"goals",icon:"⚽",color:"#22c55e"}])
      + buildTable("Top Assist","🅰️",d.topAssists,[{key:"assists",icon:"🅰️",color:"#3b82f6"}])
      + buildTable("Kartu Terbanyak","🟨",d.topCards,[{key:"yellow",icon:"🟨",color:"#facc15"},{key:"red",icon:"🟥",color:"#ef4444"}]);

    modal.innerHTML = '<div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:14px;padding:20px;max-width:400px;width:100%;max-height:80vh;overflow-y:auto">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
      +'<h3 style="margin:0;color:#f1f5f9">📊 Statistik '+(mode==="career"?"Career":"Liga")+'</h3>'
      +'<button onclick="document.getElementById(\'topScorerModal\').remove()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer">✕</button></div>'
      +body+'</div>';

    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if(e.target===modal) modal.remove(); });
  });
}

/* ══════════════════════════════════════════════════════
   CSS tambahan untuk highlights & modal
   ══════════════════════════════════════════════════════ */
(function() {
  const s = document.createElement("style");
  s.textContent = `
/* Highlights timeline */
.match-highlights { margin:14px auto; max-width:480px; background:#0f172a; border:1px solid #1e3a5f; border-radius:10px; padding:12px 14px; }
.hl-title { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
.hl-timeline { display:flex; flex-direction:column; gap:6px; }
.hl-event { display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid #1e293b; }
.hl-event.home .hl-scorer { color:#22c55e; }
.hl-event.away .hl-scorer { color:#ef4444; }
.hl-min { font-size:11px; color:#475569; min-width:28px; }
.hl-goal-icon { font-size:14px; }
.hl-scorer { font-size:13px; font-weight:500; }
.hl-assist { font-size:11px; color:#64748b; margin-left:4px; }
/* Equip item hover */
.equip-item:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(59,130,246,0.3); }
  `;
  if (!document.getElementById("feat-new-css")) { s.id="feat-new-css"; document.head.appendChild(s); }
})();
/* ============================================================
   NEW FEATURES FRONTEND
   AFC, AFF, Cups, Derby, Academy, Free Agents, Icons, Sponsor
============================================================ */

// ── Shared helper ──
function compMatchCard(m, idx, mode, club) {
  const cls = m.played ? (m.result==="WIN"?"fg-win":m.result==="LOSE"?"fg-lose":"fg-draw") : idx===0?"fg-next":"fg-pending";
  const clubName = club?.name || m.club?.name || m.opponent || "?";
  const clubLogo = club?.logo || m.club?.logo || "⚽";
  return `<div class="fixture-cell ${cls}" title="${clubName}" style="cursor:pointer">
    <div class="fc-num">${idx+1}</div>
    <div class="fc-logo">${clubLogo}</div>
    <div class="fc-score">${m.played?m.score:idx===0?"NOW":"—"}</div>
  </div>`;
}

// ── SPONSOR ──────────────────────────────────────────────────
function showSponsorBar() {
  fetch("/sponsor").then(r=>r.json()).then(d=>{
    const existing = document.getElementById("sponsorBar");
    if (existing) existing.remove();
    if (!d.sponsor || d.sponsor.name==="No Sponsor") return;
    const bar = document.createElement("div");
    bar.id = "sponsorBar";
    bar.className = "sponsor-bar";
    bar.innerHTML = `<div class="sponsor-logo">${d.sponsor.logo}</div>
      <div class="sponsor-info">
        <div class="sponsor-name">🤝 Sponsor: <b>${d.sponsor.name}</b></div>
        <div class="sponsor-bonus">+${d.sponsor.bonusCoin} coin/match (Win Streak: ${d.winStreak||0})</div>
      </div>
      ${d.nextTier?`<div style="font-size:10px;color:#4a8860">${d.nextTier.minWinStreak - (d.winStreak||0)} menang lagi → ${d.nextTier.name}</div>`:"<div style='font-size:10px;color:#f59e0b'>MAX TIER!</div>"}`;
    const c = document.getElementById("content");
    if (c) c.prepend(bar);
  }).catch(()=>{});
}

// ── AFC CHAMPIONS LEAGUE ─────────────────────────────────────
// ── AFC CHAMPIONS LEAGUE (Feature #5 + #7 + #8) ──────────────
function _knockoutMatchCard(match, matchId, compType) {
  if (!match) return '';
  const h = match.home, a = match.away;
  if (match.played) {
    const r = match.result || {};
    return `<div style="background:rgba(7,31,13,0.8);border:1px solid #0d3018;border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="font-size:10px;color:#4a8860;margin-bottom:8px;text-transform:uppercase">${matchId==='final'?'🏆 FINAL':matchId==='third'?'🥉 3rd Place':'⚡ Semi Final'}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:13px;font-weight:700;color:${h?.isMe?'#22c55e':'#e8f5ec'}">${h?.logo||''} ${(h?.name||'').split(' ')[0]}</span>
        <span style="font-size:16px;font-family:'Orbitron',sans-serif;color:#f59e0b;padding:0 12px">${r.score||'?-?'}</span>
        <span style="font-size:13px;font-weight:700;color:${a?.isMe?'#22c55e':'#e8f5ec'}">${(a?.name||'').split(' ')[0]} ${a?.logo||''}</span>
      </div>
    </div>`;
  }
  const myInvolved = h?.isMe || a?.isMe;
  const isFinal = matchId === 'final';
  // Determine action button:
  // - Player involved → Kick Off
  // - Final with 2 AI teams → "Saksikan Final" (auto-simulate AI)
  // - SF waiting → show waiting message
  let actionHtml;
  if (myInvolved) {
    actionHtml = `<button class="liga-play-btn" onclick="playKnockout('${compType}','${matchId}')">⚽ KICK OFF!</button>`;
  } else if (isFinal) {
    actionHtml = `<div style="display:flex;flex-direction:column;gap:8px;align-items:center">
      <div style="font-size:11px;color:#64748b">Kamu tidak lolos ke Final — saksikan pertandingan AI</div>
      <button class="liga-play-btn" style="background:rgba(100,116,139,0.2);border-color:#475569;font-size:12px"
        onclick="playKnockout('${compType}','${matchId}')">👁️ Saksikan & Selesaikan Final</button>
    </div>`;
  } else {
    actionHtml = `<div style="color:#4a8860;font-size:11px;text-align:center">⏳ Menunggu hasil semi final lain...</div>`;
  }
  return `<div style="background:rgba(7,31,13,0.8);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:12px;margin-bottom:8px">
    <div style="font-size:10px;color:#f59e0b;margin-bottom:8px;text-transform:uppercase">${isFinal?'🏆 FINAL':'⚡ Semi Final'} — UPCOMING</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-size:13px;font-weight:700;color:${h?.isMe?'#22c55e':'#e8f5ec'}">${h?.logo||''} ${(h?.name||'').split(' ')[0]}</span>
      <span style="color:#4a8860">VS</span>
      <span style="font-size:13px;font-weight:700;color:${a?.isMe?'#22c55e':'#e8f5ec'}">${(a?.name||'').split(' ')[0]} ${a?.logo||''}</span>
    </div>
    ${actionHtml}
  </div>`;
}

function _renderKnockoutBracket(ko, compType) {
  if (!ko) return '';
  const sf1 = ko.semiFinals?.[0], sf2 = ko.semiFinals?.[1];
  const final = ko.final, third = ko.thirdPlace, winner = ko.winner;
  return `
  <div style="margin-top:20px">
    <div class="standings-header">🏆 FASE KNOCKOUT</div>
    ${winner ? `<div style="background:rgba(255,215,0,0.1);border:2px solid rgba(255,215,0,0.4);border-radius:12px;padding:14px;text-align:center;margin-bottom:14px">
      <div style="font-size:24px">🏆</div>
      <div style="font-family:'Orbitron',sans-serif;color:#ffd700;font-size:14px;margin:4px 0">JUARA</div>
      <div style="font-size:18px;font-weight:700;color:#fff">${winner.logo||''} ${winner.name||''}</div>
    </div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      ${sf1 ? _knockoutMatchCard(sf1, sf1.id, compType) : ''}
      ${sf2 ? _knockoutMatchCard(sf2, sf2.id, compType) : ''}
    </div>
    ${final ? _knockoutMatchCard(final, 'final', compType) : ''}
  </div>`;
}

function _topScorerTable(scorers, title) {
  if (!scorers || !scorers.length) return '';
  return `<div style="margin-top:14px">
    <div class="standings-header">${title||'🥇 TOP SCORER'}</div>
    <table class="standings-table">
      <thead><tr><th>#</th><th>Pemain</th><th>⚽</th><th>🅰️</th></tr></thead>
      <tbody>${scorers.slice(0,7).map((s,i)=>`<tr ${i===0?'style="background:rgba(255,215,0,0.05)"':''}>
        <td style="color:${i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'#4a8860'}">${i+1}</td>
        <td style="color:#e8f5ec">${s.name}</td>
        <td style="color:#22c55e;font-weight:700">${s.goals}</td>
        <td style="color:#3b82f6">${s.assists}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function showAFC() {
  fetch("/afc").then(r=>r.json()).then(d=>{
    const afc = d.afc;

    // BUG5 FIX: Jika finished = true (juara ATAU runner-up/kalah), tampilkan halaman hasil lengkap
    // bukan redirect ke layar daftar tanpa tombol exit
    if (afc && afc.finished) {
      const ko = afc.knockout || {};
      const champion = ko.winner || afc.champion || null;
      const isChampion = champion && champion.isMe;
      const resultMsg = isChampion
        ? "🏆 JUARA AFC CHAMPIONS LEAGUE!"
        : afc.message || "Turnamen telah selesai.";
      const resultColor = isChampion ? "#ffd700" : "#94a3b8";

      content.innerHTML = `<div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:#f59e0b">🏆 AFC Champions League</div>
          <div class="comp-subtitle">Season ${afc.season} · Selesai</div>
          <div style="margin:16px 0;font-size:16px;font-weight:700;color:${resultColor}">${resultMsg}</div>
          ${champion ? `<div style="font-size:13px;color:#4a8860;margin-bottom:12px">🏆 Juara: <b style="color:#ffd700">${champion.name||''}</b></div>` : ''}
          <button onclick="enterAFC()" style="background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(245,158,11,0.4);color:#f59e0b;padding:12px 28px;border-radius:10px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px">
            🏆 Daftar Lagi AFC Musim Baru
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
          ${d.clubs.map(c=>`<div style="background:rgba(7,31,13,0.6);border:1px solid #0d3018;border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:24px">${c.logo}</div>
            <div style="font-size:11px;font-weight:700;margin-top:6px">${c.name}</div>
            <div style="font-size:10px;color:#4a8860">${c.country} ${c.city}</div>
            <div style="font-size:10px;color:#f59e0b;margin-top:4px">Str: ${Math.round(c.str*100)}%</div>
          </div>`).join("")}
        </div>
      </div>`;
      animateContent();
      return;
    }

    if (!afc) {
      content.innerHTML = `<div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:#f59e0b">🏆 AFC Champions League</div>
          <div class="comp-subtitle">Turnamen antar klub terbaik Asia — Format Grup + Knockout</div>
          <div style="margin:16px 0;font-size:13px;color:#4a8860">Syarat: Bermain di Divisi 1 atau Win Streak 5+</div>
          <button onclick="enterAFC()" style="background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(245,158,11,0.4);color:#f59e0b;padding:12px 28px;border-radius:10px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px">
            🏆 DAFTAR AFC CHAMPIONS
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
          ${d.clubs.map(c=>`<div style="background:rgba(7,31,13,0.6);border:1px solid #0d3018;border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:24px">${c.logo}</div>
            <div style="font-size:11px;font-weight:700;margin-top:6px">${c.name}</div>
            <div style="font-size:10px;color:#4a8860">${c.country} ${c.city}</div>
            <div style="font-size:10px;color:#f59e0b;margin-top:4px">Str: ${Math.round(c.str*100)}%</div>
          </div>`).join("")}
        </div>
      </div>`;
      animateContent();
      return;
    }

    fetch("/afc/standings").then(r=>r.json()).then(st=>{
      const inKnockout = afc.stage === 'knockout' || afc.knockout;
      const topScorers = st.topScorers || [];
      let matchSection = '';

      if (inKnockout && afc.knockout) {
        matchSection = _renderKnockoutBracket(afc.knockout, 'afc');
      } else {
        const nextMatch = afc.schedule[afc.currentMatchday];
        matchSection = `
          ${nextMatch&&!nextMatch.played?`<div class="liga-next-match">
            <div class="lnm-label">⚡ MATCHDAY ${afc.currentMatchday+1}</div>
            <div class="lnm-matchup">
              <div class="lnm-team home">🏠 My Team</div>
              <div class="lnm-vs">VS</div>
              <div class="lnm-team away">${nextMatch.club.logo} ${nextMatch.club.name}</div>
            </div>
            <div style="font-size:12px;color:#4a8860;margin:8px 0">${nextMatch.club.country} · Str ${Math.round(nextMatch.club.str*100)}%</div>
            <button class="liga-play-btn" onclick="playAFCMatch(${afc.currentMatchday})">⚽ KICK OFF!</button>
          </div>`:`<div style="text-align:center;padding:20px;color:#22c55e;font-size:16px">${afc.message||'Semua match grup dimainkan'}</div>`}
          <div class="fixture-grid-wrap" style="margin-top:12px">
            <div class="fixture-grid">${afc.schedule.map((m,i)=>compMatchCard(m,i,"afc",m.club)).join("")}</div>
          </div>`;
      }

      content.innerHTML = `<div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:#f59e0b">🏆 AFC Champions League</div>
          <div class="comp-subtitle">Season ${afc.season} · ${inKnockout?'Fase Knockout':'Fase Grup · Matchday '+afc.currentMatchday+'/'+afc.schedule.length}</div>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:280px">${matchSection}</div>
          <div style="width:300px;flex-shrink:0">
            <div class="standings-header">📊 KLASEMEN GRUP</div>
            <table class="standings-table">
              <thead><tr><th>#</th><th>Tim</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
              <tbody>${(st.standings||[]).map((t,i)=>`<tr class="${t.isMe?'standings-me':''}">
                <td>${i<2?'✅':i+1}</td>
                <td title="${t.name}">${t.logo} ${(t.name||"").split(" ")[0]}</td>
                <td>${t.played||0}</td><td style="color:#22c55e">${t.won||0}</td>
                <td style="color:#facc15">${t.drawn||0}</td><td style="color:#ef4444">${t.lost||0}</td>
                <td style="color:${(t.gd||0)>=0?'#22c55e':'#ef4444'}">${(t.gd||0)>=0?'+':''}${t.gd||0}</td>
                <td><b style="color:#f59e0b">${t.points||0}</b></td>
              </tr>`).join("")}</tbody>
            </table>
            ${_topScorerTable(topScorers, '🥇 TOP SCORER AFC')}
          </div>
        </div>
      </div>`;
      animateContent();
    });
  });
}
function enterAFC() {
  fetch("/afc/enter",{method:"POST"}).then(r=>r.json()).then(res=>{
    if(res.error){showToast("❌ "+res.error,"error");return;}
    showToast("🏆 "+res.message,"success"); showAFC();
  });
}
function playAFCMatch(idx) {
  fetch("/afc/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({matchdayIdx:idx})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      startMatchAnimation(res);
    });
}
function playKnockout(compType, matchId) {
  const url = compType==='afc'?'/afc/knockout':'/aff/knockout';
  fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({matchId})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      if (res.result === 'AI_SIM') { showToast("⚽ Pertandingan lain selesai!","success"); compType==='afc'?showAFC():showAFF(); return; }
      startMatchAnimation(res);
    });
}

// ── AFF CUP (Feature #5 + #7 + #8) ──────────────────────────
function showAFF() {
  fetch("/aff").then(r=>r.json()).then(d=>{
    const aff = d.aff;

    // BUG5 FIX: Jika finished=true (juara ATAU runner-up/kalah di knockout),
    // tampilkan halaman hasil lengkap dengan tombol daftar ulang
    if (aff && aff.finished) {
      const ko = aff.knockout || {};
      const champion = ko.winner || aff.champion || null;
      const isChampion = champion && champion.isMe;
      const resultMsg = isChampion
        ? "🏆 JUARA PIALA AFF!"
        : aff.message || "Turnamen telah selesai.";
      const resultColor = isChampion ? "#22c55e" : "#94a3b8";

      content.innerHTML = `<div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:#22c55e">🌏 Piala AFF Club Championship</div>
          <div class="comp-subtitle">Season ${aff.season} · Selesai</div>
          <div style="margin:16px 0;font-size:16px;font-weight:700;color:${resultColor}">${resultMsg}</div>
          ${champion ? `<div style="font-size:13px;color:#4a8860;margin-bottom:12px">🏆 Juara: <b style="color:#22c55e">${champion.name||''}</b></div>` : ''}
          ${aff.reward ? `<div style="font-size:13px;color:#facc15;margin-bottom:12px">💰 Reward: +${aff.reward} coin</div>` : ''}
          <button onclick="enterAFF()" style="margin-top:8px;background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(34,197,94,0.4);color:#22c55e;padding:12px 28px;border-radius:10px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700">
            🌏 Ikuti Piala AFF Musim Baru
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
          ${d.clubs.map(c=>`<div style="background:rgba(7,31,13,0.6);border:1px solid #0d3018;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:22px">${c.logo}</div>
            <div style="font-size:11px;font-weight:700;margin-top:4px">${c.name}</div>
            <div style="font-size:10px;color:#4a8860">${c.country}</div>
          </div>`).join("")}
        </div>
      </div>`;
      animateContent(); return;
    }

    if (!aff) {
      content.innerHTML = `<div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:#22c55e">🌏 Piala AFF Club Championship</div>
          <div class="comp-subtitle">Turnamen antar klub terbaik Asia Tenggara</div>
          <button onclick="enterAFF()" style="margin-top:16px;background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(34,197,94,0.4);color:#22c55e;padding:12px 28px;border-radius:10px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700">
            🌏 IKUTI PIALA AFF
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
          ${d.clubs.map(c=>`<div style="background:rgba(7,31,13,0.6);border:1px solid #0d3018;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:22px">${c.logo}</div>
            <div style="font-size:11px;font-weight:700;margin-top:4px">${c.name}</div>
            <div style="font-size:10px;color:#4a8860">${c.country}</div>
          </div>`).join("")}
        </div>
      </div>`;
      animateContent(); return;
    }

    const inKnockout = aff.stage === 'knockout' || (aff.knockout && !aff.finished);
    let matchSection = '';
    if (inKnockout && aff.knockout) {
      matchSection = _renderKnockoutBracket(aff.knockout, 'aff');
    } else {
      const nextMatch = aff.schedule[aff.currentMatchday];
      matchSection = `
        ${nextMatch&&!nextMatch.played?`<div class="liga-next-match">
          <div class="lnm-label">⚡ MATCHDAY ${aff.currentMatchday+1}</div>
          <div class="lnm-matchup">
            <div class="lnm-team home">🏠 My Team</div><div class="lnm-vs">VS</div>
            <div class="lnm-team away">${nextMatch.club.logo} ${nextMatch.club.name}</div>
          </div>
          <button class="liga-play-btn" onclick="playAFFMatch(${aff.currentMatchday})">⚽ KICK OFF!</button>
        </div>`:`<div style='text-align:center;padding:20px;color:#22c55e'>${aff.message||'✅ Semua match grup selesai!'}</div>`}
        <div class="fixture-grid-wrap">
          <div class="fixture-grid">${(aff.schedule||[]).map((m,i)=>compMatchCard(m,i,"aff",m.club)).join("")}</div>
        </div>`;
    }

    const standings = aff.standings || [];
    content.innerHTML = `<div class="comp-page">
      <div class="comp-hero">
        <div class="comp-title" style="color:#22c55e">🌏 Piala AFF Club Championship</div>
        <div class="comp-subtitle">Season ${aff.season} · ${inKnockout?'Fase Knockout':'Matchday '+aff.currentMatchday+'/'+aff.schedule.length}</div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:280px">${matchSection}</div>
        <div style="width:280px;flex-shrink:0">
          <div class="standings-header">📊 KLASEMEN GRUP</div>
          <table class="standings-table">
            <thead><tr><th>#</th><th>Tim</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
            <tbody>${standings.map((t,i)=>`<tr class="${t.isMe?'standings-me':''}">
              <td>${i<2?'✅':i+1}</td>
              <td>${t.logo} ${(t.name||'').split(' ')[0]}</td>
              <td>${t.played||0}</td><td style="color:#22c55e">${t.won||0}</td>
              <td style="color:#facc15">${t.drawn||0}</td><td style="color:#ef4444">${t.lost||0}</td>
              <td style="color:${(t.gd||0)>=0?'#22c55e':'#ef4444'}">${(t.gd||0)>=0?'+':''}${t.gd||0}</td>
              <td><b style="color:#22c55e">${t.points||0}</b></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;
    animateContent();
  });
}
function enterAFF() {
  fetch("/aff/enter",{method:"POST"}).then(r=>r.json()).then(res=>{
    if(res.error){showToast("❌ "+res.error,"error");return;}
    showToast("🌏 "+res.message,"success"); showAFF();
  });
}
function playAFFMatch(idx) {
  fetch("/aff/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({matchdayIdx:idx})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      startMatchAnimation(res);
    });
}

// ── SPECIAL CUPS (Feature #4 + #5) ───────────────────────────
function showCups() {
  fetch("/cups").then(r=>r.json()).then(d=>{
    const active = d.activeCup;
    const showSel = d.showCupSelection;

    let activeHtml = '';
    if (active && !active.finished) {
      const nextMatch = active.schedule[active.currentMatchday];
      // BUG 2 FIX: Tampilkan hasil terakhir seperti career mode
      const playedMatches = active.schedule.filter(m => m.played);
      const lastResult = playedMatches.length > 0 ? playedMatches[playedMatches.length - 1] : null;
      const lastResultHtml = lastResult ? `
        <div style="margin:8px 0;padding:8px 12px;background:rgba(0,0,0,0.3);border-radius:8px;font-size:12px">
          <div style="color:#64748b;margin-bottom:4px;font-size:10px;text-transform:uppercase;letter-spacing:1px">Hasil Terakhir</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="color:${lastResult.result==='WIN'?'#22c55e':lastResult.result==='LOSE'?'#ef4444':'#facc15'};font-weight:700;font-size:11px">${lastResult.result}</span>
            <span style="color:#f1f5f9;font-weight:700">${lastResult.score}</span>
            <span style="color:#94a3b8">vs ${lastResult.opponent}</span>
          </div>
        </div>` : '';
      activeHtml = `<div class="liga-next-match" style="border-color:${active.color||'#22c55e'}30;margin-bottom:16px">
        <div class="lnm-label">${active.icon} ${active.name} — AKTIF</div>
        <div style="margin:8px 0;font-size:13px;color:#4a8860">Matchday ${active.currentMatchday}/${active.schedule.length} · Poin: ${active.points}</div>
        ${lastResultHtml}
        ${nextMatch&&!nextMatch.played
          ?`<div class="lnm-label" style="margin-top:8px">⚡ NEXT MATCH — MATCHDAY ${active.currentMatchday+1}</div>
            <div class="lnm-matchup"><div class="lnm-team home">🏠 My Team</div><div class="lnm-vs">VS</div><div class="lnm-team away">⚽ ${nextMatch.opponent}</div></div>
            <button class="liga-play-btn" style="border-color:${active.color||'#22c55e'}" onclick="playCupMatch(${active.currentMatchday})">⚽ KICK OFF!</button>`
          :`<div style='color:#22c55e;padding:8px'>✅ Semua match selesai! ${active.message||''}</div>`}
        <div class="fixture-grid-wrap" style="margin-top:10px">
          <div class="fixture-grid">${active.schedule.map((m,i)=>compMatchCard(m,i,"cup",{logo:"⚽",name:m.opponent})).join("")}</div>
        </div>
        ${_topScorerTable(active.topScorers||[], '🥇 TOP SCORER')}
      </div>`;
    } else if (active?.finished) {
      activeHtml = `<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="color:#22c55e;font-family:'Orbitron',sans-serif;font-size:16px">${active.message||"Cup selesai!"}</div>
        ${active.finalReward?`<div style="margin-top:8px;font-size:13px">Reward: +${active.finalReward.coin} 💰 +${active.finalReward.premium} 💎</div>`:''}
        ${_topScorerTable(active.topScorers||[], '🥇 TOP SCORER AKHIR')}
        <div style="margin-top:12px;color:#4a8860;font-size:12px">↓ Pilih cup baru di bawah</div>
      </div>`;
    }

    // Feature #4: Only show cup selection when appropriate
    const selHtml = showSel
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
          ${Object.values(d.cups).map(cup=>`<div class="comp-hero" style="border-color:${cup.color}30">
            <div style="font-size:28px;margin-bottom:8px">${cup.icon}</div>
            <div class="comp-title" style="color:${cup.color};font-size:16px">${cup.name}</div>
            <div class="comp-subtitle" style="margin-bottom:12px">${cup.desc}</div>
            <button onclick="enterCup('${cup.id}')" style="background:${cup.color}20;border:1px solid ${cup.color}40;color:${cup.color};padding:10px 20px;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px">
              ${cup.icon} Ikuti ${cup.name}
            </button>
          </div>`).join("")}
        </div>`
      : `<div style="background:rgba(74,136,96,0.1);border:1px solid rgba(74,136,96,0.2);border-radius:10px;padding:14px;text-align:center;color:#4a8860;font-size:13px">
          ⏳ Selesaikan <b style="color:#facc15">${active?.name||'cup saat ini'}</b> dulu untuk memilih cup berikutnya
        </div>`;

    content.innerHTML = `<div class="comp-page"><h2>🎪 Special Cup</h2>${activeHtml}${selHtml}</div>`;
    animateContent();
  });
}
function enterCup(cupId) {
  fetch("/cups/enter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cupId})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast(res.message,"success"); showCups();
    });
}
function playCupMatch(idx) {
  fetch("/cups/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({matchdayIdx:idx})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      startMatchAnimation(res);
    });
}

// ── DERBY MATCH (Feature #5 + #6) ────────────────────────────
function showDerby() {
  fetch("/derby").then(r=>r.json()).then(d=>{
    const history = d.history || [];
    content.innerHTML = `<div class="comp-page">
      <h2>🔥 Derby Match</h2>
      <p style="color:#4a8860;margin-bottom:16px">Pertandingan rivalitas terpanas! Bonus coin berlipat ganda.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${d.allDerbies.map(derby=>`
        <div class="derby-badge">
          <div style="font-size:20px">${derby.icon}</div>
          <div class="derby-name">${derby.name}</div>
          <div style="font-size:11px;color:#4a8860;margin:4px 0">${derby.home} vs ${derby.away}</div>
          <div class="derby-multiplier">x${derby.multiplier} Coin</div>
          ${d.myClub&&(derby.home===d.myClub.name||derby.away===d.myClub.name)
            ?`<button onclick="playDerby('${derby.id}')" style="margin-top:10px;background:linear-gradient(135deg,rgba(239,68,68,0.2),rgba(245,158,11,0.2));border:1px solid rgba(239,68,68,0.4);color:#f97316;padding:10px 20px;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px;width:100%">
                🔥 MAIN DERBY!
              </button>`
            :`<div style="margin-top:8px;font-size:10px;color:#4a8860">Butuh bergabung dengan ${derby.home} atau ${derby.away}</div>`}
        </div>`).join("")}
      </div>
      ${history.length > 0 ? `
      <div style="margin-top:20px">
        <div class="standings-header">📋 RIWAYAT DERBY</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${history.slice(0,5).map(h=>`
          <div style="display:grid;grid-template-columns:1fr auto auto auto auto;align-items:center;gap:8px;
            background:rgba(7,31,13,0.6);border:1px solid #0d3018;border-radius:8px;padding:8px 12px;font-size:12px">
            <span style="color:#f97316;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.name||h.derbyId}</span>
            <span style="color:#4a8860;white-space:nowrap">${h.enemyName||''}</span>
            <span style="color:#facc15;font-family:'Orbitron',sans-serif;font-size:11px;white-space:nowrap">${h.score||'?-?'}</span>
            <span style="color:${h.result==='WIN'?'#22c55e':h.result==='LOSE'?'#ef4444':'#facc15'};font-weight:700;white-space:nowrap">${h.result||'-'}</span>
            <span style="color:#22c55e;white-space:nowrap">+${h.reward||0} 💰</span>
          </div>`).join('')}
        </div>
      </div>` : ''}
    </div>`;
    animateContent();
  });
}
function playDerby(derbyId) {
  fetch("/derby/play",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({derbyId})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      startMatchAnimation(res);
    });
}


function showAcademy() {
  fetch("/academy").then(r=>r.json()).then(d=>{
    content.innerHTML = `<div class="comp-page">
      <div class="comp-hero">
        <div class="comp-title" style="color:#22c55e">🌱 Youth Academy</div>
        <div class="comp-subtitle">Scout bakat muda Indonesia berbakat setiap 5 matchday</div>
        <div style="margin-top:12px;font-size:13px;color:${d.canScout?'#22c55e':'#4a8860'}">
          ${d.canScout?"✅ Siap scout pemain baru!":"⏳ Bisa scout lagi setelah "+d.nextScoutIn+" matchday lagi"}
        </div>
        ${d.canScout?`<button onclick="doScout()" style="margin-top:12px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);color:#22c55e;padding:10px 24px;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px">
          🔭 SCOUT SEKARANG (3 Kandidat)
        </button>`:""}
      </div>
      <div id="academyCandidates" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px"></div>
    </div>`;
    animateContent();
    renderAcademyCandidates(d.players||[]);
  });
}
function renderAcademyCandidates(players) {
  const el = document.getElementById("academyCandidates");
  if (!el) return;
  if (!players.length) { el.innerHTML = `<p style="color:#4a8860">Belum ada kandidat. Klik Scout dulu.</p>`; return; }
  el.innerHTML = players.map(p=>`<div class="academy-candidate" onclick="signYouth('${p.id}')">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <img src="${p.image}" style="width:40px;height:40px;border-radius:50%;border:2px solid rgba(34,197,94,0.3)">
      <span class="academy-potential ${p.potentialRating}">${p.potentialRating} Potensi</span>
    </div>
    <div style="font-size:14px;font-weight:700;color:#e8f5ec">${p.name}</div>
    <div style="font-size:11px;color:#4a8860">${p.role} · ${p.age}y · ${p.rarity}</div>
    <div style="font-size:18px;color:#22c55e;font-family:'Orbitron',sans-serif;font-weight:700;margin:6px 0">⚡ ${p.basePower}</div>
    <div style="font-size:10px;color:#22c55e">🌱 Growth: +${p.growth}%/level</div>
    <button style="width:100%;margin-top:10px;padding:8px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">
      ✅ Rekrut Gratis
    </button>
  </div>`).join("");
}
function doScout() {
  fetch("/academy/scout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({count:3})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast("🌱 "+res.message,"success");
      renderAcademyCandidates(res.candidates||[]);
    });
}
function signYouth(playerId) {
  fetch("/academy/sign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({playerId})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast("🌱 "+res.message,"success"); showAcademy();
    });
}

// ── FREE AGENTS (Feature #3: refresh every 3 matchdays) ──────
function showFreeAgents() {
  fetch("/free-agents").then(r=>r.json()).then(d=>{
    const refreshMsg = d.nextRefreshIn === 0
      ? `<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#22c55e">🔄 Pool baru tersedia!</div>`
      : `<div style="background:rgba(74,136,96,0.1);border:1px solid rgba(74,136,96,0.2);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#4a8860">⏳ Pool refresh dalam <b style="color:#facc15">${d.nextRefreshIn} matchday</b> lagi (setiap ${d.refreshInterval} matchday)</div>`;

    content.innerHTML = `<div class="comp-page">
      <h2>🆓 Free Agents</h2>
      <p style="color:#4a8860;margin-bottom:12px">Pemain tanpa klub yang bisa direkrut langsung. Perlu biaya negosiasi.</p>
      ${refreshMsg}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${d.freeAgents.length === 0
          ? `<div style="grid-column:1/-1;text-align:center;padding:32px;color:#4a8860">Tidak ada free agent tersedia saat ini. Tunggu ${d.nextRefreshIn} matchday lagi.</div>`
          : d.freeAgents.map(p=>`<div class="tcard-v2" style="--rc:#22c55e">
          <div class="tcard-rarity-bar" style="background:linear-gradient(90deg,#22c55e,#22c55e60)"></div>
          <div class="tcard-top">
            <div class="tcard-avatar-wrap"><img class="tcard-avatar" src="${p.image}"></div>
            <div class="tcard-info">
              <div class="tcard-name">${p.name}</div>
              <div class="tcard-meta">${p.role} · ${p.nationality} · ${p.age}y</div>
              <div class="tcard-power" style="color:#22c55e">⚡ ${p.basePower}</div>
              <div style="font-size:10px;color:#4a8860;margin-top:2px">🌱 Potensi: ${p.potentialRating}</div>
            </div>
          </div>
          <div style="padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:4px">
            ${['pace','shooting','passing','defense'].map(s=>`
              <div style="font-size:10px;display:flex;justify-content:space-between;color:#4a8860">
                <span>${s.toUpperCase().slice(0,3)}</span><span style="color:#e8f5ec">${p[s]||'?'}</span>
              </div>`).join('')}
          </div>
          <div style="padding:0 12px 12px">
            <div style="font-size:12px;color:#4a8860;margin-bottom:8px">Biaya Negosiasi: <b style="color:#facc15">💰 ${p.freeAgentCost}</b></div>
            <button onclick="negotiateFreeAgent('${p.id}')" style="width:100%;padding:9px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px">
              🤝 Negosiasi
            </button>
          </div>
        </div>`).join('')}
      </div>
      <div style="margin-top:12px;font-size:12px;color:#4a8860">Coin kamu: 💰 ${d.coin}</div>
    </div>`;
    animateContent();
  });
}

function negotiateFreeAgent(playerId) {
  fetch("/free-agents/negotiate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({playerId})})
    .then(r=>r.json()).then(res=>{
      if(res.error){showToast("❌ "+res.error,"error");return;}
      showToast("🤝 "+res.message,"success"); showStatus(); showFreeAgents();
    });
}

// ── ICON PLAYERS (Feature #2: real photo + full stat preview) ──
function showIcons() {
  fetch("/icons").then(r=>r.json()).then(d=>{
    content.innerHTML = `<div class="comp-page">
      <h2>⭐ Icon Players</h2>
      <p style="color:#4a8860;margin-bottom:16px">Legenda sepakbola Indonesia dan dunia — Tersedia di Gacha Premium.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">
        ${d.icons.map(p=>`<div class="icon-card" onclick="showIconDetail(${JSON.stringify(p).replace(/"/g,'&quot;')})">
          <div class="icon-card-top">
            <div class="icon-photo-wrap">
              ${p.realPhoto
                ? `<img class="icon-real-photo" src="${p.realPhoto}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><img class="icon-avatar-fallback" src="${p.image}" style="display:none">`
                : `<img class="icon-avatar-fallback" src="${p.image}">`}
              <div class="icon-bsr-badge">BSR</div>
            </div>
            <div class="icon-info">
              <div class="icon-name">${p.name}</div>
              <div class="icon-nick" style="color:#ffd700">"${p.nickname||p.name}"</div>
              <div style="font-size:11px;color:#4a8860">${p.role} · ${p.nationality}</div>
              <div style="font-size:20px;color:#ffd700;font-family:'Orbitron',sans-serif;font-weight:700;margin-top:4px">⚡ ${p.basePower}</div>
            </div>
          </div>
          <div class="icon-stats-mini">
            ${['pace','shooting','passing','defense','stamina','mentality'].map(s=>`
              <div class="ism-stat">
                <span class="ism-label">${s.substring(0,3).toUpperCase()}</span>
                <div class="ism-bar"><div style="width:${Math.min(100,p.stats?.[s]||0)}%;background:#ffd700"></div></div>
                <span class="ism-val">${p.stats?.[s]||'?'}</span>
              </div>`).join('')}
          </div>
          <div style="padding:4px 12px 12px">
            <span style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);color:#ffd700;padding:3px 10px;border-radius:6px;font-size:10px;font-family:'Rajdhani',sans-serif">
              🎰 Tersedia di Gacha Premium
            </span>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
    animateContent();
  });
}

function showIconDetail(p) {
  const stats = p.stats || {};
  const modal = document.createElement('div');
  // BUG 8 FIX: tambah ID unik agar tombol X bisa remove modal dengan benar
  modal.id = 'iconDetailModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  modal.innerHTML = `<div style="background:linear-gradient(135deg,#071f0d,#0a2a12);border:2px solid rgba(255,215,0,0.4);border-radius:16px;padding:24px;max-width:400px;width:100%;position:relative">
    <button onclick="document.getElementById('iconDetailModal').remove()" style="position:absolute;top:10px;right:14px;background:none;border:none;color:#4a8860;font-size:22px;cursor:pointer;z-index:1;line-height:1">✕</button>
    <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px">
      <div style="position:relative">
        ${p.realPhoto
          ? `<img src="${p.realPhoto}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,215,0,0.5)" onerror="this.src='${p.image}'">`
          : `<img src="${p.image}" style="width:80px;height:80px;border-radius:50%;border:2px solid rgba(255,215,0,0.5)">`}
        <div style="position:absolute;bottom:-6px;right:-6px;background:#ffd700;color:#000;border-radius:6px;padding:1px 5px;font-size:10px;font-weight:700">BSR</div>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700;color:#fff">${p.name}</div>
        <div style="color:#ffd700;font-size:13px">"${p.nickname||''}"</div>
        <div style="color:#4a8860;font-size:12px;margin-top:2px">${p.role} · ${p.nationality} · Age ${p.age||'?'}</div>
        <div style="font-size:24px;color:#ffd700;font-family:'Orbitron',sans-serif;font-weight:700;margin-top:6px">⚡ ${p.basePower}</div>
      </div>
    </div>
    <div style="font-size:12px;color:#4a8860;margin-bottom:14px;font-style:italic">${p.iconDesc||''}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${['pace','shooting','passing','defense','stamina','mentality'].map(s=>`
        <div style="background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.15);border-radius:8px;padding:8px">
          <div style="font-size:10px;color:#4a8860;text-transform:uppercase;margin-bottom:4px">${s}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:5px;background:#0a2a12;border-radius:3px"><div style="width:${Math.min(100,stats[s]||0)}%;height:100%;background:linear-gradient(90deg,#ffd700,#f59e0b);border-radius:3px"></div></div>
            <span style="color:#ffd700;font-weight:700;font-size:13px">${stats[s]||'?'}</span>
          </div>
        </div>`).join('')}
    </div>
    <div style="text-align:center">
      <span style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);color:#ffd700;padding:6px 16px;border-radius:8px;font-size:12px">🎰 Dapatkan melalui Gacha Premium</span>
    </div>
  </div>`;
  // Hapus modal lama jika ada
  document.getElementById('iconDetailModal')?.remove();
  document.body.appendChild(modal);
}


// ── INIT OVERRIDE — show sponsor bar on load ──────────────────
const _origInitMainApp = window.initMainApp;
window.initMainApp = function() {
  if (_origInitMainApp) _origInitMainApp();
  setTimeout(showSponsorBar, 500);
};
