const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const SAVES_DIR = path.join(DATA_DIR, "saves");
const LEGACY_ROOT_DIR = ROOT_DIR;
const PORT = Number(process.env.PORT || 3000);
const AUTH_COOKIE_NAME = "fs2_token";
const AUTH_SECRET = process.env.AUTH_SECRET || "football-saga-2-dev-secret";

const DATA_FILES = {
  users: "users.json",
  equipment: "equipment.json",
  equipmentShop: "equipment_shop.json",
  consumables: "shop.json",
  players: "players.json",
  saveTemplate: "save_template.json",
  demoSave: "michaeldimaz.json"
};

function dataPath(name) {
  return path.join(DATA_DIR, name);
}

function legacyRootPath(name) {
  return path.join(LEGACY_ROOT_DIR, name);
}

module.exports = {
  ROOT_DIR,
  SRC_DIR,
  PUBLIC_DIR,
  DATA_DIR,
  SAVES_DIR,
  LEGACY_ROOT_DIR,
  PORT,
  AUTH_COOKIE_NAME,
  AUTH_SECRET,
  DATA_FILES,
  dataPath,
  legacyRootPath
};
