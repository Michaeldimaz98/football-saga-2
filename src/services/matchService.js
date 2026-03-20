function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createLeagueTable(save) {
  const market = save.transferMarket || [];
  const myClub = {
    id: "my_club",
    name: save.teamName || save.profile?.teamName || "My Club",
    logo: "⭐"
  };
  const table = [
    { club: myClub, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, isMe: true }
  ];

  for (let i = 0; i < 7; i += 1) {
    const source = market[i] || { name: `Club ${i + 1}`, basePower: 65 };
    table.push({
      club: {
        id: `cpu_${i + 1}`,
        name: `${source.name || `Club ${i + 1}`} FC`,
        logo: ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠", "⚫"][i % 7]
      },
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      strength: Number(source.basePower || source.power || 65)
    });
  }

  return {
    season: Number(save.season || 1),
    fixturesPlayed: 0,
    standings: table,
    finished: false,
    reward: 0,
    premiumReward: 0
  };
}

function applyResult(team, goalsFor, goalsAgainst) {
  team.played += 1;
  team.goalsFor += goalsFor;
  team.goalsAgainst += goalsAgainst;
  if (goalsFor > goalsAgainst) {
    team.won += 1;
    team.points += 3;
  } else if (goalsFor === goalsAgainst) {
    team.drawn += 1;
    team.points += 1;
  } else {
    team.lost += 1;
  }
}

function sortStandings(standings) {
  return standings.sort((left, right) => {
    const pointsDiff = Number(right.points || 0) - Number(left.points || 0);
    if (pointsDiff) return pointsDiff;
    const gdRight = Number(right.goalsFor || 0) - Number(right.goalsAgainst || 0);
    const gdLeft = Number(left.goalsFor || 0) - Number(left.goalsAgainst || 0);
    if (gdRight !== gdLeft) return gdRight - gdLeft;
    return Number(right.goalsFor || 0) - Number(left.goalsFor || 0);
  }).map((entry, index) => ({ ...entry, rank: index + 1, gd: Number(entry.goalsFor || 0) - Number(entry.goalsAgainst || 0) }));
}

