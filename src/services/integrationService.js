function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureLineupShape(save, teamService) {
  const formation = save.formation || "4-3-3";
  const positions = teamService.FORMATIONS?.[formation] || teamService.FORMATIONS?.["4-3-3"] || [];
  save.lineup = save.lineup && typeof save.lineup === "object" ? save.lineup : {};
  positions.forEach((position) => {
    if (save.lineup[position] === undefined) {
      save.lineup[position] = null;
    }
  });
  Object.keys(save.lineup).forEach((position) => {
    if (!positions.includes(position)) delete save.lineup[position];
  });
}

function ensurePlayers(save) {
  save.players = Array.isArray(save.players) ? save.players : [];
  save.players.forEach((player) => {
    player.level = Number(player.level || 1);
    player.exp = Number(player.exp || 0);
    player.basePower = Number(player.basePower || player.power || 50);
    player.power = Number(player.power || player.basePower || 50);
    player.curStamina = Number(player.curStamina ?? 100);
    player.injury = player.injury || null;
    player.equipment = player.equipment || { HEAD: null, BODY: null, HAND: null, FEET: null, ACC: null };
  });
}

function ensureInventory(save) {
  save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
  save.inventory.forEach((item) => {
    if (item.slot) {
      item.upgrade = Number(item.upgrade || 0);
      item.hp = Number(item.hp ?? 100);
      item.maxHp = Number(item.maxHp ?? 100);
    }
  });
}

function createIntegrationService({ userSaveService, teamService, shopService, gachaService, transferService, matchService }) {
  function requireSave(username) {
    const save = userSaveService.getUserSave(username);
    if (!save) throw new Error("Save user tidak ditemukan.");
    return save;
  }

  function normalizeSave(username) {
    const save = requireSave(username);
    save.coin = Number(save.coin || 0);
    save.premiumCoin = Number(save.premiumCoin || 0);
    save.stage = Number(save.stage || 1);
    save.winCount = Number(save.winCount || 0);
    save.drawCount = Number(save.drawCount || 0);
    save.loseCount = Number(save.loseCount || 0);
    save.formation = save.formation || "4-3-3";
    save.activeBuff = save.activeBuff || null;
    ensurePlayers(save);
    ensureInventory(save);
    ensureLineupShape(save, teamService);
    if (!save.transferMarket) {
      save.transferMarket = transferService.getMarket(username).market;
    }
    if (!save.league || !Array.isArray(save.league.standings)) {
      save.league = matchService.getLeague(username);
    }
    userSaveService.saveUserSave(username, save);
    return {
      normalized: true,
      status: {
        coin: save.coin,
        premiumCoin: save.premiumCoin,
        stage: save.stage,
        winCount: save.winCount,
        drawCount: save.drawCount,
        loseCount: save.loseCount
      }
    };
  }

  function getBootstrap(username) {
    normalizeSave(username);
    const save = requireSave(username);
    return {
      status: {
        coin: Number(save.coin || 0),
        premiumCoin: Number(save.premiumCoin || 0),
        stage: Number(save.stage || 1),
        winCount: Number(save.winCount || 0),
        drawCount: Number(save.drawCount || 0),
        loseCount: Number(save.loseCount || 0),
        activeBuff: deepClone(save.activeBuff || null)
      },
      team: teamService.getTeam(username),
      formation: teamService.getFormation(username),
      inventory: teamService.getInventory(username),
      shop: shopService.getShop(),
      gacha: gachaService.getEvents(),
      transfer: transferService.getMarket(username),
      league: matchService.getLeague(username)
    };
  }

  return {
    normalizeSave,
    getBootstrap
  };
}

module.exports = {
  createIntegrationService
};
