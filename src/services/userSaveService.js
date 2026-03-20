function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

const FORMATIONS = {
  "4-3-3": ["GK", "LB", "CB1", "CB2", "RB", "CM1", "CM2", "CM3", "LW", "RW", "ST"],
  "4-4-2": ["GK", "LB", "CB1", "CB2", "RB", "LM", "CM1", "CM2", "RM", "ST1", "ST2"],
  "4-2-3-1": ["GK", "LB", "CB1", "CB2", "RB", "DM1", "DM2", "AM1", "AM2", "AM3", "ST"]
};

function normalizeRole(value = "") {
  const role = String(value).toUpperCase();
  if (["GK"].includes(role)) return "GK";
  if (["CB", "LB", "RB", "DEF"].includes(role)) return "DEF";
  if (["DM", "CM", "AM", "LM", "RM", "MID"].includes(role)) return "MID";
  if (["LW", "RW", "ST", "CF", "ATT"].includes(role)) return "ATT";
  return "MID";
}

function roleFromPosition(position = "") {
  if (position.startsWith("GK")) return "GK";
  if (["LB", "CB1", "CB2", "CB3", "RB"].includes(position)) return "DEF";
  if (["DM1", "DM2", "CM1", "CM2", "CM3", "AM1", "AM2", "AM3", "LM", "RM"].includes(position)) return "MID";
  return "ATT";
}

function pickStarterPlayers(playersMaster = []) {
  return playersMaster.slice(0, 16).map((player, index) => ({
    ...deepClone(player),
    id: player.id || `starter_${index + 1}`,
    curStamina: player.curStamina ?? 100,
    exp: player.exp ?? 0,
    level: player.level ?? 1,
    equipment: player.equipment ?? {},
    injury: player.injury ?? null
  }));
}

function buildAutoLineup(players = [], formation = "4-3-3") {
  const lineup = {};
  const positions = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  const pool = [...players];

  positions.forEach((position) => {
    const need = roleFromPosition(position);
    const index = pool.findIndex((player) => normalizeRole(player.role || player.type) === need);
    if (index >= 0) {
      lineup[position] = pool[index].id;
      pool.splice(index, 1);
      return;
    }
    if (pool.length > 0) {
      lineup[position] = pool.shift().id;
      return;
    }
    lineup[position] = null;
  });

  return lineup;
}

function createUserSaveService({ repo, saveRepo }) {
  function buildInitialSave(username, account = {}) {
    const template = deepClone(repo.getSaveTemplate() || {});
    const playersMaster = repo.getPlayers() || [];
    const basePlayers = Array.isArray(template.players) && template.players.length > 0
      ? template.players.map((player, index) => ({
          ...player,
          id: player.id || `tpl_${index + 1}`,
          curStamina: player.curStamina ?? 100,
          exp: player.exp ?? 0,
          level: player.level ?? 1,
          equipment: player.equipment ?? {},
          injury: player.injury ?? null
        }))
      : pickStarterPlayers(playersMaster);

    const formation = template.formation || "4-3-3";
    const save = {
      coin: template.coin ?? 0,
      premiumCoin: template.premiumCoin ?? 0,
      stage: template.stage ?? 1,
      formation,
      lineup: template.lineup && Object.keys(template.lineup).length ? template.lineup : buildAutoLineup(basePlayers, formation),
      inventory: Array.isArray(template.inventory) ? template.inventory : [],
      players: basePlayers,
      winCount: template.winCount ?? 0,
      drawCount: template.drawCount ?? 0,
      loseCount: template.loseCount ?? 0,
      myClub: template.myClub ?? null,
      career: template.career ?? null,
      careerHistory: Array.isArray(template.careerHistory) ? template.careerHistory : [],
      activeBuff: template.activeBuff ?? null,
      character: template.character ?? null,
      profile: {
        username,
        displayName: account.displayName || username
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return save;
  }

  function ensureUserSave(account) {
    const username = account.username;
    let save = saveRepo.get(username, null);
    if (!save) {
      save = buildInitialSave(username, account);
      saveRepo.save(username, save);
    }
    return save;
  }

  function getUserSave(username) {
    return saveRepo.get(username, null);
  }

  function saveUserSave(username, payload) {
    const next = {
      ...payload,
      updatedAt: new Date().toISOString()
    };
    saveRepo.save(username, next);
    return next;
  }

  function setCharacter(username, characterPayload = {}) {
    const current = getUserSave(username) || buildInitialSave(username, { username, displayName: username });
    const next = {
      ...current,
      character: {
        name: String(characterPayload.name || "").trim(),
        age: Number(characterPayload.age || 18),
        nationality: String(characterPayload.nationality || "Indonesia").trim() || "Indonesia",
        position: String(characterPayload.position || "CM").trim().toUpperCase() || "CM"
      }
    };
    return saveUserSave(username, next);
  }

  function buildStatus(username) {
    const save = getUserSave(username);
    if (!save) return null;

    return {
      username,
      displayName: save.profile?.displayName || username,
      coin: save.coin ?? 0,
      premiumCoin: save.premiumCoin ?? 0,
      stage: save.stage ?? 1,
      winCount: save.winCount ?? 0,
      drawCount: save.drawCount ?? 0,
      loseCount: save.loseCount ?? 0,
      formation: save.formation || "4-3-3",
      lineup: save.lineup || {},
      team: save.players || [],
      inventory: save.inventory || [],
      character: save.character || null,
      hasCharacter: !!(save.character && save.character.position),
      needSeasonPos: !!(save.character && !save.seasonPos && save.career && !save.career.finished),
      seasonPos: save.seasonPos || null,
      myClub: save.myClub || null,
      career: save.career || null,
      careerHistory: save.careerHistory || []
    };
  }

  return {
    buildInitialSave,
    ensureUserSave,
    getUserSave,
    saveUserSave,
    setCharacter,
    buildStatus
  };
}

module.exports = {
  createUserSaveService
};
