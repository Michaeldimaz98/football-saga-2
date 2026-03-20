/* ================================================================
   FOOTBALL SAGA — PATCH v8
   Fixes:
   1. BUG: Speed x3 match stuck/animation jerky
   2. BUG: Formasi tidak bisa ganti player dari bench (tambah click-to-swap)
   Fitur baru:
   3. FEAT: Preview stat player saat diklik di formasi
   4. FEAT: Equip picker tampil sesuai posisi + info siapa di formasi
   5. FEAT: Gacha - list hadiah per banner + rate icon player
   6. FIX:  Gacha layout proporsional
   7. FEAT: AFC - statistik gol/assist/kartu + tombol daftar ulang
   8. FEAT: AFF - statistik gol/assist/kartu
   9. FEAT: Semua tim NPC punya nama pemain lengkap
================================================================ */

/* ================================================================
   1. FIX: SPEED x3 STUCK
   Root cause: ball celebration movement runs 3x per rendered frame
   at speed 3, causing ball to go off-screen and animation to freeze.
   Also: setTimeout inside timeline events causes issues at high speed.
================================================================ */

// Override startSmartMatchAnimation dengan fix speed
const _origStartSmartMatchAnimation = window.startSmartMatchAnimation;
window.startSmartMatchAnimation = function(result) {
  const canvas = document.getElementById("matchCanvas");
  if (!canvas) { showMatchResult(result); return; }
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  fetch("/match/visual").then(r => r.json()).then(visData => {

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
      owner: null,
      trail: []
    };

    // Build timeline TANPA setTimeout (fix untuk speed x3)
    const timeline = _buildFixedTimeline(result, W, H);
    let tIdx = 0, frame = 0;
    const BASE_FRAMES = 480;
    let homeScore = 0, awayScore = 0;
    let activeFlash = null, flashTimer = 0;
    let goalCelebration = 0;
    let commentary = [];

    function pushCommentary(text, color) {
      commentary.unshift({ text, color: color||"#22c55e", age: 0 });
      if (commentary.length > 4) commentary.pop();
      addMatchLog(text);
    }

    const cb = {
      pushCommentary,
      onGoalHome: () => {
        homeScore++;
        const el = document.getElementById("matchScoreHome");
        if (el) el.textContent = homeScore;
        goalCelebration = 90;
      },
      onGoalAway: () => {
        awayScore++;
        const el = document.getElementById("matchScoreAway");
        if (el) el.textContent = awayScore;
        goalCelebration = 90;
      },
      onFlash: (msg, col, dur) => { activeFlash = { msg, col }; flashTimer = dur || 70; }
    };

    function tick() {
      const steps = typeof _matchSpeed !== "undefined" ? _matchSpeed : 1;

      for (let s = 0; s < steps; s++) {
        frame++;

        // Process timeline
        while (tIdx < timeline.length && timeline[tIdx].frame <= frame) {
          const ev = timeline[tIdx++];
          if (ev.fn) ev.fn(ball, homePlayers, awayPlayers, cb);
        }

        // Ball trail
        ball.trail.push({ x: ball.cx, y: ball.cy });
        if (ball.trail.length > 8) ball.trail.shift();

        // FIX: goalCelebration hanya decrement, ball movement di render phase
        if (goalCelebration > 0) {
          goalCelebration--;
        } else {
          const dx = ball.tx - ball.cx, dy = ball.ty - ball.cy;
          const dist = Math.hypot(dx, dy);
          const spd = ball.speed + (dist > 120 ? 3 : 0);
          if (dist > spd) { ball.cx += (dx/dist)*spd; ball.cy += (dy/dist)*spd; }
          else { ball.cx = ball.tx; ball.cy = ball.ty; }
          ball.cx += (Math.random()-0.5) * 0.3;
          ball.cy += (Math.random()-0.5) * 0.3;
        }
        ball.spinning++;

        if (frame % 3 === 0) {
          homePlayers.forEach(p => !p.redCarded && makeAIDecision(p, ball, homePlayers, awayPlayers, W, H, "home", frame));
          awayPlayers.forEach(p => !p.redCarded && makeAIDecision(p, ball, awayPlayers, homePlayers, W, H, "away", frame));
        }

        const lerp = goalCelebration > 0 ? 0.03 : 0.07;
        [...homePlayers, ...awayPlayers].forEach(p => {
          if (p.redCarded) return;
          const spd = goalCelebration > 0 ? 0.02 : lerp;
          p.cx += (p.targetX - p.cx) * spd + (Math.random()-0.5)*0.15;
          p.cy += (p.targetY - p.cy) * spd + (Math.random()-0.5)*0.15;
          // Clamp dalam lapangan
          p.cx = Math.max(12, Math.min(W-12, p.cx));
          p.cy = Math.max(10, Math.min(H-10, p.cy));
        });
      }

      // ── RENDER ──
      ctx.clearRect(0, 0, W, H);
      drawField(ctx, W, H);

      // FIX: Ball celebration animation hanya di render phase (1x per frame)
      if (goalCelebration > 0) {
        ball.cx += Math.sin(frame * 0.08) * 1.5;
        ball.cy += Math.cos(frame * 0.06) * 1.0;
        // Clamp bola tetap di lapangan
        ball.cx = Math.max(15, Math.min(W-15, ball.cx));
        ball.cy = Math.max(15, Math.min(H-15, ball.cy));
      }

      // Ball trail
      ball.trail.forEach((pt, i) => {
        const alpha = (i / ball.trail.length) * 0.25;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3 * (i/ball.trail.length), 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });

      function getRoleColor(role) {
        const r = (role||"").toUpperCase();
        if (r==="GK") return "#facc15";
        if (r.includes("CB")||r==="LB"||r==="RB"||r==="DEF") return "#3b82f6";
        if (r.includes("CM")||r.includes("DM")||r.includes("AM")||r==="LM"||r==="RM"||r==="MID") return "#22c55e";
        return "#ef4444";
      }

      [...homePlayers, ...awayPlayers].forEach(p => {
        if (p.redCarded) return;
        ctx.beginPath();
        ctx.ellipse(p.cx, p.cy+13, 10, 4, 0, 0, Math.PI*2);
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
      });

      awayPlayers.forEach(p => { if (!p.redCarded) drawSmartPlayer(ctx, p, "#ef4444", true, frame); });
      homePlayers.forEach(p => { if (!p.redCarded) drawSmartPlayer(ctx, p, getRoleColor(p.role), false, frame); });
      drawAnimBall(ctx, ball, frame);

      const minute = Math.min(90, Math.floor((frame/BASE_FRAMES)*90));
      drawHUD(ctx, W, H, minute, homeScore, awayScore, typeof _matchSpeed !== "undefined" ? _matchSpeed : 1);

      if (activeFlash && flashTimer > 0) {
        flashTimer--;
        drawFlashOverlay(ctx, W, H, activeFlash.msg, activeFlash.col, flashTimer);
        if (flashTimer <= 0) activeFlash = null;
      }

      drawCommentaryOverlay(ctx, W, H, commentary, frame);
      commentary.forEach(c => c.age++);

      if (frame < BASE_FRAMES) {
        matchAnimFrame = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(matchAnimFrame);
        matchAnimFrame = null;
        setTimeout(() => showMatchResult(result), 600);
      }
    }

    const enLabel = document.getElementById("enemyNameLabel");
    if (enLabel && result.enemyName) enLabel.textContent = "👾 " + result.enemyName;

    tick();
  }).catch(() => showMatchResult(result));
};