function createMatchService({ userSaveService, teamService, transferService }) {
  function requireSave(username) {
    const save = userSaveService.getUserSave(username);
    if (!save) throw new Error("Save user tidak ditemukan.");
    return save;
  }

  function persist(username, save) {
    return userSaveService.saveUserSave(username, save);
  }

  function ensureLeague(save) {
    if (!save.league || !Array.isArray(save.league.standings)) {
      save.league = createLeagueTable(save);
    }
    return save.league;
  }

  function getLeague(username) {
    const save = requireSave(username);
    const league = ensureLeague(save);
    persist(username, save);
    return league;
  }

  function simulateGoals(sidePower, rivalPower) {
    const ratio = sidePower / Math.max(1, rivalPower);
    let goals = 0;
    const chances = clamp(Math.round(3 + ratio * 2), 2, 7);
    for (let i = 0; i < chances; i += 1) {
      const scoreChance = 0.12 + clamp((ratio - 1) * 0.12, -0.04, 0.18);
      if (Math.random() < scoreChance) goals += 1;
    }
    return clamp(goals, 0, 6);
  }

  function applyPostMatch(save, starters) {
    const events = [];
    const playersMap = new Map();
    (save.players || []).forEach(p => playersMap.set(String(p.id), p));
    
    const inventoryMap = new Map();
    (save.inventory || []).forEach(i => inventoryMap.set(String(i.id), i));

    starters.forEach((player) => {
      if (!player) return;
      const target = playersMap.get(String(player.id));
      if (!target) return;
      
      const drain = target._noStaminaDrain ? 0 : 18 + Math.floor(Math.random() * 18);
      target.curStamina = Math.max(0, Number(target.curStamina ?? 100) - drain);
      target.exp = Number(target.exp || 0) + 30;
      target.level = Number(target.level || 1);
      
      while (target.exp >= target.level * 100) {
        target.exp -= target.level * 100;
        target.level += 1;
        target.basePower = Number(target.basePower || target.power || 50) + 2;
        events.push({ id: target.id, name: target.name, level: target.level });
      }
      
      if (Math.random() < 0.08) {
        target.injury = { matchesLeft: 1 + Math.floor(Math.random() * 2), type: "knock" };
      }

      // REDUCE EQUIPMENT DURABILITY (Fix for repair kits being useful)
      if (target.equipment) {
        Object.values(target.equipment).forEach((eid) => {
          if (!eid) return;
          const equip = inventoryMap.get(String(eid));
          if (equip && equip.slot) {
            equip.hp = Math.max(0, Number(equip.hp ?? 100) - (3 + Math.floor(Math.random() * 3)));
          }
        });
      }
    });
    
    if (save.activeBuff) {
      save.activeBuff.duration = Number(save.activeBuff.duration || 1) - 1;
      if (save.activeBuff.duration <= 0) save.activeBuff = null;
    }
    return events;
  }

  function playMatch(username) {
    const save = requireSave(username);
    const team = teamService.getTeam(username);
    const starterCount = (team.starters || []).filter((p) => p && p.id).length;
    if (starterCount < 11) throw new Error(`Lineup belum penuh: ${starterCount}/11. Atur lineup di Formation.`);

    const league = ensureLeague(save);
    const cpuPool = sortStandings(league.standings.filter((entry) => !entry.isMe));
    const opponent = deepClone(cpuPool[Math.floor(Math.random() * cpuPool.length)]);
    const starterPowers = (team.starters || []).map((player) => Number(player.currentPower || player.basePower || 0));
    const sidePower = average(starterPowers) + Number(team.chemistry || 0) + Number(save.activeBuff?.value || 0);
    const rivalPower = Number(opponent.strength || 68) + Math.floor(Math.random() * 18);

    const myGoals = simulateGoals(sidePower, rivalPower);
    const oppGoals = simulateGoals(rivalPower, sidePower);

    save.winCount = Number(save.winCount || 0) + (myGoals > oppGoals ? 1 : 0);
    save.drawCount = Number(save.drawCount || 0) + (myGoals === oppGoals ? 1 : 0);
    save.loseCount = Number(save.loseCount || 0) + (myGoals < oppGoals ? 1 : 0);

    const coinReward = myGoals > oppGoals ? 120 : myGoals === oppGoals ? 60 : 30;
    const premiumReward = myGoals > oppGoals && Math.random() < 0.15 ? 1 : 0;
    save.coin = Number(save.coin || 0) + coinReward;
    save.premiumCoin = Number(save.premiumCoin || 0) + premiumReward;
    save.stage = Number(save.stage || 1) + (myGoals > oppGoals ? 1 : 0);

    const table = league.standings;
    const myIndex = table.findIndex((entry) => entry.isMe);
    const oppIndex = table.findIndex((entry) => entry.club?.id === opponent.club?.id);
    
    // Simulate other matches in league
    table.forEach((entry, idx) => {
      if (idx !== myIndex && idx !== oppIndex) {
        const otherOppIdx = (idx + 1) % table.length;
        const targetOpp = table[otherOppIdx === myIndex || otherOppIdx === oppIndex ? (otherOppIdx + 2) % table.length : otherOppIdx];
        
        const g1 = simulateGoals(entry.strength || 65, targetOpp.strength || 65);
        const g2 = simulateGoals(targetOpp.strength || 65, entry.strength || 65);
        applyResult(entry, g1, g2);
      }
    });

    applyResult(table[myIndex], myGoals, oppGoals);
    applyResult(table[oppIndex], oppGoals, myGoals);
    league.fixturesPlayed = Number(league.fixturesPlayed || 0) + 1;
    league.standings = sortStandings(table);

    if (league.fixturesPlayed >= 7) {
      league.finished = true;
      const myStanding = league.standings.find((entry) => entry.isMe);
      const rank = Number(myStanding?.rank || league.standings.length);
      league.reward = rank === 1 ? 900 : rank <= 3 ? 500 : 250;
      league.premiumReward = rank === 1 ? 5 : rank <= 3 ? 2 : 0;
      save.coin = Number(save.coin || 0) + league.reward;
      save.premiumCoin = Number(save.premiumCoin || 0) + league.premiumReward;
      save.season = Number(save.season || 1) + 1;
      save.transferMarket = transferService.refreshMarket(username).market;
    }

    const levelUpEvents = applyPostMatch(save, team.starters || []);
    persist(username, save);

    return {
      opponent: opponent.club,
      score: { myGoals, oppGoals },
      result: myGoals > oppGoals ? "win" : myGoals === oppGoals ? "draw" : "lose",
      rewards: {
        coin: coinReward,
        premiumCoin: premiumReward
      },
      league: save.league,
      levelUpEvents,
      status: {
        coin: Number(save.coin || 0),
        premiumCoin: Number(save.premiumCoin || 0),
        stage: Number(save.stage || 1),
        winCount: Number(save.winCount || 0),
        drawCount: Number(save.drawCount || 0),
        loseCount: Number(save.loseCount || 0)
      }
    };
  }

  function getMatchStatus(username) {
    const save = requireSave(username);
    const stage = Number(save.stage || 1);
    
    // Logic Region sederhana
    const regions = [
      { min: 1,  max: 10,  name: "Asia Tenggara", icon: "🌏", milestone: "Elite Asia" },
      { min: 11, max: 30,  name: "Asia Timur",    icon: "🇯🇵", milestone: "Continental Pro" },
      { min: 31, max: 60,  name: "Eropa Barat",   icon: "🇪🇺", milestone: "World Class" },
      { min: 61, max: 100, name: "Dunia",         icon: "🌎", milestone: "Legendary" }
    ];
    
    const reg = regions.find(r => stage <= r.max) || regions[regions.length-1];
    const progress = Math.min(100, Math.floor(((stage - reg.min) / (reg.max - reg.min + 1)) * 100));

    return {
      stage,
      regionName: reg.name,
      regionIcon: reg.icon,
      nextMilestone: reg.milestone,
      progressToNext: progress,
      rewards: { next: "Coins & Exp" }
    };
  }

  return {
    getLeague,
    playMatch,
    getMatchStatus
  };
}

module.exports = {
  createMatchService
};
