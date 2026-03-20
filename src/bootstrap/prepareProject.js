const fs = require("fs");
const path = require("path");
const { DATA_DIR, PUBLIC_DIR, SAVES_DIR, DATA_FILES, dataPath, legacyRootPath, ROOT_DIR } = require("../config/paths");
const { ensureDir, readJson, writeJson } = require("../utils/fileStore");

const FALLBACK_DEFAULTS = {
  [DATA_FILES.users]: [],
  [DATA_FILES.equipment]: [],
  [DATA_FILES.equipmentShop]: [],
  [DATA_FILES.consumables]: [],
  [DATA_FILES.players]: [],
  [DATA_FILES.saveTemplate]: { coin: 500, premiumCoin: 10, stage: 1, formation: "4-3-3", lineup: {}, inventory: [], players: [], winCount: 0, drawCount: 0, loseCount: 0 },
  [DATA_FILES.demoSave]: {}
};

function copyIfMissing(sourcePath, targetPath, fallbackValue) {
  if (fs.existsSync(targetPath)) return;

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    return;
  }

  writeJson(targetPath, fallbackValue);
}

function ensurePublicIndex() {
  const target = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(target)) return;

  const legacyIndex = path.join(ROOT_DIR, "index.html");
  if (fs.existsSync(legacyIndex)) {
    fs.copyFileSync(legacyIndex, target);
    return;
  }

  fs.writeFileSync(
    target,
    `<!doctype html><html><head><meta charset="utf-8"><title>Football Saga 2</title></head><body><h1>Football Saga 2</h1><p>Public index belum dipindahkan.</p></body></html>`,
    "utf8"
  );
}

function ensurePublicAsset(fileName) {
  const target = path.join(PUBLIC_DIR, fileName);
  if (fs.existsSync(target)) return;

  const legacy = path.join(ROOT_DIR, fileName);
  if (fs.existsSync(legacy)) {
    fs.copyFileSync(legacy, target);
  }
}


function migrateLegacySaves() {
  if (!fs.existsSync(DATA_DIR)) return;
  const skipFiles = new Set(Object.values(DATA_FILES));
  try {
    fs.readdirSync(DATA_DIR).forEach((fileName) => {
      if (!fileName.endsWith(".json")) return;
      if (skipFiles.has(fileName)) return;
      const sourcePath = path.join(DATA_DIR, fileName);
      const targetPath = path.join(SAVES_DIR, fileName);
      if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log("[migrate] Save file moved:", fileName, "-> data/saves/");
      }
    });
  } catch (err) {
    console.warn("[migrate] Could not migrate saves:", err.message);
  }
}
function prepareProject() {
  ensureDir(DATA_DIR);
  ensureDir(PUBLIC_DIR);
  ensureDir(SAVES_DIR);

  Object.values(DATA_FILES).forEach((fileName) => {
    copyIfMissing(legacyRootPath(fileName), dataPath(fileName), FALLBACK_DEFAULTS[fileName]);
  });

  migrateLegacySaves();
  ensurePublicIndex();
  ensurePublicAsset("main.js");
  ensurePublicAsset("style.css");

  return {
    dataFiles: Object.values(DATA_FILES).map((fileName) => ({
      fileName,
      exists: fs.existsSync(dataPath(fileName)),
      previewType: Array.isArray(readJson(dataPath(fileName), null)) ? "array" : typeof readJson(dataPath(fileName), null)
    })),
    savesDirReady: fs.existsSync(SAVES_DIR),
    publicReady: fs.existsSync(path.join(PUBLIC_DIR, "index.html"))
  };
}

module.exports = { prepareProject };
