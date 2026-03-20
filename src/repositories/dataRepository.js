const fs = require("fs");
const { DATA_DIR, PUBLIC_DIR, DATA_FILES, dataPath } = require("../config/paths");
const { readJson, writeJson } = require("../utils/fileStore");

function normalizeUsername(value = "") {
  return String(value).trim().toLowerCase();
}

function createDataRepository() {
  const cache = new Map();

  function get(fileKey, fallback = null) {
    if (cache.has(fileKey)) return cache.get(fileKey);

    const fileName = DATA_FILES[fileKey];
    if (!fileName) return fallback;
    const data = readJson(dataPath(fileName), fallback);
    cache.set(fileKey, data);
    return data;
  }

  function save(fileKey, payload) {
    const fileName = DATA_FILES[fileKey];
    if (!fileName) {
      throw new Error(`Unknown data key: ${fileKey}`);
    }
    cache.set(fileKey, payload);
    writeJson(dataPath(fileName), payload);
    return payload;
  }

  function isReady() {
    return Object.values(DATA_FILES).every((fileName) => fs.existsSync(dataPath(fileName)));
  }

  function describe() {
    return {
      dataDir: DATA_DIR,
      publicDir: PUBLIC_DIR,
      files: Object.entries(DATA_FILES).map(([key, fileName]) => ({
        key,
        fileName,
        exists: fs.existsSync(dataPath(fileName))
      }))
    };
  }

  function getUsers() {
    const raw = get("users", []);
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") {
      return Object.entries(raw).map(([username, data]) => ({
        ...data,
        username,
        password: typeof data.password === "string"
          ? { hash: data.password, salt: "legacy_sha256" }
          : (data.password || {})
      }));
    }
    return [];
  }

  function saveUsers(users) {
    return save("users", users);
  }

  function findUserByUsername(username) {
    const key = normalizeUsername(username);
    return getUsers().find((user) => normalizeUsername(user.username) === key) || null;
  }

  function createUser(userPayload) {
    const users = getUsers();
    users.push(userPayload);
    saveUsers(users);
    return userPayload;
  }

  function updateUser(username, updater) {
    const key = normalizeUsername(username);
    const users = getUsers();
    const index = users.findIndex((user) => normalizeUsername(user.username) === key);
    if (index === -1) return null;
    const current = users[index];
    const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
    users[index] = next;
    saveUsers(users);
    return next;
  }

  function getPlayers() {
    return get("players", []);
  }

  function getEquipment() {
    return get("equipment", []);
  }

  function getEquipmentShop() {
    return get("equipmentShop", []);
  }

  function getConsumables() {
    return get("consumables", []);
  }

  function getSaveTemplate() {
    return get("saveTemplate", {});
  }

  function getDemoSave() {
    return get("demoSave", {});
  }

  return {
    get,
    save,
    isReady,
    describe,
    getUsers,
    saveUsers,
    findUserByUsername,
    createUser,
    updateUser,
    getPlayers,
    getEquipment,
    getEquipmentShop,
    getConsumables,
    getSaveTemplate,
    getDemoSave,
    normalizeUsername
  };
}

module.exports = {
  createDataRepository,
  normalizeUsername
};
