/**
 * Football Saga 2 — Entry Point
 * Migrasi dari server.js (monolith) ke src/app.js (modular)
 */
try {
  require("dotenv").config();
} catch (e) {
  // dotenv not found, skipping
}
const { createApp } = require("./src/app");
const { PORT } = require("./src/config/paths");

const app = createApp();

app.listen(PORT, () => {
  console.log(`⚽ Football Saga 2 — running at http://localhost:${PORT}`);
  console.log(`   Mode: modular (src/app.js)`);
  console.log(`   Data: ./data/`);
  console.log(`   Saves: ./data/saves/`);
});
