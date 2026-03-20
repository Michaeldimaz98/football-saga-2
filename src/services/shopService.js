function randomId(prefix = "itm") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

const UPGRADE_CONFIG = [
  { level: 0, successRate: 0.9, failDmg: 0, cost: 80 },
  { level: 1, successRate: 0.75, failDmg: 5, cost: 140 },
  { level: 2, successRate: 0.6, failDmg: 10, cost: 200 },
  { level: 3, successRate: 0.45, failDmg: 15, cost: 280 },
  { level: 4, successRate: 0.3, failDmg: 20, cost: 380 },
  { level: 5, successRate: 0.25, failDmg: 25, cost: 500 }
];

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function repoArray(repo, methodName) {
  return typeof repo?.[methodName] === "function" ? repo[methodName]() || [] : [];
}

function createShopService({ repo, userSaveService }) {
  function requireSave(username) {
    const save = userSaveService.getUserSave(username);
    if (!save) throw new Error("Save user tidak ditemukan.");
    return save;
  }

  function persist(username, save) {
    return userSaveService.saveUserSave(username, save);
  }

  function getShop() {
    return {
      equipment: repoArray(repo, "getEquipmentShop"),
      consumables: repoArray(repo, "getConsumables")
    };
  }

  function getEquipmentShop() {
    return repoArray(repo, "getEquipmentShop");
  }

  function getConsumableShop() {
    return repoArray(repo, "getConsumables");
  }

  function buyItem(username, id) {
    const save = requireSave(username);
    const allItems = [...getEquipmentShop(), ...getConsumableShop()];
    const item = allItems.find((entry) => String(entry.id) === String(id));
    if (!item) throw new Error("Item tidak ditemukan");

    const premiumCost = Number(item.premiumPrice || 0);
    const coinCost = Number(item.price || 0);
    if (item.premium || (premiumCost > 0 && !coinCost)) {
      if (Number(save.premiumCoin || 0) < premiumCost) throw new Error("Premium coin kurang");
      save.premiumCoin = Number(save.premiumCoin || 0) - premiumCost;
    } else {
      if (Number(save.coin || 0) < coinCost) throw new Error("Coin kurang");
      save.coin = Number(save.coin || 0) - coinCost;
    }

    const inventoryItem = {
      ...deepClone(item),
      id: randomId(item.slot ? "equip" : "cons"),
      upgrade: item.slot ? 0 : undefined,
      hp: item.slot ? 100 : undefined,
      maxHp: item.slot ? 100 : undefined,
      equippedBy: item.slot ? null : undefined,
      equippedSlot: item.slot ? null : undefined,
      ownedAt: Date.now()
    };

    save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
    save.inventory.push(inventoryItem);
    persist(username, save);

    return {
      item: inventoryItem,
      coin: Number(save.coin || 0),
      premiumCoin: Number(save.premiumCoin || 0)
    };
  }

  function sellPlayer(username, playerId) {
    const save = requireSave(username);
    const lineupIds = Object.values(save.lineup || {}).filter(Boolean).map((entry) => String(entry));
    const index = (save.players || []).findIndex((entry) => String(entry.id) === String(playerId));
    if (index < 0) throw new Error("Pemain tidak ditemukan");
    if (lineupIds.includes(String(playerId))) throw new Error("Starter tidak bisa dijual");
    if ((save.players || []).length <= 11) throw new Error("Minimal 11 pemain tersisa");

    const player = save.players[index];
    const price = Math.floor(Number(player.basePower || player.power || 50) * 3 + Number(player.level || 1) * 20);
    save.players.splice(index, 1);
    save.coin = Number(save.coin || 0) + price;
    persist(username, save);

    return {
      sold: player,
      price,
      coin: save.coin,
      totalPlayers: save.players.length
    };
  }

  function takeConsumable(save, effectName) {
    const index = (save.inventory || []).findIndex((entry) => !entry.slot && String(entry.effect) === String(effectName));
    if (index < 0) return null;
    const item = save.inventory[index];
    save.inventory.splice(index, 1);
    return item;
  }

  function upgradeEquipment(username, equipId, useProtect) {
    const save = requireSave(username);
    const equipment = (save.inventory || []).find((entry) => String(entry.id) === String(equipId) && entry.slot);
    if (!equipment) throw new Error("Item tidak ditemukan");

    const level = Number(equipment.upgrade || 0);
    const config = UPGRADE_CONFIG[Math.min(level, UPGRADE_CONFIG.length - 1)];
    if (Number(save.coin || 0) < Number(config.cost || 0)) throw new Error("Coin kurang");

    let protectedUpgrade = false;
    if (useProtect || save.upgradeProtect) {
      if (save.upgradeProtect) {
        protectedUpgrade = true;
        save.upgradeProtect = false;
      } else {
        protectedUpgrade = Boolean(takeConsumable(save, "upgrade_protect"));
      }
    }
    const boostItem = takeConsumable(save, "upgrade_boost");
    const boost = Number(boostItem?.value || 0) + (save.upgradeBoost || 0);
    if (save.upgradeBoost) save.upgradeBoost = 0; // reset after use

    save.coin = Number(save.coin || 0) - Number(config.cost || 0);
    const chance = Math.min(99, Math.round(Number(config.successRate || 0) * 100 + boost));
    const roll = Math.random() * 100;
    const success = roll <= chance;
    let broken = false;
    let hpLost = 0;
    let msg = "";

    equipment.hp = Number(equipment.hp ?? 100);
    equipment.maxHp = Number(equipment.maxHp ?? 100);
    equipment.upgrade = Number(equipment.upgrade || 0);

    if (success) {
      equipment.upgrade += 1;
      msg = `✨ Upgrade sukses ke +${equipment.upgrade}`;
    } else {
      hpLost = Number(config.failDmg || 0);
      if (!protectedUpgrade) {
        equipment.hp = Math.max(0, equipment.hp - hpLost);
      }
      if (equipment.hp <= 0 && !protectedUpgrade) {
        broken = true;
        (save.players || []).forEach((player) => {
          if (!player.equipment) return;
          Object.keys(player.equipment).forEach((slot) => {
            if (String(player.equipment[slot]) === String(equipment.id)) {
              player.equipment[slot] = null;
            }
          });
        });
        save.inventory = (save.inventory || []).filter((entry) => String(entry.id) !== String(equipment.id));
        msg = "💥 Upgrade gagal dan equipment hancur";
      } else if (protectedUpgrade) {
        msg = `🛡️ Upgrade gagal tapi item terlindungi`;
      } else {
        msg = `❌ Upgrade gagal, durability -${hpLost}`;
      }
    }

    persist(username, save);
    return {
      success,
      broken,
      hpLost,
      msg,
      upgrade: broken ? null : Number(equipment.upgrade || 0),
      hp: broken ? 0 : Number(equipment.hp ?? 100),
      coin: Number(save.coin || 0)
    };
  }

  function repairEquipment(username, equipId, repairItemId) {
    const save = requireSave(username);
    const equipment = (save.inventory || []).find((entry) => String(entry.id) === String(equipId) && entry.slot);
    if (!equipment) throw new Error("Equipment tidak ditemukan");

    let repairItem = null;
    if (repairItemId) {
      repairItem = (save.inventory || []).find((entry) => String(entry.id) === String(repairItemId));
    } else {
      repairItem = (save.inventory || []).find((entry) => !entry.slot && String(entry.effect || "").includes("repair"));
    }
    if (!repairItem || repairItem.slot || String(repairItem.effect || "").indexOf("repair") < 0) {
      throw new Error("Item repair tidak ditemukan");
    }

    equipment.maxHp = Number(equipment.maxHp ?? 100);
    equipment.hp = Math.min(equipment.maxHp, Number(equipment.hp ?? 100) + Number(repairItem.value || 20));
    save.inventory = (save.inventory || []).filter((entry) => String(entry.id) !== String(repairItem.id));
    persist(username, save);

    return {
      success: true,
      hp: equipment.hp,
      msg: `🔧 HP +${repairItem.value || 20} (${equipment.hp}/${equipment.maxHp})`
    };
  }

  return {
    UPGRADE_CONFIG,
    getShop,
    getEquipmentShop,
    getConsumableShop,
    buyItem,
    sellPlayer,
    upgradeEquipment,
    repairEquipment
  };
}

module.exports = {
  createShopService
};
