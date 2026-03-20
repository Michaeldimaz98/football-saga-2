function randomId(prefix = "gacha") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

const GACHA_EVENTS = {
  standard: {
    id: "standard",
    name: "Standard Scout",
    icon: "⚽",
    badge: null,
    badgeColor: null,
    desc: "Scout pemain & equipment standard",
    costType: "coin",
    cost: 180,
    cost10: 1600,
    rateBoost: {},
    pool: "all"
  },
  premium: {
    id: "premium",
    name: "Premium Scout",
    icon: "💎",
    badge: "HOT",
    badgeColor: "#a855f7",
    desc: "Rate S/SS/SSR meningkat drastis!",
    costType: "premiumCoin",
    cost: 3,
    cost10: 25,
    rateBoost: { A: 1.2, S: 1.4, SS: 1.8, SSR: 2.2 },
    pool: "all"
  },
  equipment: {
    id: "equipment",
    name: "Equipment Banner",
    icon: "🔧",
    badge: "NEW",
    badgeColor: "#22c55e",
    desc: "Fokus equipment rare & epic",
    costType: "coin",
    cost: 220,
    cost10: 1900,
    rateBoost: { A: 1.25, S: 1.5, SS: 1.8, SSR: 2 },
    pool: "equipment"
  },
  repair: {
    id: "repair",
    name: "Support Banner",
    icon: "🩹",
    badge: null,
    badgeColor: null,
    desc: "Repair kit & consumable support",
    costType: "coin",
    cost: 150,
    cost10: 1300,
    rateBoost: { B: 1.2, A: 1.3 },
    pool: "repair"
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function repoArray(repo, methodName) {
  return typeof repo?.[methodName] === "function" ? repo[methodName]() || [] : [];
}

function weightedRandom(pool, rateBoost = {}) {
  const rarities = ["C", "B", "A", "S", "SS", "SSR"];
  const baseRates = { C: 45, B: 30, A: 16, S: 7, SS: 1.5, SSR: 0.5 };
  const rates = { ...baseRates };
  Object.entries(rateBoost || {}).forEach(([rarity, mult]) => {
    rates[rarity] = Math.min((rates[rarity] || 0) * Number(mult || 1), 60);
  });

  const total = Object.values(rates).reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  let targetRarity = "C";

  for (const rarity of rarities) {
    roll -= Number(rates[rarity] || 0);
    if (roll <= 0) {
      targetRarity = rarity;
      break;
    }
  }

  let filtered = pool.filter((entry) => entry.rarity === targetRarity);
  if (!filtered.length) filtered = pool;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function createGachaService({ repo, userSaveService }) {
  function requireSave(username) {
    const save = userSaveService.getUserSave(username);
    if (!save) throw new Error("Save user tidak ditemukan.");
    return save;
  }

  function persist(username, save) {
    return userSaveService.saveUserSave(username, save);
  }

  function getEvents() {
    return { events: GACHA_EVENTS };
  }

  function getPool(eventId) {
    const event = GACHA_EVENTS[eventId] || GACHA_EVENTS.standard;
    // Gacha pakai equipment.json (eksklusif) bukan equipment_shop.json
    const gachaCatalog = repoArray(repo, "getEquipment");
    const shopCatalog = repoArray(repo, "getEquipmentShop");
    const consumables = repoArray(repo, "getConsumables");
    const baseCatalog = gachaCatalog.length ? gachaCatalog : shopCatalog;
    let pool = baseCatalog.map((item) => deepClone(item));

    if (event.pool === "equipment") {
      pool = pool.filter((entry) => ["FEET", "BODY", "HEAD", "HAND", "ACC"].includes(entry.slot));
    }
    if (event.pool === "repair") {
      pool = [
        ...pool.slice(0, 8),
        ...consumables.filter((entry) => ["repair", "upgrade"].includes(entry.category))
      ];
    }

    // Premium scout: tambahkan icon players ke pool dengan rarity SSR
    if (event.pool === "all" && event.id === "premium") {
      const ICON_PLAYERS = [
        { id: "icon_bepe", name: "Bambang Pamungkas", nickname: "Bepe", role: "ST", rarity: "SSR", basePower: 90,
          power: 90, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:68, shooting:92, passing:70, defense:30, stamina:65, mentality:95 },
          trait: "Clinical Finisher", skill: "HAT_TRICK",
          iconDesc: "Legenda Persija & Timnas Indonesia", image: "https://i.imgur.com/8QfQYpL.png" },
        { id: "icon_kurus_emas", name: "Kurniawan Dwi Yulianto", nickname: "Kurus Emas", role: "ST", rarity: "SSR", basePower: 88,
          power: 88, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:92, shooting:85, passing:62, defense:25, stamina:60, mentality:88 },
          trait: "Speed Demon", skill: "DRIBBLE",
          iconDesc: "Penyerang legendaris, top scorer sepanjang masa Timnas", image: "https://i.imgur.com/8QfQYpL.png" },
        { id: "icon_bima_sakti", name: "Bima Sakti", nickname: "The General", role: "CM", rarity: "SSR", basePower: 85,
          power: 85, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:62, shooting:70, passing:88, defense:72, stamina:65, mentality:95 },
          trait: "Leadership", skill: "VISION",
          iconDesc: "Gelandang jenderal lapangan tengah legendaris Indonesia", image: "https://i.imgur.com/8QfQYpL.png" },
        { id: "icon_ilham", name: "Ilham Jayakusuma", nickname: "Si Kuning", role: "ST", rarity: "SS", basePower: 82,
          power: 82, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:85, shooting:80, passing:65, defense:28, stamina:70, mentality:85 },
          trait: "Poacher", skill: "CLINICAL",
          iconDesc: "Striker cepat, motor serangan Timnas era 2000an", image: "https://i.imgur.com/8QfQYpL.png" },
        { id: "icon_ponaryo", name: "Ponaryo Astaman", nickname: "Si Serigala", role: "CM", rarity: "SS", basePower: 80,
          power: 80, icon: "⭐", slot: null, category: "icon_player", special: "icon",
          stats: { pace:70, shooting:72, passing:84, defense:68, stamina:78, mentality:88 },
          trait: "Box to Box", skill: "STAMINA_KING",
          iconDesc: "Gelandang dinamis penggerak Timnas dekade 2000an", image: "https://i.imgur.com/8QfQYpL.png" },
      ];
      // Tambah ikon ke pool (30% chance muncul ikon di pull SSR/SS range)
      pool = [...pool, ...ICON_PLAYERS];
    }

    if (!pool.length) pool = shopCatalog.length ? shopCatalog : baseCatalog;
    return { event, pool };
  }

  function charge(save, event, count) {
    const totalCost = count >= 10 ? Number(event.cost10 || event.cost * count) : Number(event.cost || 0) * count;
    if (event.costType === "premiumCoin") {
      if (Number(save.premiumCoin || 0) < totalCost) throw new Error("Premium coin kurang");
      save.premiumCoin = Number(save.premiumCoin || 0) - totalCost;
    } else {
      if (Number(save.coin || 0) < totalCost) throw new Error("Coin kurang");
      save.coin = Number(save.coin || 0) - totalCost;
    }
  }

  function createRewardItem(reward) {
    return {
      ...deepClone(reward),
      id: randomId(reward.slot ? "equip" : "cons"),
      upgrade: reward.slot ? 0 : undefined,
      hp: reward.slot ? 100 : undefined,
      maxHp: reward.slot ? 100 : undefined,
      equippedBy: reward.slot ? null : undefined,
      equippedSlot: reward.slot ? null : undefined,
      ownedAt: Date.now()
    };
  }

  function spin(username, eventId = "standard") {
    const save = requireSave(username);
    const { event, pool } = getPool(eventId);
    charge(save, event, 1);

    const reward = weightedRandom(pool, event.rateBoost);
    const item = createRewardItem(reward);
    save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
    save.inventory.push(item);
    save.lastGacha = Date.now();
    persist(username, save);

    return {
      reward: item,
      coin: Number(save.coin || 0),
      premiumCoin: Number(save.premiumCoin || 0),
      event
    };
  }

  function spinBatch(username, eventId = "standard", times = 10) {
    const save = requireSave(username);
    const { event, pool } = getPool(eventId);
    const count = Math.min(10, Math.max(1, Number(times || 10)));
    charge(save, event, count);

    const rewards = [];
    let highSoFar = false;
    for (let index = 0; index < count; index += 1) {
      let reward;
      if (index === count - 1 && !highSoFar) {
        const highPool = pool.filter((entry) => ["A", "S", "SS", "SSR"].includes(entry.rarity));
        reward = weightedRandom(highPool.length ? highPool : pool, event.rateBoost);
      } else {
        reward = weightedRandom(pool, event.rateBoost);
      }
      if (["A", "S", "SS", "SSR"].includes(reward.rarity)) highSoFar = true;
      const item = createRewardItem(reward);
      save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
      save.inventory.push(item);
      rewards.push(item);
    }

    save.lastGacha = Date.now();
    persist(username, save);

    return {
      rewards,
      coin: Number(save.coin || 0),
      premiumCoin: Number(save.premiumCoin || 0),
      event
    };
  }

  return {
    GACHA_EVENTS,
    getEvents,
    spin,
    spinBatch
  };
}

module.exports = {
  createGachaService
};
