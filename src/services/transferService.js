function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function randomId(prefix = "trf") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function repoArray(repo, methodName) {
  return typeof repo?.[methodName] === "function" ? repo[methodName]() || [] : [];
}

function buildTransferPrice(player, stage = 1) {
  return Math.floor(Number(player.basePower || player.power || 60) * 6 + Number(player.level || 1) * 40 + stage * 35);
}

function createTransferService({ repo, userSaveService }) {
  function requireSave(username) {
    const save = userSaveService.getUserSave(username);
    if (!save) throw new Error("Save user tidak ditemukan.");
    return save;
  }

  function persist(username, save) {
    return userSaveService.saveUserSave(username, save);
  }

  function generateMarketForSave(save) {
    const catalog = repoArray(repo, "getPlayers");
    const ownedIds = new Set((save.players || []).map((entry) => String(entry.id)));
    const stage = Number(save.stage || 1);
    const pool = catalog.filter((entry) => !ownedIds.has(String(entry.id)));
    const sorted = [...pool].sort((left, right) => Number(right.basePower || 0) - Number(left.basePower || 0));
    const size = Math.min(12, sorted.length);
    const chosen = [];
    while (chosen.length < size && sorted.length) {
      const maxIndex = Math.min(sorted.length - 1, Math.max(3, Math.floor(stage * 2)));
      const index = Math.floor(Math.random() * (maxIndex + 1));
      const player = sorted.splice(index, 1)[0];
      if (!player) break;
      chosen.push({
        ...deepClone(player),
        marketId: randomId("market"),
        price: buildTransferPrice(player, stage)
      });
    }
    return chosen;
  }

  function ensureMarket(save) {
    if (!Array.isArray(save.transferMarket) || !save.transferMarket.length) {
      save.transferMarket = generateMarketForSave(save);
    }
    return save.transferMarket;
  }

  function getMarket(username) {
    const save = requireSave(username);
    const market = ensureMarket(save);
    persist(username, save);
    return {
      market,
      coin: Number(save.coin || 0),
      totalPlayers: (save.players || []).length
    };
  }

  function refreshMarket(username) {
    const save = requireSave(username);
    save.transferMarket = generateMarketForSave(save);
    persist(username, save);
    return { market: save.transferMarket };
  }

  function buyPlayer(username, marketId) {
    const save = requireSave(username);
    const market = ensureMarket(save);
    const index = market.findIndex((entry) => String(entry.marketId) === String(marketId));
    if (index < 0) throw new Error("Pemain market tidak ditemukan");

    const target = market[index];
    const price = Number(target.price || 0);
    if (Number(save.coin || 0) < price) throw new Error("Coin kurang");

    save.coin = Number(save.coin || 0) - price;
    const newPlayer = deepClone(target);
    delete newPlayer.marketId;
    delete newPlayer.price;
    newPlayer.exp = Number(newPlayer.exp || 0);
    newPlayer.level = Number(newPlayer.level || 1);
    newPlayer.curStamina = Number(newPlayer.curStamina ?? 100);
    newPlayer.injury = newPlayer.injury || null;
    newPlayer.equipment = newPlayer.equipment || { HEAD: null, BODY: null, HAND: null, FEET: null, ACC: null };

    save.players = Array.isArray(save.players) ? save.players : [];
    save.players.push(newPlayer);
    save.transferMarket.splice(index, 1);
    persist(username, save);

    return {
      player: newPlayer,
      coin: Number(save.coin || 0),
      totalPlayers: save.players.length,
      market: save.transferMarket
    };
  }

  return {
    getMarket,
    refreshMarket,
    buyPlayer,
    buildTransferPrice
  };
}

module.exports = {
  createTransferService
};
