const FORMATIONS = {
  "4-4-2": ["GK", "LB", "CB1", "CB2", "RB", "LM", "CM1", "CM2", "RM", "ST1", "ST2"],
  "4-3-3": ["GK", "LB", "CB1", "CB2", "RB", "CM1", "CM2", "CM3", "LW", "RW", "ST"],
  "3-5-2": ["GK", "CB1", "CB2", "CB3", "LM", "CM1", "CM2", "CM3", "RM", "ST1", "ST2"],
  "4-2-3-1": ["GK", "LB", "CB1", "CB2", "RB", "DM1", "DM2", "AM1", "AM2", "AM3", "ST"],
  "5-3-2": ["GK", "LB", "CB1", "CB2", "CB3", "RB", "CM1", "CM2", "CM3", "ST1", "ST2"]
};

const CLUB_NPC_PLAYERS = {
  "persija": [
    { name: "Andritany", role: "GK", power: 75 },
    { name: "Ondrej Kudela", role: "CB", power: 78 },
    { name: "Rizky Ridho", role: "CB", power: 76 },
    { name: "Firza Andika", role: "LB", power: 72 },
    { name: "Rio Fahmi", role: "RB", power: 70 },
    { name: "Hanif Sjahbandi", role: "DM", power: 73 },
    { name: "Maciej Gajos", role: "AM", power: 75 },
    { name: "Ryo Matsumura", role: "LW", power: 76 },
    { name: "Witan Sulaeman", role: "RW", power: 74 },
    { name: "Marko Simic", role: "ST", power: 75 },
    { name: "Rayhan Hannan", role: "CM", power: 68 }
  ],
  "persib": [
    { name: "Kevin Ray Mendoza", role: "GK", power: 76 },
    { name: "Nick Kuipers", role: "CB", power: 77 },
    { name: "Alberto Rodriguez", role: "CB", power: 75 },
    { name: "Rezaldi Hehanussa", role: "LB", power: 71 },
    { name: "Henhen Herdiana", role: "RB", power: 70 },
    { name: "Marc Klok", role: "CM", power: 78 },
    { name: "Dedi Kusnandar", role: "DM", power: 72 },
    { name: "Stefano Beltrame", role: "AM", power: 75 },
    { name: "Ciro Alves", role: "LW", power: 79 },
    { name: "Febri Hariyadi", role: "RW", power: 71 },
    { name: "David da Silva", role: "ST", power: 80 }
  ],
  "persebaya": [
    { name: "Ernando Ari", role: "GK", power: 75 },
    { name: "Dusan Stevanovic", role: "CB", power: 74 },
    { name: "Yan Victor", role: "CB", power: 73 },
    { name: "Reva Adi Utama", role: "LB", power: 70 },
    { name: "Arief Catur", role: "RB", power: 69 },
    { name: "Andre Oktaviansyah", role: "DM", power: 70 },
    { name: "M. Hidayat", role: "CM", power: 71 },
    { name: "Song Ui-young", role: "AM", power: 74 },
    { name: "Bruno Moreira", role: "LW", power: 77 },
    { name: "Robson Duarte", role: "RW", power: 75 },
    { name: "Wildan Ramdhani", role: "ST", power: 70 }
  ]
};

function generateGenericNPCs(count, basePower) {
  const names = ["Andika", "Budi", "Cahyo", "Dedi", "Eko", "Fajar", "Guntur", "Hendra", "Indra", "Joko", "Kurnia", "Lukas", "Mulyono", "Nanang", "Oki", "Putra", "Rian", "Soni", "Teguh", "Umar"];
  const roles = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];
  const squad = [];
  for (let i = 0; i < count; i++) {
    squad.push({
      id: `npc_${Date.now()}_${i}`,
      name: names[i % names.length] + " NPC",
      role: roles[i % roles.length],
      power: basePower + Math.floor(Math.random() * 5),
      isNPC: true
    });
  }
  return squad;
}