// Timeline builder TANPA setTimeout (semua event langsung)
function _buildFixedTimeline(result, W, H) {
  const [ps, es] = (result.score||"0-0").split("-").map(Number);
  const TOTAL = 480;
  const events = [];
  const rnd = () => Math.random();

  events.push({frame:5, fn:(b,hp,ap,cb)=>{ cb.pushCommentary("⚽ Kick Off!", "#22c55e"); b.tx=W/2+30; b.ty=H/2; }});

  // Foul events (TANPA setTimeout)
  const foulCount = 1 + Math.floor(rnd()*3);
  for (let i=0; i<foulCount; i++) {
    const ff = 50 + Math.floor(rnd()*200);
    const isHome = rnd()>0.5;
    const foulX = W*(0.25+rnd()*0.5), foulY = H*(0.2+rnd()*0.6);
    const reasons = ["Tackle keras","Hands ball","Obstruction","Pelanggaran"];
    const reason = reasons[Math.floor(rnd()*reasons.length)];
    const doYellowCard = rnd() < 0.5;
    events.push({ frame: ff, fn:(b,hp,ap,cb)=>{
      b.tx = foulX; b.ty = foulY;
      const players = isHome ? hp : ap;
      const foulPlayer = players.filter(p=>!p.redCarded)[Math.floor(rnd()*players.filter(p=>!p.redCarded).length)];
      const pname = foulPlayer?.name || (isHome ? "Tim Kita" : "Lawan");
      cb.pushCommentary(`🦵 Pelanggaran! ${pname}`, "#f97316");
      if (doYellowCard) {
        cb.onFlash(`🟨 KARTU KUNING — ${pname}`, "#facc15", 80);
        cb.pushCommentary(`🟨 Kartu Kuning: ${pname}`, "#facc15");
      }
    }});
  }

  // Penalty 12%
  if (rnd() < 0.12) {
    const pf = 100 + Math.floor(rnd()*200);
    const isHome = rnd() > 0.5;
    events.push({ frame: pf, fn:(b,hp,ap,cb)=>{
      b.tx = isHome ? W*0.88 : W*0.12; b.ty = H/2;
      cb.onFlash("⚡ PENALTI!", "#a855f7", 100);
      cb.pushCommentary("⚡ PENALTI diberikan!", "#a855f7");
    }});
  }

  // Red card 8%
  if (rnd() < 0.08) {
    const rf = 120 + Math.floor(rnd()*180);
    const isHome = rnd() > 0.5;
    events.push({ frame: rf, fn:(b,hp,ap,cb)=>{
      cb.onFlash("🟥 KARTU MERAH!", "#ef4444", 110);
      cb.pushCommentary("🟥 Kartu Merah! 10 orang!", "#ef4444");
      const pool = (isHome ? hp : ap).filter(p => p.role !== "GK" && !p.redCarded);
      if (pool.length) pool[Math.floor(rnd()*pool.length)].redCarded = true;
    }});
  }

  // Goals home
  distributeFrames(ps, TOTAL).forEach(f => {
    events.push({ frame:f, fn:(b,hp,ap,cb)=>{
      b.tx = W-10; b.ty = H/2 + (rnd()-0.5)*30;
      cb.onGoalHome();
      cb.onFlash("⚽ GOAL!", "#facc15", 120);
      const scorer = hp.find(p=>!p.redCarded&&(p.role?.includes("ST")||p.role?.includes("LW")||p.role?.includes("RW"))) || hp.find(p=>!p.redCarded) || hp[0];
      cb.pushCommentary(`⚽ GOOOL! ${scorer?.name||"My Team"}!`, "#facc15");
    }});
  });

  // Goals away
  distributeFrames(es, TOTAL).forEach(f => {
    events.push({ frame:f, fn:(b,hp,ap,cb)=>{
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

  // Commentary events
  const lines = [
    ["Umpan terobosan!", "#22c55e"], ["Tembakan melebar!", "#94a3b8"],
    ["Sundulan kuat!", "#facc15"], ["Crossing berbahaya!", "#f97316"],
    ["GK bereaksi cepat!", "#3b82f6"], ["Peluang emas terbuang!", "#ef4444"]
  ];
  for (let i=0;i<6;i++) {
    const cf = 30+Math.floor(rnd()*(TOTAL-60));
    const [line, col] = lines[Math.floor(rnd()*lines.length)];
    const bx=W*(0.2+rnd()*0.6), by=H*(0.2+rnd()*0.6);
    events.push({ frame:cf, fn:(b,hp,ap,cb)=>{ b.tx=bx; b.ty=by; cb.pushCommentary(line, col); } });
  }

  events.sort((a,b)=>a.frame-b.frame);
  return events;
}

/* ================================================================
   2. FIX: BENCH CLICK-TO-SWAP + 3. FEAT: Formation player stat preview
================================================================ */

let _selectedBenchPlayerId = null;
let _formationData = null; // Cache formation data untuk stat preview

// Override showFormation untuk menambah click-to-select bench dan stat preview
const _origShowFormation = window.showFormation;
window.showFormation = function() {
  fetch("/formation").then(r => r.json()).then(d => {
    _formationData = d; // Cache data
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
    <div id="benchSelectHint" style="display:none;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:8px 14px;margin-bottom:8px;font-size:12px;color:#22c55e;text-align:center">
      ✅ Pemain dipilih. Klik posisi di lapangan untuk menempatkan — atau klik pemain lain di bench
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
      // FIX: tambah onclick untuk bench-to-field swap
      html += `<div class="fv2-pos" style="top:${style.top};left:${style.left};"
        ondragover="event.preventDefault()" ondrop="dropPlayer('${pos}')"
        onclick="_handleFieldPosClick('${pos}')">`;
      if (p) {
        const pid = String(p.id).replace(/'/g, "\\'");
        const stamPct = Math.max(0, Math.min(100, Number(p.curStamina ?? 100)));
        const injIcon = p.injury ? "🩹" : "";
        // FIX: fv2-card juga punya ondragover/ondrop untuk drop ke posisi berisi player
        html += `<div class="fv2-card" draggable="true"
          ondragover="event.preventDefault();event.stopPropagation()"
          ondrop="event.stopPropagation();dropPlayer('${pos}')"
          ondragstart="dragPlayer('${pid}','${pos}')"
          onclick="event.stopPropagation();showFormationPlayerStat('${pid}')"
          title="Klik: lihat stat | Drag: pindah posisi"
          style="--role-color:${color};cursor:pointer">
          <div class="fv2-role-bar" style="background:${color}"></div>
          <img class="fv2-avatar" src="${p.image||'https://i.imgur.com/8QfQYpL.png'}">
          <div class="fv2-name">${p.name.split(" ")[0]}${injIcon}</div>
          <div class="fv2-power" style="color:${color}">⚡${p.power}</div>
          <div class="fv2-stam-bar"><div style="width:${stamPct}%;background:${stamPct>60?"#22c55e":stamPct>30?"#f59e0b":"#ef4444"}"></div></div>
        </div>`;
      } else {
        html += `<div class="fv2-empty" style="--role-color:${color};cursor:pointer">
          <span style="font-size:10px;color:${color};font-weight:700">${pos}</span>
        </div>`;
      }
      html += `</div>`;
    });

    html += `</div></div>
      <div class="formation-bench-panel">
        <div class="bench-panel-title">🪑 BENCH <span style="font-size:10px;color:#4a8860;font-weight:400">(Klik untuk pilih, lalu klik posisi di lapangan)</span></div>
        <div class="bench-sort-bar">
          <span style="font-size:10px;color:#4a8860;margin-right:6px">Urutkan:</span>
          <button class="bench-sort-btn ${_benchSortMode==='stat'?'active':''}" onclick="setBenchSort('stat')">⚡ Power</button>
          <button class="bench-sort-btn ${_benchSortMode==='stamina'?'active':''}" onclick="setBenchSort('stamina')">💪 Stamina</button>
          <button class="bench-sort-btn ${_benchSortMode==='rarity'?'active':''}" onclick="setBenchSort('rarity')">⭐ Rarity</button>
        </div>`;

    const usedIds = new Set(Object.values(d.lineup).filter(Boolean).map(v=>String(v.id||v)));
    const benchPlayers = d.players.filter(p => !usedIds.has(String(p.id)));
    const roleOrder = { GK:0, DEF:1, MID:2, ATT:3 };
    const roleGroup2 = r => { r=(r||"").toUpperCase(); if(r==="GK")return"GK"; if(["CB","LB","RB","DEF"].some(x=>r.includes(x)))return"DEF"; if(["CM","DM","AM","LM","RM","MID"].some(x=>r.includes(x)))return"MID"; return"ATT"; };

    const sorted = [...benchPlayers].sort((a,b) => {
      const ka = _benchSortKey(a, _benchSortMode);
      const kb = _benchSortKey(b, _benchSortMode);
      if (ka !== kb) return ka - kb;
      return (roleOrder[roleGroup2(a.role)]||0)-(roleOrder[roleGroup2(b.role)]||0);
    });

    sorted.forEach(p => {
      const pid = String(p.id).replace(/'/g, "\\'");
      const rg = roleGroup2(p.role||p.type);
      const color = ROLE_COLORS[rg]||"#fff";
      const stamPct = Math.max(0, Math.min(100, Number(p.curStamina ?? 100)));
      const isSelected = _selectedBenchPlayerId === String(p.id);
      html += `<div class="bench-card-v2 ${isSelected?'bench-selected':''}"
        draggable="true"
        ondragstart="dragPlayer('${pid}',null)"
        onclick="_selectBenchPlayer('${pid}')"
        title="Klik: pilih untuk swap | Drag: ke posisi di lapangan"
        style="cursor:pointer;${isSelected?'border-color:#22c55e;background:rgba(34,197,94,0.1)':''}">
        <div class="bcv2-role-dot" style="background:${color}"></div>
        <img class="bcv2-avatar" src="${p.image||'https://i.imgur.com/8QfQYpL.png'}">
        <div class="bcv2-info">
          <div class="bcv2-name">${p.name}</div>
          <div class="bcv2-sub" style="color:${color}">${p.role||p.type} · ⚡${p.power}</div>
          <div class="bcv2-stam"><div style="width:${stamPct}%;background:${stamPct>60?"#22c55e":stamPct>30?"#f59e0b":"#ef4444"}"></div></div>
        </div>
        ${isSelected?`<div style="font-size:16px;color:#22c55e;margin-left:auto">✓</div>`:''}
      </div>`;
    });

    html += `</div></div>`;
    content.innerHTML = html;
    animateContent();
    // Inject CSS untuk bench-selected
    _injectBenchSelectStyle();
  });
};

function _injectBenchSelectStyle() {
  if (document.getElementById("bench-select-style")) return;
  const s = document.createElement("style");
  s.id = "bench-select-style";
  s.textContent = `
    .bench-selected { border: 1px solid #22c55e !important; background: rgba(34,197,94,0.08) !important; }
    .fv2-card:hover { filter: brightness(1.15); }
    .fv2-empty { cursor: pointer !important; }
  `;
  document.head.appendChild(s);
}

function _selectBenchPlayer(id) {
  const key = String(id);
  _selectedBenchPlayerId = (_selectedBenchPlayerId === key) ? null : key;
  const hint = document.getElementById("benchSelectHint");
  if (hint) hint.style.display = _selectedBenchPlayerId ? "block" : "none";
  // Re-render bench hanya bagian yang berubah (refresh seluruh formation)
  showFormation();
}

function _handleFieldPosClick(pos) {
  if (!_selectedBenchPlayerId) return; // Tidak ada yang dipilih, abaikan
  // Tempatkan bench player ke posisi ini
  fetch("/formation/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position: pos, playerId: _selectedBenchPlayerId })
  }).then(r => r.json()).then(res => {
    _selectedBenchPlayerId = null;
    if (res.error) {
      showToast("❌ " + res.error, "error");
    } else {
      showToast("✅ Pemain ditempatkan!", "success");
      showFormation();
    }
  }).catch(() => {
    showToast("❌ Gagal koneksi server", "error");
  });
}

/* ================================================================
   3. FEAT: Formation player stat popup saat diklik
================================================================ */
function showFormationPlayerStat(playerId) {
  if (!_formationData) return;

  // Cari player dari lineup
  let p = null;
  Object.values(_formationData.lineup).forEach(lp => {
    if (lp && String(lp.id) === String(playerId)) p = lp;
  });
  if (!p) return;

  // Hapus popup lama
  document.getElementById("fmStatPopup")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "fmStatPopup";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px";
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

  const fs = p.finalStats || {};
  const rc = {C:"#94a3b8",B:"#3b82f6",A:"#a855f7",S:"#f59e0b",SS:"#f97316",SSR:"#ffd700"}[p.rarity]||"#fff";
  const pid = String(p.id).replace(/'/g, "\\'");
  const staminaPct = Math.max(0, Math.min(100, Number(p.curStamina ?? 100)));

  const stats = [
    ["👟","Pace",     fs.pace    || p.pace    || 0],
    ["🎯","Shooting", fs.shooting|| p.shooting|| 0],
    ["🎲","Passing",  fs.passing || p.passing || 0],
    ["🛡️","Defense",  fs.defense || p.defense || 0],
    ["💪","Stamina",  fs.stamina || p.stamina || 0],
    ["🧠","Mentality",fs.mentality||p.mentality||0],
  ];

  overlay.innerHTML = `
  <div style="background:#0f172a;border:2px solid ${rc}30;border-radius:16px;padding:20px;max-width:340px;width:100%;position:relative">
    <button onclick="document.getElementById('fmStatPopup').remove()"
      style="position:absolute;top:10px;right:14px;background:none;border:none;color:#64748b;font-size:20px;cursor:pointer">✕</button>

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <img src="${p.image||'https://i.imgur.com/8QfQYpL.png'}"
        style="width:52px;height:52px;border-radius:50%;border:2px solid ${rc}">
      <div>
        <div style="font-size:16px;font-weight:700;color:${rc};font-family:'Orbitron',sans-serif">${p.name}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">${p.role||p.type} · ${p.rarity} · Lv${p.level||1}</div>
        <div style="font-size:18px;color:#facc15;font-weight:700;margin-top:2px">⚡ ${p.power}</div>
      </div>
    </div>

    <!-- Stats bars -->
    <div style="display:flex;flex-direction:column;gap:6px">
      ${stats.map(([icon,label,val]) => {
        const v = Math.floor(val||0);
        const pct = Math.min(100, v);
        const col = pct>=80?"#22c55e":pct>=60?"#facc15":pct>=40?"#f97316":"#ef4444";
        return `<div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;width:22px">${icon}</span>
          <span style="font-size:11px;color:#64748b;width:62px">${label}</span>
          <div style="flex:1;height:6px;background:#1e293b;border-radius:3px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;transition:width 0.5s"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:${col};width:28px;text-align:right">${v}</span>
        </div>`;
      }).join("")}
    </div>

    <!-- Injury / Stamina -->
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <div style="background:#0a2a12;border:1px solid #0d3018;border-radius:8px;padding:6px 12px;font-size:11px">
        💪 Stamina: <b style="color:${staminaPct>=60?'#22c55e':staminaPct>=30?'#f59e0b':'#ef4444'}">${staminaPct}%</b>
      </div>
      ${p.injury?`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:6px 12px;font-size:11px;color:#ef4444">🩹 Cedera: ${p.injury.matchesLeft} match</div>`:''}
    </div>

    <!-- Trait & Skill -->
    ${p.trait||p.skill?`<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
      ${p.trait?`<span style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);color:#22c55e;padding:3px 10px;border-radius:6px;font-size:10px">✨ ${p.trait}</span>`:''}
      ${p.skill&&p.skill!=='NONE'?`<span style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);color:#a855f7;padding:3px 10px;border-radius:6px;font-size:10px">🎯 ${(p.skill||'').replace(/_/g,' ')}</span>`:''}
    </div>`:''}

    <!-- Actions -->
    <div style="margin-top:14px;display:flex;gap:8px">
      <button onclick="document.getElementById('fmStatPopup').remove()"
        style="flex:1;padding:8px;background:#0a2a12;border:1px solid #0d3018;color:#4a8860;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:13px">
        Tutup
      </button>
      <button onclick="document.getElementById('fmStatPopup').remove();_selectBenchPlayerForSwap('${pid}')"
        style="flex:1;padding:8px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:13px">
        🔄 Ganti Player
      </button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
}

// Trigger mode "ganti player" dari formasi → pilih bench player pengganti
// BUG2 & BUG8 FIX: Set swap mode aktif, highlight bench, pasang click handler
let _swapSourcePlayerId = null;

function _selectBenchPlayerForSwap(existingPlayerId) {
  _swapSourcePlayerId = existingPlayerId;
  _selectedBenchPlayerId = null;
  document.getElementById("benchSelectHint")?.style && (document.getElementById("benchSelectHint").style.display = "none");
  document.querySelectorAll(".bench-card-v2.bench-selected").forEach((el) => el.classList.remove("bench-selected"));
  showToast("💡 Pilih player dari bench untuk menggantikan", "info");

  // Scroll ke bench
  const bench = document.querySelector(".formation-bench-panel");
  if (bench) bench.scrollIntoView({ behavior: "smooth" });

  // Highlight semua bench card dan pasang onclick handler untuk swap
  const benchCards = document.querySelectorAll(".bench-card-v2");
  benchCards.forEach(card => {
    card.style.border = "2px solid #f59e0b";
    card.style.cursor = "pointer";
    card.style.background = "rgba(245,158,11,0.08)";
    card.style.transition = "all 0.2s";

    // Ambil playerId dari ondragstart attribute
    const dragAttr = card.getAttribute("ondragstart") || "";
    const match = dragAttr.match(/dragPlayer\(['"]([^'"]+)['"]/);
    if (!match) return;
    const benchPlayerId = match[1];

    // Clone card supaya event lama tidak bentrok
    const newCard = card.cloneNode(true);
    newCard.style.border = "2px solid #f59e0b";
    newCard.style.cursor = "pointer";
    newCard.style.background = "rgba(245,158,11,0.08)";
    newCard.removeAttribute("onclick");
    newCard.onclick = null;
    newCard.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      _doSwapWithBench(benchPlayerId);
    });
    card.parentNode.replaceChild(newCard, card);
  });

  // Tambahkan tombol cancel di atas bench panel
  const bench2 = document.querySelector(".formation-bench-panel");
  if (bench2 && !document.getElementById("swapCancelBtn")) {
    const cancelDiv = document.createElement("div");
    cancelDiv.id = "swapCancelBtn";
    cancelDiv.style.cssText = "padding:8px 12px;text-align:center";
    cancelDiv.innerHTML = `<button onclick="_cancelSwapMode()"
      style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;
      padding:6px 18px;border-radius:8px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:12px">
      ✕ Batal Ganti
    </button>`;
    bench2.insertBefore(cancelDiv, bench2.firstChild);
  }
}

function _cancelSwapMode() {
  _swapSourcePlayerId = null;
  document.getElementById("swapCancelBtn")?.remove();
  // Refresh formasi untuk hapus highlight
  showFormation();
}

function _doSwapWithBench(benchPlayerId) {
  if (!_swapSourcePlayerId) return;
  const sourceId = _swapSourcePlayerId;
  _swapSourcePlayerId = null;
  document.getElementById("swapCancelBtn")?.remove();

  // Cari posisi player sumber (yang ada di lapangan)
  fetch("/formation").then(r => r.json()).then(d => {
    const lineup = d.lineup || {};
    let sourcePos = null;
    Object.entries(lineup).forEach(([pos, p]) => {
      if (p && String(p.id) === String(sourceId)) sourcePos = pos;
    });

    if (!sourcePos) {
      showToast("❌ Posisi pemain tidak ditemukan", "error");
      showFormation();
      return;
    }

    // Kirim bench player ke posisi sumber
    fetch("/formation/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: sourcePos, playerId: String(benchPlayerId) })
    }).then(r => r.json()).then(res => {
      if (res.error) {
        showToast("❌ " + res.error, "error");
      } else {
        showToast("✅ Pemain berhasil diganti!", "success");
      }
      showFormation();
    });
  });
}

/* ================================================================
   4. FEAT: Equip picker — tampil info formasi + filter posisi
================================================================ */
const _origOpenEquipPickerModal = window.openEquipPickerModal;
window.openEquipPickerModal = function(equipId, slot) {
  Promise.all([
    fetch("/team").then(r=>r.json()),
    fetch("/formation").then(r=>r.json())
  ]).then(([teamData, formData]) => {
    const allEq = teamData.allEquipment || teamData.inventory || [];
    const equip = allEq.find(e => String(e.id) === String(equipId));
    if (!equip && slot) {
      // Coba cari di semua inventory
    }

    // Build lineup map: playerId → position
    const lineupMap = {};
    Object.entries(formData.lineup || {}).forEach(([pos, p]) => {
      if (p) lineupMap[String(p.id)] = pos;
    });

    const targetSlot = equip?.slot || slot;
    const eRole = (equip?.role || "ALL").toUpperCase();

    function roleGroupLocal(r) {
      r = (r||"").toUpperCase();
      if (r === "GK") return "GK";
      if (["CB","LB","RB","DEF"].some(x=>r.includes(x))) return "DEF";
      if (["CM","DM","AM","LM","RM","MID"].some(x=>r.includes(x))) return "MID";
      if (["LW","RW","ST","CF","ATT"].some(x=>r.includes(x))) return "ATT";
      return r;
    }

    const eligiblePlayers = (teamData.team||[]).filter(p => {
      if (eRole === "ALL") return true;
      const pRole = (p.role||p.type||"").toUpperCase();
      return pRole === eRole || roleGroupLocal(pRole) === eRole || roleGroupLocal(pRole) === roleGroupLocal(eRole);
    });

    // Sort: yang di formasi dulu
    eligiblePlayers.sort((a, b) => {
      const aInFormation = !!lineupMap[String(a.id)];
      const bInFormation = !!lineupMap[String(b.id)];
      if (aInFormation && !bInFormation) return -1;
      if (!aInFormation && bInFormation) return 1;
      return (b.power||0) - (a.power||0);
    });

    // Build modal
    const modal = document.createElement("div");
    modal.id = "equipPickerModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";

    const box = document.createElement("div");
    box.style.cssText = "background:#0f172a;border:1px solid #1e3a5f;border-radius:14px;padding:20px;max-width:440px;width:100%;max-height:85vh;overflow-y:auto";

    const rc = {C:"#94a3b8",B:"#3b82f6",A:"#a855f7",S:"#f59e0b",SS:"#f97316",SSR:"#ffd700"}[equip?.rarity]||"#64748b";

    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h3 style="margin:0;color:#f1f5f9;font-family:'Rajdhani',sans-serif;font-size:16px">Pasang ke Pemain</h3>
        <button onclick="document.getElementById('equipPickerModal').remove()"
          style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer">✕</button>
      </div>

      <!-- Info equipment -->
      ${equip ? `<div style="background:#1e293b;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
        <div style="font-size:28px">${equip.icon||'⚡'}</div>
        <div>
          <b style="color:${rc}">${equip.name}</b>
          <div style="font-size:11px;color:#64748b;margin-top:2px">
            ${targetSlot} · ⚡${equip.power}
            <span style="margin-left:6px;background:${eRole==='ALL'?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)'};
              color:${eRole==='ALL'?'#22c55e':'#f59e0b'};border-radius:4px;padding:1px 6px;font-size:10px">
              ${eRole==='ALL'?'Semua Posisi':'Khusus '+eRole}
            </span>
          </div>
        </div>
      </div>` : ''}

      <!-- Legend -->
      <div style="display:flex;gap:8px;margin-bottom:10px;font-size:10px;color:#4a8860">
        <span style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:4px;padding:2px 6px">⭐ Di Formasi</span>
        <span style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:4px;padding:2px 6px">🔄 Ada Equip</span>
      </div>

      <div id="equipPickerList" style="display:flex;flex-direction:column;gap:8px">
        ${eligiblePlayers.length === 0
          ? `<div style="color:#ef4444;font-size:13px;padding:16px;text-align:center">❌ Tidak ada pemain yang cocok</div>`
          : eligiblePlayers.map(p => {
            const alreadyEquipped = p.equipment && p.equipment[targetSlot];
            const curEq = alreadyEquipped ? allEq.find(e=>String(e.id)===String(alreadyEquipped)) : null;
            const inFormation = lineupMap[String(p.id)];
            const borderColor = inFormation ? "#22c55e" : alreadyEquipped ? "#f59e0b" : "#334155";
            return `<div class="equip-picker-row" onclick="_doEquipPickV8('${equipId}','${p.id}','${targetSlot}')"
              style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                background:#1e293b;border:1px solid ${borderColor};border-radius:8px;cursor:pointer;
                transition:border-color 0.2s,background 0.2s;"
              onmouseover="this.style.borderColor='#3b82f6';this.style.background='#1e3a5f'"
              onmouseout="this.style.borderColor='${borderColor}';this.style.background='#1e293b'">
              <img src="${p.image||'https://api.dicebear.com/7.x/bottts/svg?seed='+p.id}"
                style="width:38px;height:38px;border-radius:50%;border:2px solid ${borderColor}">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:6px">
                  <b style="font-size:13px;color:#f1f5f9">${p.name}</b>
                  ${inFormation ? `<span style="font-size:9px;background:rgba(34,197,94,0.15);color:#22c55e;border-radius:4px;padding:1px 5px">⭐ ${inFormation}</span>` : ''}
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:2px">
                  ${p.role||p.type} · Lv${p.level||1} · ⚡${p.power||p.basePower||50}
                </div>
                ${curEq ? `<div style="font-size:10px;color:#f59e0b;margin-top:2px">🔄 Ganti: ${curEq.name} (⚡${curEq.power})</div>` : ''}
              </div>
              <span style="font-size:11px;color:${inFormation?'#22c55e':alreadyEquipped?'#f59e0b':'#4a8860'}">
                ${inFormation ? (alreadyEquipped?'Pasang':'Pasang ▸') : alreadyEquipped ? 'Ada equip' : 'Pasang ▸'}
              </span>
            </div>`;
          }).join("")}
      </div>`;

    modal.appendChild(box);
    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if(e.target===modal) modal.remove(); });
  });
};

function _doEquipPickV8(equipId, playerId, slot) {
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

/* ================================================================
   5. FEAT: Gacha — list hadiah per banner + rate icon player
   6. FIX:  Gacha layout proporsional
================================================================ */

// Data sample hadiah per banner
const GACHA_BANNER_REWARDS = {
  standard: {
    sample: [
      { icon:"👟", name:"Rookie Striker Boots", rarity:"C", slot:"FEET", power:12 },
      { icon:"🎽", name:"Standard Jersey", rarity:"B", slot:"BODY", power:20 },
      { icon:"🪖", name:"Focus Headband", rarity:"A", slot:"HEAD", power:28 },
      { icon:"⚡", name:"Energy Bracelet", rarity:"S", slot:"ACC", power:40 },
      { icon:"🧤", name:"Pro Keeper Gloves", rarity:"SS", slot:"HAND", power:52 },
    ],
    iconRate: null
  },
  premium: {
    sample: [
      { icon:"🎽", name:"Elite Jersey", rarity:"A", slot:"BODY", power:35 },
      { icon:"👟", name:"Predator Boots", rarity:"S", slot:"FEET", power:46 },
      { icon:"⭐", name:"Bambang Pamungkas", rarity:"SSR", slot:null, power:90, isIcon:true },
      { icon:"⭐", name:"Kurniawan DY", rarity:"SSR", slot:null, power:88, isIcon:true },
      { icon:"⭐", name:"Bima Sakti", rarity:"SSR", slot:null, power:85, isIcon:true },
    ],
    iconRate: 0.5,
    iconDesc: "Icon Player tersedia di banner ini! Rate SSR 0.5% (▲2.2x dari standard)"
  },
  equipment: {
    sample: [
      { icon:"🪖", name:"Tactical Headband", rarity:"A", slot:"HEAD", power:30 },
      { icon:"🎽", name:"Pro Body Armor", rarity:"S", slot:"BODY", power:48 },
      { icon:"🧤", name:"Elite Arm Guard", rarity:"SS", slot:"HAND", power:58 },
      { icon:"👟", name:"Vision Mid Boots", rarity:"SSR", slot:"FEET", power:72 },
      { icon:"💍", name:"Champion Ring", rarity:"S", slot:"ACC", power:45 },
    ],
    iconRate: null
  },
  repair: {
    sample: [
      { icon:"🔧", name:"Basic Repair Kit", rarity:"C", slot:null, category:"repair" },
      { icon:"💊", name:"Stamina Drink", rarity:"B", slot:null, category:"stamina" },
      { icon:"🩹", name:"Quick Heal", rarity:"A", slot:null, category:"injury" },
      { icon:"🛡️", name:"Protection Scroll", rarity:"A", slot:null, category:"upgrade" },
      { icon:"🚀", name:"Power Boost", rarity:"S", slot:null, category:"boost" },
    ],
    iconRate: null
  }
};

const RARITY_COLORS_V8 = { C:"#94a3b8", B:"#3b82f6", A:"#a855f7", S:"#f59e0b", SS:"#f97316", SSR:"#ffd700" };

// Override selectGachaEvent untuk tambah reward list
const _origSelectGachaEvent = window.selectGachaEvent;
window.selectGachaEvent = function(id) {
  _currentGachaEvent = id;

  document.querySelectorAll(".gbl-card").forEach(c=>c.classList.remove("active"));
  const card = document.getElementById(`gevCard_${id}`);
  if (card) card.classList.add("active");

  fetch("/gacha/events").then(r=>r.json()).then(({events}) => {
    const ev = events[id];
    if (!ev) return;

    const baseRates = {C:45,B:30,A:16,S:7,SS:1.5,SSR:0.5};
    const rateDisp = document.getElementById("gachaRateDisplay");
    if (rateDisp) {
      rateDisp.innerHTML = Object.entries(baseRates).map(([r,base])=>{
        const boosted = ev.rateBoost?.[r] ? base*ev.rateBoost[r] : base;
        const isUp = ev.rateBoost?.[r] > 1;
        return `<div class="gsd-rate-item" style="border-color:${RARITY_COLORS_V8[r]}30;background:${RARITY_COLORS_V8[r]}08">
          <div class="gsd-rate-rarity" style="color:${RARITY_COLORS_V8[r]}">${r}</div>
          <div class="gsd-rate-pct" style="color:${isUp?'#22c55e':'#94a3b8'}">${boosted.toFixed(1)}%${isUp?`<span style="font-size:8px;color:#22c55e"> ▲${ev.rateBoost[r]}x</span>`:""}</div>
        </div>`;
      }).join("");
    }

    const defView = document.getElementById("gachaDefaultView");
    if (defView) {
      const titleEl = defView.querySelector(".gsd-title");
      const subEl   = defView.querySelector(".gsd-sub");
      const orbEl   = defView.querySelector(".gsd-orb");
      if (titleEl) titleEl.textContent = ev.name.replace(/[🎉💎⚽🔧🩹]/g,"").trim();
      if (subEl)   subEl.textContent   = ev.desc;
      if (orbEl)   orbEl.textContent   = ev.icon;

      // Tambah / update reward list
      let rewardListEl = defView.querySelector(".gsd-reward-list");
      if (!rewardListEl) {
        rewardListEl = document.createElement("div");
        rewardListEl.className = "gsd-reward-list";
        defView.appendChild(rewardListEl);
      }

      const bannerRewards = GACHA_BANNER_REWARDS[id] || GACHA_BANNER_REWARDS.standard;
      const rewards = bannerRewards.sample || [];

      rewardListEl.innerHTML = `
        <div style="font-size:10px;letter-spacing:1px;color:#4a8860;font-family:'Rajdhani',sans-serif;text-transform:uppercase;margin-bottom:8px">
          📦 Contoh Hadiah
        </div>
        ${rewards.map(r => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:${RARITY_COLORS_V8[r.rarity]}08;
            border:1px solid ${RARITY_COLORS_V8[r.rarity]}20;border-radius:6px;margin-bottom:4px">
            <span style="font-size:16px">${r.icon}</span>
            <div style="flex:1;text-align:left">
              <div style="font-size:11px;font-weight:600;color:#f1f5f9">${r.name}</div>
              <div style="font-size:9px;color:#64748b">${r.slot||r.category||'Item'}</div>
            </div>
            <div>
              <span style="font-size:9px;background:${RARITY_COLORS_V8[r.rarity]}18;color:${RARITY_COLORS_V8[r.rarity]};
                border:1px solid ${RARITY_COLORS_V8[r.rarity]}30;border-radius:4px;padding:1px 6px">
                ${r.rarity}${r.isIcon?' ⭐':''} ${r.power?`⚡${r.power}`:''}
              </span>
            </div>
          </div>
        `).join("")}
        ${bannerRewards.iconRate !== null ? `
          <div style="margin-top:10px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);
            border-radius:8px;padding:8px 10px;font-size:10px;color:#ffd700;line-height:1.5">
            ⭐ ${bannerRewards.iconDesc}
          </div>
        ` : ''}
      `;
    }

    // Pull controls
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
};

// Inject CSS fix untuk Gacha layout proporsional
(function injectGachaFixCSS() {
  const s = document.createElement("style");
  s.id = "gacha-layout-fix";
  s.textContent = `
/* FIX: Gacha default view lebih proporsional */
.gacha-stage-default {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 0 !important;
  padding: 16px !important;
  overflow-y: auto !important;
  max-height: 100% !important;
}
.gsd-orb {
  font-size: 40px !important;
  margin-bottom: 6px !important;
}
.gsd-title {
  font-size: 14px !important;
  letter-spacing: 2px !important;
  margin-bottom: 3px !important;
}
.gsd-sub {
  font-size: 11px !important;
  margin-bottom: 8px !important;
}
.gsd-rates {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 5px !important;
  justify-content: center !important;
  margin-bottom: 10px !important;
}
.gsd-rate-item {
  min-width: 45px !important;
  padding: 4px 8px !important;
}
.gsd-rate-rarity { font-size: 10px !important; font-weight: 700; }
.gsd-rate-pct { font-size: 10px !important; }
.gsd-reward-list {
  width: 100%;
  max-width: 320px;
  margin-top: 6px;
}
/* Gacha banner list lebih compact */
.gbl-card { padding: 8px 10px !important; }
.gbl-icon { font-size: 20px !important; }
.gbl-name { font-size: 12px !important; }
.gbl-desc { font-size: 10px !important; }
/* gacha right col scrollable */
.gacha-right-col {
  overflow-y: auto !important;
  max-height: calc(100vh - 120px) !important;
}
.gacha-stage-wrap {
  min-height: auto !important;
}
  `;
  document.head.appendChild(s);
})();

/* ================================================================
   7. FEAT: AFC — statistik gol/assist/kartu + tombol daftar ulang
   8. FEAT: AFF — statistik gol/assist/kartu
================================================================ */

// Override showAFC untuk tambah statistik + tombol daftar ulang
const _origShowAFC = window.showAFC;
window.showAFC = function() {
  fetch("/afc").then(r=>r.json()).then(d=>{
    const afc = d.afc;

    // Halaman daftar (belum join / sudah selesai)
    if (!afc || (afc.finished && !afc.knockout) || (!afc.knockout && afc.stage === 'finished')) {
      content.innerHTML = `<div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:#f59e0b">🏆 AFC Champions League</div>
          <div class="comp-subtitle">Turnamen antar klub terbaik Asia — Format Grup + Knockout</div>
          <div style="margin:14px 0;font-size:13px;color:#4a8860">Syarat: Bermain di Divisi 1 atau Win Streak 5+</div>
          <button onclick="enterAFC()" style="background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(245,158,11,0.4);color:#f59e0b;padding:12px 28px;border-radius:10px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px">
            🏆 DAFTAR AFC CHAMPIONS
          </button>
          ${afc?.message?`<div style="margin-top:12px;color:#22c55e;font-size:13px">${afc.message}</div>`:''}
          ${afc?.finished ? `<div style="margin-top:10px;font-size:12px;color:#4a8860">Turnamen sebelumnya telah selesai. Daftar lagi untuk musim baru!</div>` : ''}
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
      const topAssists = st.topAssists || [];
      const topCards   = st.topCards   || [];
      let matchSection = '';

      if (inKnockout && afc.knockout) {
        matchSection = _renderKnockoutBracket(afc.knockout, 'afc');

        // Tombol daftar ulang jika turnamen selesai (winner ada)
        if (afc.knockout?.winner) {
          matchSection += `
            <div style="margin-top:16px;text-align:center">
              <div style="font-size:12px;color:#4a8860;margin-bottom:10px">Turnamen telah selesai. Siap untuk musim berikutnya?</div>
              <button onclick="_resetAndEnterAFC()" style="background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(245,158,11,0.5);color:#f59e0b;padding:10px 24px;border-radius:8px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700">
                🔄 Daftar Lagi AFC Musim Baru
              </button>
            </div>`;
        }
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

      // Statistik AFC
      const statsSection = _buildCompStatsTable(topScorers, topAssists, topCards, "AFC");

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
            ${statsSection}
          </div>
        </div>
      </div>`;
      animateContent();
    });
  });
};

function _resetAndEnterAFC() {
  if (!confirm("Daftar ulang AFC musim baru? Turnamen lama akan direset.")) return;
  fetch("/afc/enter", {method:"POST"}).then(r=>r.json()).then(res => {
    if (res.error) { showToast("❌ " + res.error, "error"); return; }
    showToast("🏆 " + res.message, "success");
    showAFC();
  });
}

// Override showAFF untuk tambah statistik
const _origShowAFF = window.showAFF;
window.showAFF = function() {
  fetch("/aff").then(r=>r.json()).then(d=>{
    const aff = d.aff;

    if (!aff || aff.finished) {
      content.innerHTML = `<div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:#22c55e">🌏 Piala AFF Club Championship</div>
          <div class="comp-subtitle">Turnamen antar klub terbaik Asia Tenggara</div>
          <button onclick="enterAFF()" style="margin-top:16px;background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(34,197,94,0.4);color:#22c55e;padding:12px 28px;border-radius:10px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700">
            🌏 IKUTI PIALA AFF
          </button>
          ${aff?.message?`<div style="margin-top:12px;color:#22c55e">${aff.message}${aff.reward?` (Reward: +${aff.reward} coin)`:''}</div>`:''}
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

    // Fetch AFF standings + topscorers
    fetch("/aff/standings").then(r=>r.json()).then(affSt=>{
      const inKnockout = !!aff.knockout || aff.stage === 'knockout';
      const standings = aff.standings || affSt.standings || [];
      const topScorers = affSt.topScorers || [];
      const topAssists = affSt.topAssists || [];
      const topCards   = affSt.topCards   || [];

      let matchSection = '';
      if (inKnockout && aff.knockout) {
        matchSection = _renderKnockoutBracket(aff.knockout, 'aff');
        // Tombol daftar ulang jika selesai
        if (aff.knockout?.winner) {
          matchSection += `
            <div style="margin-top:16px;text-align:center">
              <button onclick="enterAFF()" style="background:linear-gradient(135deg,#071f0d,#0d3018);border:1px solid rgba(34,197,94,0.4);color:#22c55e;padding:10px 24px;border-radius:8px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700">
                🔄 Daftar Lagi AFF Musim Baru
              </button>
            </div>`;
        }
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

      const statsSection = _buildCompStatsTable(topScorers, topAssists, topCards, "AFF");

      content.innerHTML = `<div class="comp-page">
        <div class="comp-hero">
          <div class="comp-title" style="color:#22c55e">🌏 Piala AFF Club Championship</div>
          <div class="comp-subtitle">Season ${aff.season} · ${inKnockout ? (aff.finished ? 'Fase Knockout · Selesai' : 'Fase Knockout') : ('Matchday '+aff.currentMatchday+'/'+aff.schedule.length)}</div>
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
            ${statsSection}
          </div>
        </div>
      </div>`;
      animateContent();
    }).catch(() => {
      // Fallback: tanpa topscorers
      content.innerHTML = `<div class="comp-page"><p style="color:#4a8860;padding:20px">Memuat data AFF...</p></div>`;
      animateContent();
    });
  });
};

// Helper: build statistik kompetisi (gol/assist/kartu)
function _buildCompStatsTable(topScorers, topAssists, topCards, compName) {
  function buildSubTable(data, cols, title, icon) {
    if (!data || !data.length) return '';
    return `<div style="margin-top:12px">
      <div class="standings-header">${icon} ${title}</div>
      <table class="standings-table" style="font-size:11px">
        <thead><tr><th>#</th><th>Pemain</th>${cols.map(c=>`<th>${c.icon}</th>`).join("")}</tr></thead>
        <tbody>${data.slice(0,5).map((p,i)=>`<tr>
          <td style="color:${i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'#4a8860'}">${i+1}</td>
          <td style="color:#e8f5ec">${p.name}</td>
          ${cols.map(c=>`<td style="color:${c.color};font-weight:700">${p[c.key]||0}</td>`).join("")}
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  }

  return `
    ${buildSubTable(topScorers, [{key:"goals",icon:"⚽",color:"#22c55e"}], "TOP SCORER "+compName, "⚽")}
    ${buildSubTable(topAssists, [{key:"assists",icon:"🅰️",color:"#3b82f6"}], "TOP ASSIST "+compName, "🅰️")}
    ${buildSubTable(topCards, [{key:"yellow",icon:"🟨",color:"#facc15"},{key:"red",icon:"🟥",color:"#ef4444"}], "KARTU TERBANYAK", "🟨")}
  `;
}

/* ================================================================
   9. FEAT: Semua tim NPC punya nama pemain lengkap
================================================================ */

// Nama pemain per tim untuk display di match lineup panel
const NPC_TEAM_SQUADS = {
  "Persija Jakarta":   { GK:"Andritany Ardhiyasa", DEF:["Fachruddin Aryanto","Ricky Fajrin","Yann Motta","Rezaldi Hehanusa"], MID:["Evan Dimas","Riko Simanjuntak","Marco Motta","Sandi Sute"], ATT:["Bambang Pamungkas Jr","Carlos Fortes","Reinaldo"] },
  "Persib Bandung":    { GK:"Muhammad Natshir", DEF:["Zalnando","Victor Igbonefo","Nick Kuipers","Henhen Herdiana"], MID:["Marc Klok","Rachmat Irianto","Dhika Bhayangkara","Dedi Kusnandar"], ATT:["Ciro Alves","David da Silva","Frets Butuan"] },
  "Persebaya Surabaya":{ GK:"Miswar Saputra", DEF:["Ruly Hermansyah","Muhammad Hidayat","Rachmat Latief","Koko Ari"], MID:["Moch Supriadi","Marselino Ferdinan","Brwa Nouri","Irfan Jaya"], ATT:["Sho Yamamoto","Paulo Victor","Aji Kusuma"] },
  "Arema FC":          { GK:"Adilson Maringa", DEF:["Bagas Adi","Hansamu Yama","Syaiful Indra","Edo Febriansyah"], MID:["Dendi Santoso","Gian Zola","Hanif Sjahbandi","Renshi Yamaguchi"], ATT:["Carlos Fortes","Dendi Santoso","Joan Oriol"] },
  "PSM Makassar":      { GK:"Muhamad Iqbal", DEF:["Yuran Fernandes","Zulkifli Syukur","Asnawi Mangkualam","Jibril Rajoaby"], MID:["Yakob Sayuri","Sandi Sute","Rasyid Bakri","Abdul Rahman Lestaluhu"], ATT:["Ciro Alves","Anco Jansen","Ilham Udin Armaiyn"] },
  "Borneo FC":         { GK:"Awan Setho", DEF:["Diego Michiels","Aqil Savik","Yohannes Ferinando","Wahyu Winanta"], MID:["Wildansyah","Terens Puhiri","Fahrul Ardiasyah","Sandi Sute"], ATT:["Lerby Eliandry","Jefferson","Matheus Pato"] },
  "PSS Sleman":        { GK:"Kurniawan Kartika Ajie", DEF:["Bagus Nirwanto","Dany Saputra","Ihsan Fandi","Eky Taufik"], MID:["Namiro Saputra","Septian David","Hamdan Haris","Paulo Sergio"], ATT:["Yevhen Bokhashvili","Irkham Mila","Heri Susanto"] },
  "Madura United":     { GK:"Zainuri", DEF:["Anderson Salles","Leo Guntara","Ahmad Reza","Fathur Rachman"], MID:["Slamet Nurcahyo","Silva Junior","Ahmad Fauzi","Mochammad Dicky"], ATT:["Bruno Moreira","Slamet Nurcahyo","Beto Goncalves"] },
  "Barito Putera":     { GK:"Sahas Pramana", DEF:["Donny Tri","Fery Paulus","Alwi Slamat","Fadhil Saputra"], MID:["Muhammad Rafli","Rizky Pora","Bagas Kaffa","Ryuji Utomo"], ATT:["Aleksandar Rakic","Indra Kahfi","Ramdani Lestaluhu"] },
  "PSIS Semarang":     { GK:"Jandia Eka Putra", DEF:["Nelson Alom","Satria Tama","Cukur Saputro","Wahyu Cristiawan"], MID:["Hari Nur Yulianto","Arif Satria","Pandu Sjahbandi","Septian David"], ATT:["Hari Nur Yulianto","Edu Garcia","Taisei Marukawa"] },
  // AFC Teams
  "Jeonbuk Hyundai":   { GK:"Cho Hyun-woo", DEF:["Lee Yong","Hong Jeong-ho","Hong Chul","Im Seon-ju"], MID:["Son Jun-ho","Costa","Moon Seon-min","Gustavo"], ATT:["Stanislav Iljutcenko","Baro","Han Kyo-won"] },
  "Kawasaki Frontale": { GK:"Sung Gi-hyun", DEF:["Shogo Taniguchi","Jesiel","Kyohei Noborizato","Yusuke Segawa"], MID:["Joao Schmidt","Ryota Oshima","Akihiro Ienaga","Kento Tachibanada"], ATT:["Hiroshi Akaike","Daizen Maeda","Yasuto Wakizaka"] },
  "Urawa Red Diamonds":{ GK:"Nishikawa Shusaku", DEF:["Naoya Fujita","Alexander Scholz","Thomas Deng","Yusuke Iwanami"], MID:["Ataru Esaka","Takahiro Sekine","Tao Maruyama","Linssen"], ATT:["Kasper Junker","Sakamoto Kyusei","Takahiro Akimoto"] },
  "Persipura Jayapura":{ GK:"Mario Karlovic", DEF:["Obafemi Martins","Yustinus Pae","Ricardo Salampessy","Boaz Solossa"], MID:["Ian Louis Kabes","Vendry Mofu","Ferinando Pahabol","Ahmad Rudi"], ATT:["Boaz Solossa","Patrich Wanggai","Greg Nwokolo"] },
  // AFF Teams
  "Kaya-Iloilo FC":    { GK:"Roland Muller", DEF:["Matthew Hartmann","Robert Lopez","Matthew Custodio","Chris Punnakitikasem"], MID:["Bienvenido Maranon","Jesse Curl","Kevin Ingreso","Sandro Reyes"], ATT:["Bienvenido Maranon","Natxo Insa","Ivan Ouedraogo"] },
  "Boeung Ket FC":     { GK:"Tola Chan", DEF:["Sieng Chanthea","Chet Sovannarith","Men Sreynich","Heng Bunthoeun"], MID:["Sieng Chanthea","Long Dany","Sey Ourng","Chan Vatana"], ATT:["Anon Heng","Chhuon Oudom","Kouch Sokumpheak"] },
  "Yangon United":     { GK:"Kaung Htet Soe", DEF:["Thet Naung","Kyaw Zayar Win","Zin Ko","Naing Lin Aung"], MID:["Htike Htike Aung","Myo Myo","Kaung Htet","Thu Rein Tha"], ATT:["Aung Thu","Yan Naing Oo","David Htan"] },
  // Fallback generic Indonesian names
  "default": { GK:"Adi Kurniawan", DEF:["Fachruddin","Victor Igbonefo","Yustinus Pae","Ricky Fajrin"], MID:["Evan Dimas","Yakob Sayuri","Asnawi Mangkualam","Osvaldo Haay"], ATT:["Ilija Spasojevic","Alberto Goncalves","Ciro Alves"] }
};

function _getNPCSquad(teamName) {
  return NPC_TEAM_SQUADS[teamName] || NPC_TEAM_SQUADS["default"];
}

function _buildEnemyLineupFromSquad(teamName) {
  const squad = _getNPCSquad(teamName);
  const positions = ["GK","LB","CB","CB","RB","CM","CM","DM","LW","RW","ST"];
  return positions.map((role, i) => {
    let name;
    if (role === "GK") {
      name = squad.GK;
    } else if (["LB","CB","RB"].includes(role)) {
      const defs = squad.DEF;
      name = defs[i % defs.length] || defs[0];
    } else if (["CM","DM"].includes(role)) {
      const mids = squad.MID;
      name = mids[i % mids.length] || mids[0];
    } else {
      const atts = squad.ATT;
      name = atts[i % atts.length] || atts[0];
    }
    return { name, role };
  });
}

// Override loadLineupPanels untuk tampil nama NPC yang benar
const _origLoadLineupPanels = window.loadLineupPanels;
window.loadLineupPanels = function() {
  fetch("/status").then(r=>r.json()).then(d=>{
    const myList = document.getElementById("myLineupList");
    if (myList) {
      fetch("/formation").then(r=>r.json()).then(fd=>{
        const ROLE_COLORS = { GK:"#facc15", DEF:"#3b82f6", MID:"#22c55e", ATT:"#ef4444" };
        function posRoleColor(pos) {
          if(pos.startsWith("GK")) return ROLE_COLORS.GK;
          if(["LB","CB1","CB2","CB3","RB"].includes(pos)) return ROLE_COLORS.DEF;
          if(["DM1","DM2","CM1","CM2","CM3","AM1","AM2","AM3","LM","RM"].includes(pos)) return ROLE_COLORS.MID;
          return ROLE_COLORS.ATT;
        }

        const lineupEntries = Object.entries(fd.lineup || {});
        myList.innerHTML = lineupEntries.map(([pos, p], i) => {
          if (!p) return '';
          const color = posRoleColor(pos);
          const injBadge = p.injury ? ` 🩹` : '';
          const stBg = p.injury ? "rgba(239,68,68,0.08)" : "transparent";
          return `<div class="lineup-row home-row" style="background:${stBg}">
            <span class="lineup-num">${i+1}</span>
            <span class="lineup-dot" style="background:${color}"></span>
            <span class="lineup-name">${p.name}${injBadge}</span>
            <span class="lineup-pos">${pos}</span>
          </div>`;
        }).filter(Boolean).join("");
      });
    }

    const enemyList = document.getElementById("enemyLineupList");
    if (enemyList) {
      // Ambil enemy name dari berbagai sumber
      const enemyLabel = document.getElementById("enemyNameLabel");
      const enemyName = (enemyLabel?.textContent || "").replace("👾 ", "").trim() || "Enemy FC";

      // Gunakan squad dari NPC data
      const enemyLineup = _buildEnemyLineupFromSquad(enemyName);
      const positions = ["GK","LB","CB1","CB2","RB","CM1","CM2","DM","LW","RW","ST"];

      const ROLE_COLORS = { GK:"#facc15", DEF:"#3b82f6", MID:"#22c55e", ATT:"#ef4444" };
      function roleColor(role) {
        if (role==="GK") return ROLE_COLORS.GK;
        if (["CB","LB","RB","DEF"].some(x=>role.includes(x))) return ROLE_COLORS.DEF;
        if (["CM","DM","AM","LM","RM","MID"].some(x=>role.includes(x))) return ROLE_COLORS.MID;
        return ROLE_COLORS.ATT;
      }

      enemyList.innerHTML = enemyLineup.map((p, i) => `
        <div class="lineup-row away-row">
          <span class="lineup-pos">${positions[i]||p.role}</span>
          <span class="lineup-name" style="color:#ef4444">${p.name||'Player'}</span>
          <span class="lineup-dot" style="background:${roleColor(p.role)}"></span>
          <span class="lineup-num">${i+1}</span>
        </div>`).join("");
    }
  }).catch(()=>{});
};

/* ================================================================
   CSS — Styles untuk semua fitur baru
================================================================ */
(function injectPatchV8CSS() {
  const s = document.createElement("style");
  s.id = "patch-v8-css";
  s.textContent = `
/* Bench select hint */
#benchSelectHint {
  animation: slideDown 0.3s ease;
}
@keyframes slideDown {
  from { opacity:0; transform:translateY(-8px); }
  to   { opacity:1; transform:translateY(0); }
}

/* Bench card hover */
.bench-card-v2 {
  transition: border-color 0.2s, background 0.2s, transform 0.1s !important;
}
.bench-card-v2:hover {
  border-color: #22c55e !important;
  transform: translateX(2px);
}
.bench-card-v2.bench-selected {
  border-color: #22c55e !important;
  background: rgba(34,197,94,0.08) !important;
  box-shadow: 0 0 0 1px rgba(34,197,94,0.3) !important;
}

/* Formation field - posisi empty dapat hover */
.fv2-pos:hover > .fv2-empty {
  background: rgba(34,197,94,0.08) !important;
  border-color: rgba(34,197,94,0.3) !important;
}

/* Standings header */
.standings-header {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  color: #4a8860;
  text-transform: uppercase;
  padding: 8px 0;
  margin-top: 4px;
  border-bottom: 1px solid #0d3018;
  margin-bottom: 6px;
}
.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.standings-table th {
  color: #4a8860;
  font-weight: 600;
  text-align: center;
  padding: 4px 3px;
  font-size: 10px;
}
.standings-table td {
  text-align: center;
  padding: 4px 3px;
  border-bottom: 1px solid #0a2a12;
  color: #e8f5ec;
}
.standings-me {
  background: rgba(34,197,94,0.06) !important;
  font-weight: 700;
}

/* AFF/AFC stats section */
.comp-stat-section {
  margin-top: 14px;
  background: rgba(7,31,13,0.6);
  border: 1px solid #0d3018;
  border-radius: 10px;
  padding: 12px;
}

/* Gacha reward list item hover */
.gsd-reward-list > div:hover {
  background: rgba(34,197,94,0.04);
}
  `;
  document.head.appendChild(s);
})();

console.log("✅ Patch v8 loaded — Football Saga");

/* ================================================================
   TOUCH SUPPORT — Mobile drag-and-drop workaround
   HTML5 drag events tidak bekerja di touch, ini polyfill sederhana
================================================================ */
(function addTouchFormationSupport() {
  let touchDragId = null;
  let touchDragEl = null;
  let touchGhost = null;

  function createGhost(el, x, y) {
    const ghost = el.cloneNode(true);
    ghost.style.cssText = `
      position:fixed; z-index:9999; pointer-events:none; opacity:0.85;
      left:${x-30}px; top:${y-30}px; width:60px; transform:scale(1.15);
      transition:none; border-radius:10px;
      box-shadow:0 0 20px rgba(34,197,94,0.5);
    `;
    document.body.appendChild(ghost);
    return ghost;
  }

  document.addEventListener("touchstart", function(e) {
    const card = e.target.closest(".bench-card-v2, .fv2-card");
    if (!card) return;

    // Get player ID
    const idMatch = card.getAttribute("ondragstart")?.match(/dragPlayer\((\d+)/);
    if (!idMatch) return;

    touchDragId = idMatch[1];
    touchDragEl = card;
    const touch = e.touches[0];
    touchGhost = createGhost(card, touch.clientX, touch.clientY);
  }, { passive: true });

  document.addEventListener("touchmove", function(e) {
    if (!touchGhost) return;
    const touch = e.touches[0];
    touchGhost.style.left = (touch.clientX - 30) + "px";
    touchGhost.style.top  = (touch.clientY - 30) + "px";
  }, { passive: true });

  document.addEventListener("touchend", function(e) {
    if (!touchGhost || !touchDragId) { cleanup(); return; }

    const touch = e.changedTouches[0];
    touchGhost.remove();
    touchGhost = null;

    // Cari elemen di bawah titik touch
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) { cleanup(); return; }

    // Cari posisi target (fv2-pos atau fv2-empty)
    const posEl = el.closest("[ondrop]");
    const dropMatch = posEl?.getAttribute("ondrop")?.match(/dropPlayer\('([^']+)'\)/);

    if (dropMatch) {
      const pos = dropMatch[1];
      dragPlayerData = { id: touchDragId, from: null };
      dropPlayer(pos);
    } else {
      // Cek apakah drop ke bench-card (swap dengan bench player)
      const benchCard = el.closest(".bench-card-v2");
      if (benchCard) {
        const benchIdMatch = benchCard.getAttribute("onclick")?.match(/_selectBenchPlayer\((\d+)\)/);
        if (benchIdMatch) _selectBenchPlayer(Number(benchIdMatch[1]));
      }
    }
    cleanup();
  });

  function cleanup() {
    touchDragId = null;
    touchDragEl = null;
    if (touchGhost) { touchGhost.remove(); touchGhost = null; }
  }
})();
