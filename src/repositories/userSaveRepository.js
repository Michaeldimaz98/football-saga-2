const fs = require("fs");
const path = require("path");
const { SAVES_DIR } = require("../config/paths");
const { ensureDir, readJson, writeJson } = require("../utils/fileStore");
const { normalizeUsername } = require("./dataRepository");

function safeFileName(username) {
  return `${normalizeUsername(username).replace(/[^a-z0-9_-]/g, "_") || "user"}.json`;
}

function createUserSaveRepository() {
  ensureDir(SAVES_DIR);
  const cache = new Map();

  function getPath(username) {
    return path.join(SAVES_DIR, safeFileName(username));
  }

  function isReady() {
    return fs.existsSync(SAVES_DIR);
  }

  function describe() {
    return {
      savesDir: SAVES_DIR,
      fileCount: fs.readdirSync(SAVES_DIR).filter((name) => name.endsWith(".json")).length
    };
  }

  function exists(username) {
    const key = normalizeUsername(username);
    if (cache.has(key)) return true;
    return fs.existsSync(getPath(username));
  }

  function get(username, fallback = null) {
    const key = normalizeUsername(username);
    if (cache.has(key)) return cache.get(key);

    const data = readJson(getPath(username), fallback);
    if (data) cache.set(key, data);
    return data;
  }

  function save(username, payload) {
    const key = normalizeUsername(username);
    cache.set(key, payload);
    writeJson(getPath(username), payload);
    return payload;
  }

  return {
    isReady,
    describe,
    exists,
    get,
    save,
    getPath
  };
}

module.exports = {
  createUserSaveRepository
};