function buildClubTeamSummary(save, clubId) {
  const inventory = getInventorySplit(save).allItems;
  // 1. Get User Character
  const userChar = (save.players || []).find(p => p.humanControlled || p.isUserPlayer) || (save.players && save.players[0]);
  const hydratedUserChar = userChar ? hydratePlayer(userChar, inventory, {}) : null;

  // 2. Get Club NPCs
  let npcs = CLUB_NPC_PLAYERS[clubId] || [];
  if (npcs.length === 0) {
    npcs = generateGenericNPCs(11, 60);
  }

  // 3. Convert NPCs to player objects
  const npcPlayers = npcs.map((n, idx) => ({
    id: `npc_${clubId}_${idx}`,
    name: n.name,
    role: n.role,
    type: roleGroup(n.role),
    basePower: n.power,
    currentPower: n.power,
    level: 1,
    isNPC: true,
    isStarter: true // Auto starter for now
  }));

  // 4. Combine: User Char + NPCs (Filter out NPCs that match User Char's role if needed, or just let them coexist)
  // Logic: Character always starts. If character is ST, remove one NPC ST.
  const userRole = hydratedUserChar ? roleGroup(hydratedUserChar.role || hydratedUserChar.type) : null;
  const filteredNpcs = userRole ? npcPlayers.filter(n => n.role !== userRole || Math.random() > 0.5).slice(0, 10) : npcPlayers.slice(0, 10);
  
  const starters = [hydratedUserChar, ...filteredNpcs].filter(Boolean);
  
  return {
    formation: "4-3-3", // Default for career
    chemistry: 15 + Math.floor(Math.random() * 10), // Career chemistry
    startingPower: starters.reduce((sum, p) => sum + (p.currentPower || p.power || 0), 0),
    starters,
    bench: [],
    players: starters,
    isCareerMode: true
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function roleGroup(value = "") {
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

function equipmentPower(equipment = {}) {
  const upgrade = Number(equipment.upgrade || 0);
  const baseVal = Number(equipment.power || equipment.basePower || 0);
  let val = baseVal + (upgrade * 2);

  // Enchant: Sharp (+15% stat utama)
  if (equipment.enchant?.type === "sharp") {
    val = Math.round(val * (1 + (Number(equipment.enchant.value || 15) / 100)));
  }

  return val;
}

function applyEquipmentBonus(player, inventory) {
  const stats = {
    pace: player.pace ?? 50,
    shooting: player.shooting ?? 50,
    passing: player.passing ?? 50,
    defense: player.defense ?? 50,
    stamina: player.stamina ?? 100,
    mentality: player.mentality ?? 100
  };
  let equipPower = 0;

  // Optimize with Map if inventory is large
  const inventoryMap = new Map();
  inventory.forEach(item => inventoryMap.set(String(item.id), item));

  Object.entries(player.equipment || {}).forEach(([slotName, itemId]) => {
    if (!itemId) return;
    const item = inventoryMap.get(String(itemId));
    if (!item || !item.slot) return;
    equipPower += equipmentPower(item);
    if (item.bonus && typeof item.bonus === "object") {
      Object.entries(item.bonus).forEach(([key, value]) => {
        if (stats[key] !== undefined) {
          stats[key] += Number(value || 0) * (1 + Number(item.upgrade || 0) * 0.1);
        }
      });
    }
  });

  return { stats, equipPower };
}

function calcPlayerPower(player, inventory) {
  const base = Number(player.basePower || player.power || 0);
  const { stats, equipPower } = applyEquipmentBonus(player, inventory);
  const role = roleGroup(player.role || player.type);
  let roleFactor = 1;
  if (role === "GK") roleFactor = (stats.defense * 0.6 + stats.mentality * 0.4) / 100;
  if (role === "DEF") roleFactor = (stats.defense * 0.6 + stats.stamina * 0.4) / 100;
  if (role === "MID") roleFactor = (stats.passing * 0.5 + stats.stamina * 0.3 + stats.defense * 0.2) / 100;
  if (role === "ATT") roleFactor = (stats.shooting * 0.6 + stats.pace * 0.4) / 100;

  const levelFactor = 1 + (Math.max(1, Number(player.level || 1)) - 1) * 0.05;
  const stamina = Number(player.curStamina ?? 100);
  const staminaFactor = stamina >= 50 ? 1 : 0.6 + (stamina / 50) * 0.4;
  const injuryFactor = player.injury ? 0.6 : 1;
  const mentalityFactor = Math.max(0.1, stats.mentality / 100);
  const power = Math.max(1, Math.floor((base + equipPower) * roleFactor * levelFactor * staminaFactor * injuryFactor * mentalityFactor));

  return {
    power,
    equipPower,
    stats
  };
}

function calcChemistry(lineup, players) {
  const ids = Object.values(lineup || {}).filter(Boolean);
  if (ids.length === 0) return 0;

  const activePlayers = ids.map(id => players.find(p => String(p.id) === String(id))).filter(Boolean);
  
  const roles = {};
  const rarities = {};
  let links = 0;

  activePlayers.forEach(p => {
    const role = roleGroup(p.role || p.type);
    const rarity = p.rarity || 'common';

    if (roles[role]) {
      links += roles[role];
      roles[role] += 1;
    } else {
      roles[role] = 1;
    }

    if (rarities[rarity]) {
      links += rarities[rarity];
      rarities[rarity] += 1;
    } else {
      rarities[rarity] = 1;
    }
  });

  return Math.min(100, links * 2); // Buffed chemistry scaling
}

function hydratePlayer(player, inventory, lineup) {
  const powerInfo = calcPlayerPower(player, inventory);
  const lineupEntries = Object.entries(lineup || {});
  const lineupPosition = lineupEntries.find(([, playerId]) => String(playerId) === String(player.id))?.[0] || null;
  return {
    ...deepClone(player),
    currentPower: powerInfo.power,
    equipPower: powerInfo.equipPower,
    calculatedStats: powerInfo.stats,
    lineupPosition,
    isStarter: Boolean(lineupPosition)
  };
}

function getInventorySplit(save) {
  const allItems = Array.isArray(save.inventory) ? save.inventory : [];
  const equipment = allItems.filter((item) => item && item.slot);
  const consumables = allItems.filter((item) => item && !item.slot);
  return { allItems, equipment, consumables };
}

function buildLineupPlayers(save) {
  const inventory = getInventorySplit(save).allItems;
  return Object.entries(save.lineup || {}).map(([position, playerId]) => {
    const player = (save.players || []).find((entry) => String(entry.id) === String(playerId));
    return {
      position,
      player: player ? hydratePlayer(player, inventory, save.lineup) : null,
      role: roleFromPosition(position)
    };
  });
}

function buildTeamSummary(save) {
  const inventory = getInventorySplit(save).allItems;
  const players = (save.players || []).map((player) => hydratePlayer(player, inventory, save.lineup || {}));
  const starters = players.filter((player) => player.isStarter);
  const bench = players.filter((player) => !player.isStarter);
  const chemistry = calcChemistry(save.lineup || {}, save.players || []);
  const squadPower = players.reduce((sum, player) => sum + Number(player.currentPower || 0), 0);
  const startingPower = starters.reduce((sum, player) => sum + Number(player.currentPower || 0), 0);

  return {
    formation: save.formation || "4-3-3",
    lineup: save.lineup || {},
    chemistry,
    squadPower,
    startingPower,
    totalPlayers: players.length,
    starters,
    bench,
    players,
    lineupPlayers: buildLineupPlayers(save)
  };
}

function tryLevelUp(player) {
  const events = [];
  player.level = Number(player.level || 1);
  player.exp = Number(player.exp || 0);
  while (player.exp >= player.level * 100) {
    player.exp -= player.level * 100;
    player.level += 1;
    player.basePower = Number(player.basePower || player.power || 50) + 2;
    events.push({ id: player.id, name: player.name, level: player.level });
  }
  return events;
}

function createTeamService({ repo, userSaveService }) {
  function requireSave(username) {
    const save = userSaveService.getUserSave(username);
    if (!save) {
      throw new Error("Save user tidak ditemukan.");
    }
    return save;
  }

  function save(username, nextSave) {
    return userSaveService.saveUserSave(username, nextSave);
  }

  function getTeam(username, mode = "match", clubId = null) {
    const saveData = requireSave(username);
    if (mode === "match") {
      return buildTeamSummary(saveData);
    } else {
      const targetClub = clubId || (saveData.myClub?.id);
      return buildClubTeamSummary(saveData, targetClub);
    }
  }

  function getFormation(username) {
    const saveData = requireSave(username);
    return {
      formation: saveData.formation || "4-3-3",
      lineup: saveData.lineup || {},
      formationMap: FORMATIONS,
      lineupPlayers: buildLineupPlayers(saveData)
    };
  }

  function changeFormation(username, formation) {
    if (!FORMATIONS[formation]) {
      throw new Error("Formation tidak valid.");
    }
    const saveData = requireSave(username);
    saveData.formation = formation;
    saveData.lineup = {};
    FORMATIONS[formation].forEach((position) => {
      saveData.lineup[position] = null;
    });
    save(username, saveData);
    return getFormation(username);
  }

  function setFormationPlayer(username, position, playerId) {
    const saveData = requireSave(username);
    if (!FORMATIONS[saveData.formation || "4-3-3"]?.includes(position)) {
      throw new Error("Posisi formation tidak valid.");
    }

    // BUG8 FIX: Normalisasi playerId ke String agar ID campuran (int / tp_xxx / fa_xxx / youth_xxx) cocok
    const playerIdStr = String(playerId);
    const player = (saveData.players || []).find((entry) => String(entry.id) === playerIdStr);
    if (!player) {
      throw new Error("Player tidak ditemukan. Pastikan pemain sudah ada di squad.");
    }

    // FIX v8: Role check lebih fleksibel — GK tetap ketat, posisi lain boleh fleksibel
    const playerRole = roleGroup(player.role || player.type);
    const positionRole = roleFromPosition(position);
    const STRICT_GK = playerRole === "GK" || positionRole === "GK";
    if (STRICT_GK && playerRole !== positionRole) {
      throw new Error(`GK hanya bisa di posisi GK, dan posisi GK hanya untuk GK.`);
    }

    // Jika posisi sudah terisi player lain → swap (keluarkan player lama ke bench)
    const existingPlayerId = saveData.lineup[position];
    if (existingPlayerId && String(existingPlayerId) !== playerIdStr) {
      // Cari posisi asal player yang di-move (jika ada di lineup)
      const fromPos = Object.keys(saveData.lineup || {}).find(
        (key) => String(saveData.lineup[key]) === playerIdStr
      );
      // Pindahkan player lama ke posisi asal player baru, atau hapus dari posisi lama
      if (fromPos) {
        saveData.lineup[fromPos] = existingPlayerId;
      } else {
        saveData.lineup[position] = null; // akan ditimpa di bawah
      }
    }

    // Hapus player dari posisi lain jika ada (bench → field: player tidak boleh ada di 2 posisi)
    Object.keys(saveData.lineup || {}).forEach((key) => {
      if (key !== position && String(saveData.lineup[key]) === playerIdStr) {
        saveData.lineup[key] = null;
      }
    });

    // Simpan dengan ID asli dari player object (bukan dari input) untuk konsistensi
    saveData.lineup[position] = player.id;
    save(username, saveData);
    return getFormation(username);
  }

  function autoFormation(username) {
    const saveData = requireSave(username);
    const formation = saveData.formation || "4-3-3";
    const positions = FORMATIONS[formation] || FORMATIONS["4-3-3"];
    const inventory = getInventorySplit(saveData).allItems;
    const pool = [...(saveData.players || [])]
      .map((player) => ({ ...player, __power: calcPlayerPower(player, inventory).power }))
      .sort((left, right) => right.__power - left.__power);

    saveData.lineup = {};
    positions.forEach((position) => {
      const need = roleFromPosition(position);
      const index = pool.findIndex((player) => roleGroup(player.role || player.type) === need);
      if (index >= 0) {
        saveData.lineup[position] = pool[index].id;
        pool.splice(index, 1);
      } else {
        saveData.lineup[position] = null;
      }
    });

    save(username, saveData);
    return getFormation(username);
  }

  function getInventory(username) {
    const saveData = requireSave(username);
    const split = getInventorySplit(saveData);
    // Kumpulkan semua equip ID yang sudah terpasang ke player manapun
    const equippedIds = new Set();
    (saveData.players || []).forEach((player) => {
      Object.values(player.equipment || {}).forEach((eid) => {
        if (eid) equippedIds.add(String(eid));
      });
    });
    const allEquipment = split.equipment;
    const availableEquipment = split.equipment.filter((item) => !equippedIds.has(String(item.id)));
    return {
      inventory: split.allItems,
      allEquipment,
      equipment: availableEquipment,
      consumables: split.consumables,
      equipmentCatalog: repo.getEquipment() || [],
      equipmentShop: repo.getEquipmentShop() || [],
      consumableShop: repo.getConsumables() || []
    };
  }

  function equipItem(username, playerId, equipmentId, slot) {
    const saveData = requireSave(username);
    const player = (saveData.players || []).find((entry) => String(entry.id) === String(playerId));
    const equipment = (saveData.inventory || []).find((entry) => String(entry.id) === String(equipmentId));
    if (!player || !equipment || !equipment.slot) {
      throw new Error("Data equip tidak valid.");
    }

    if (equipment.role && equipment.role !== "ALL") {
      const allowed = roleGroup(equipment.role);
      const actual = roleGroup(player.role || player.type);
      if (allowed !== actual) {
        throw new Error(`Hanya untuk ${equipment.role}`);
      }
    }

    const targetSlot = slot || equipment.slot;
    player.equipment = player.equipment || {};
    player.equipment[targetSlot] = equipment.id;
    save(username, saveData);
    return hydratePlayer(player, saveData.inventory || [], saveData.lineup || {});
  }

  function unequipItem(username, playerId, slot) {
    const saveData = requireSave(username);
    const player = (saveData.players || []).find((entry) => String(entry.id) === String(playerId));
    if (!player) {
      throw new Error("Player tidak ditemukan.");
    }
    player.equipment = player.equipment || {};
    player.equipment[slot] = null;
    save(username, saveData);
    return hydratePlayer(player, saveData.inventory || [], saveData.lineup || {});
  }

  function useConsumable(username, itemId, targetPlayerId) {
    const saveData = requireSave(username);
    const index = (saveData.inventory || []).findIndex((entry) => String(entry.id) === String(itemId));
    if (index < 0) {
      throw new Error("Item tidak ditemukan.");
    }

    const item = saveData.inventory[index];
    if (item.slot) {
      throw new Error("Item ini bukan consumable.");
    }

    // FIX: Ponaryo and other icons check by name if flags are missing
    const iconNames = ["Bambang Pamungkas", "Kurniawan Dwi Yulianto", "Bima Sakti", "Ilham Jayakusuma", "Ponaryo Astaman"];
    const isIconPlayer = item.category === "icon_player" || 
                         item.special === "icon" || 
                         item.type === "icon_player" ||
                         iconNames.includes(item.name);

    if (isIconPlayer) {
      saveData.players = Array.isArray(saveData.players) ? saveData.players : [];
      const exists = saveData.players.some(
        (p) => p && String(p.name || "").toLowerCase() === String(item.name || "").toLowerCase() && (p.special === "icon" || p.category === "icon_player")
      );
      if (exists) {
        throw new Error("Pemain ini sudah ada di squad.");
      }

      const stats = item.stats || {};
      const basePower = Number(item.basePower || item.power || 80);
      const role = item.role || "ST";
      const idSafe = String(item.name || "icon")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const newPlayer = {
        id: `icon_${idSafe}_${Date.now()}`,
        name: item.name || "Icon Player",
        nickname: item.nickname,
        rarity: item.rarity || "SS",
        special: "icon",
        category: "icon_player",
        basePower,
        role,
        type: role,
        level: 1,
        exp: 0,
        curStamina: 100,
        injury: null,
        equipment: { HEAD: null, BODY: null, HAND: null, FEET: null, ACC: null },
        trait: item.trait || "None",
        skill: item.skill || "NONE",
        pace: Number(stats.pace ?? item.pace ?? 70),
        shooting: Number(stats.shooting ?? item.shooting ?? 70),
        passing: Number(stats.passing ?? item.passing ?? 70),
        defense: Number(stats.defense ?? item.defense ?? 50),
        stamina: Number(stats.stamina ?? item.stamina ?? 70),
        mentality: Number(stats.mentality ?? item.mentality ?? 70),
        image: item.image || item.realPhoto || "https://i.imgur.com/8QfQYpL.png",
        realPhoto: item.realPhoto || null,
        iconDesc: item.iconDesc,
        club: item.club || null,
        nation: item.nation || item.nationality || null,
        ownedAt: Date.now()
      };

      saveData.players.push(newPlayer);
      saveData.inventory.splice(index, 1);
      save(username, saveData);
      return { msg: `⭐ ${newPlayer.name} bergabung ke squad!`, playerAdded: true, player: newPlayer };
    }

    const effect = item.effect || "team_power";
    const players = saveData.players || [];
    const findTarget = () => players.find((entry) => String(entry.id) === String(targetPlayerId));

    let response = { msg: `${item.name || "Item"} digunakan.` };
    if (effect === "stamina_single") {
      const target = findTarget();
      if (!target) throw new Error("Pilih pemain.");
      target.curStamina = Math.min(100, Number(target.curStamina ?? 100) + Number(item.value || 40));
      response = { msg: `⚡ Stamina ${target.name} +${item.value || 40}%`, player: target };
    } else if (effect === "stamina_all") {
      players.forEach((player) => {
        player.curStamina = Math.min(100, Number(player.curStamina ?? 100) + Number(item.value || 50));
      });
      response = { msg: `⚡ Stamina tim +${item.value || 50}%` };
    } else if (effect === "heal_injury") {
      const target = findTarget();
      if (!target) throw new Error("Pilih pemain.");
      if (!target.injury) throw new Error(`${target.name} tidak cedera`);
      if (Number(item.value || 0) >= 999) {
        target.injury = null;
      } else {
        target.injury.matchesLeft = Math.max(0, Number(target.injury.matchesLeft || 0) - Number(item.value || 1));
        if (target.injury.matchesLeft <= 0) target.injury = null;
      }
      response = { msg: `🏥 ${target.name} ${target.injury ? "membaik" : "sembuh"}!`, player: target };
    } else if (effect === "exp_single") {
      const target = findTarget();
      if (!target) throw new Error("Pilih pemain.");
      target.exp = Number(target.exp || 0) + Number(item.value || 50);
      response = { msg: `📚 EXP +${item.value || 50}`, player: target, levelUpEvents: tryLevelUp(target) };
    } else if (effect === "exp_all") {
      const levelUpEvents = [];
      players.forEach((player) => {
        player.exp = Number(player.exp || 0) + Number(item.value || 80);
        levelUpEvents.push(...tryLevelUp(player));
      });
      response = { msg: `🏟️ EXP semua +${item.value || 80}`, levelUpEvents };
    } else if (effect === "repair") {
      const repairTarget = (saveData.inventory || []).find(
        (entry) => entry.slot && Number(entry.hp ?? 100) < 100
      );
      if (repairTarget) {
        repairTarget.maxHp = Number(repairTarget.maxHp ?? 100);
        repairTarget.hp = Math.min(repairTarget.maxHp, Number(repairTarget.hp ?? 0) + Number(item.value || 20));
        response = { msg: `🔧 ${repairTarget.name || "Equipment"} HP +${item.value || 20}`, equipment: repairTarget };
      } else {
        response = { msg: "🔧 Tidak ada equipment yang perlu diperbaiki" };
      }
      if (item.extraEffect === "upgrade_protect") {
        saveData.upgradeProtect = true;
        response.msg += " + upgrade berikutnya terlindungi!";
      }
    } else if (effect === "youth_scout") {
      // Logic for youth scout: create a new random youth player
      const roles = ["GK", "LB", "CB", "RB", "CM", "LW", "RW", "ST"];
      const role = roles[Math.floor(Math.random() * roles.length)];
      const types = { GK: "GK", LB: "DEF", CB: "DEF", RB: "DEF", CM: "MID", LW: "ATT", RW: "ATT", ST: "ATT" };
      const rarityRoll = Math.random();
      let rarity = "C";
      if (rarityRoll > 0.95) rarity = "S";
      else if (rarityRoll > 0.8) rarity = "A";
      else if (rarityRoll > 0.5) rarity = "B";

      const basePower = 40 + Math.floor(Math.random() * 20);
      const newYouth = {
        id: `youth_${Date.now()}`,
        name: `Youth Player ${Math.floor(Math.random() * 999)}`,
        role,
        type: types[role],
        level: 1,
        exp: 0,
        rarity,
        basePower,
        curStamina: 100,
        special: "youth",
        ownedAt: Date.now(),
        equipment: { HEAD: null, BODY: null, HAND: null, FEET: null, ACC: null }
      };
      saveData.players = saveData.players || [];
      saveData.players.push(newYouth);
      response = { msg: `🔭 ${newYouth.name} (${newYouth.role}) dari Youth Academy bergabung!`, player: newYouth };
    } else if (effect === "upgrade_protect") {
      saveData.upgradeProtect = true;
      response = { msg: "🛡️ Upgrade equipment berikutnya terlindungi dari kehancuran!" };
    } else if (effect === "upgrade_boost") {
      saveData.upgradeBoost = (saveData.upgradeBoost || 0) + (item.value || 1);
      response = { msg: `💎 Peluang upgrade berikutnya meningkat! (+${item.value || 1})` };
    } else if (effect === "enchant") {
      // Find equipment to enchant
      const target = (saveData.inventory || []).find(
        (entry) => entry.slot && !entry.enchant
      );
      if (target) {
        target.enchant = {
          type: item.enchantType,
          value: Number(item.value || 0)
        };
        // Efek Durable: Tambah max HP & HP saat ini
        if (item.enchantType === "durable") {
          target.maxHp = (target.maxHp || 100) + Number(item.value || 50);
          target.hp = (target.hp || 100) + Number(item.value || 50);
        }
        response = { msg: `✨ ${target.name} mendapat enchant ${item.enchantType.toUpperCase()}!`, equipment: target };
      } else {
        response = { msg: "✨ Tidak ada equipment yang bisa di-enchant (atau sudah punya enchant)" };
      }
    } else {
        const duration = Number(item.duration || item.value || 1);
        saveData.activeBuff = {
          type: effect,
          value: Number(item.value || 10),
          duration,
          name: item.name || "Buff"
        };
        response = { msg: `🔥 ${item.name || "Buff"} aktif!`, buff: saveData.activeBuff };
      }

    saveData.inventory.splice(index, 1);
    save(username, saveData);
    return response;
  }

  function recoverPlayer(username, { playerId, type }) {
    const saveData = requireSave(username);
    const inventory = saveData.inventory || [];

    function takeConsumableByEffect(effect) {
      const candidates = inventory
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item && item.type === "consumable" && item.effect === effect);
      if (!candidates.length) return null;
      candidates.sort((a, b) => Number(b.item.value || 0) - Number(a.item.value || 0));
      const chosen = candidates[0];
      inventory.splice(chosen.index, 1);
      saveData.inventory = inventory;
      return chosen.item;
    }

    if (type === "all") {
      const usedItem = takeConsumableByEffect("stamina_all");
      if (!usedItem) {
        throw new Error("Butuh item stamina tim (Team Energy Pack).");
      }
      (saveData.players || []).forEach((player) => {
        const inc = Number(usedItem.value || 0);
        const next = Number(player.curStamina ?? 100) + inc;
        player.curStamina = Math.max(0, Math.min(100, next));
      });
      save(username, saveData);
      return { coin: saveData.coin, type, usedItem };
    }

    const player = (saveData.players || []).find((entry) => String(entry.id) === String(playerId));
    if (!player) {
      throw new Error("Pemain tidak ditemukan.");
    }

    if (type === "stamina") {
      const usedItem = takeConsumableByEffect("stamina_single");
      if (!usedItem) {
        throw new Error("Butuh item stamina (Energy Drink / Recovery Gel).");
      }
      const inc = Number(usedItem.value || 0);
      const next = Number(player.curStamina ?? 100) + inc;
      player.curStamina = Math.max(0, Math.min(100, next));
      save(username, saveData);
      return {
        coin: saveData.coin,
        type,
        usedItem,
        player: hydratePlayer(player, saveData.inventory || [], saveData.lineup || {})
      };
    } else if (type === "injury") {
      if (!player.injury) {
        throw new Error("Tidak cedera");
      }
      const usedItem = takeConsumableByEffect("heal_injury");
      if (!usedItem) {
        throw new Error("Butuh item cedera (Medical Treatment).");
      }
      player.injury = null;
      save(username, saveData);
      return {
        coin: saveData.coin,
        type,
        usedItem,
        player: hydratePlayer(player, saveData.inventory || [], saveData.lineup || {})
      };
    } else {
      throw new Error("Tipe recover tidak valid.");
    }
  }

  return {
    FORMATIONS,
    roleGroup,
    roleFromPosition,
    calcPlayerPower,
    calcChemistry,
    getTeam,
    getFormation,
    changeFormation,
    setFormationPlayer,
    autoFormation,
    getInventory,
    equipItem,
    unequipItem,
    useConsumable,
    recoverPlayer
  };
}

module.exports = {
  createTeamService
};
