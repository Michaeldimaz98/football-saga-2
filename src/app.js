const express = require("express");
const path = require("path");
const { PUBLIC_DIR } = require("./config/paths");
const { prepareProject } = require("./bootstrap/prepareProject");
const { ok, fail } = require("./utils/http");
const { createDataRepository } = require("./repositories/dataRepository");
const { createUserSaveRepository } = require("./repositories/userSaveRepository");
const { createAuthService } = require("./services/authService");
const { createUserSaveService } = require("./services/userSaveService");
const { createTeamService } = require("./services/teamService");
const { createShopService } = require("./services/shopService");
const { createGachaService } = require("./services/gachaService");
const { createTransferService } = require("./services/transferService");
const { createMatchService } = require("./services/matchService");
const { createIntegrationService } = require("./services/integrationService");
const { createAuthRouter } = require("./routes/authRoutes");
const { createProfileRouter } = require("./routes/profileRoutes");
const { createStatusRouter } = require("./routes/statusRoutes");
const { createTeamRouter } = require("./routes/teamRoutes");
const { createFormationRouter } = require("./routes/formationRoutes");
const { createInventoryRouter } = require("./routes/inventoryRoutes");
const { createShopRouter } = require("./routes/shopRoutes");
const { createGachaRouter } = require("./routes/gachaRoutes");
const { createTransferRouter } = require("./routes/transferRoutes");
const { createBootstrapRouter } = require("./routes/bootstrapRoutes");
const { createLegacyRouter } = require("./routes/legacyRoutes");
const { createCharacterRouter } = require("./routes/characterRoutes");
const { createAdapterRouter } = require("./routes/adapterRoutes");
const { createFeaturesRouter } = require("./routes/featuresRoutes");

function createApp() {
  prepareProject();

  const app = express();
  const repo = createDataRepository();
  const saveRepo = createUserSaveRepository();
  const authService = createAuthService({ repo, saveRepo });
  const userSaveService = createUserSaveService({ repo, saveRepo });
  const teamService = createTeamService({ repo, userSaveService });
  const shopService = createShopService({ repo, userSaveService, teamService });
  const gachaService = createGachaService({ repo, userSaveService });
  const transferService = createTransferService({ repo, userSaveService });
  const matchService = createMatchService({ repo, userSaveService, teamService, transferService });
  const integrationService = createIntegrationService({
    repo,
    userSaveService,
    teamService,
    shopService,
    gachaService,
    transferService,
    matchService
  });

  app.locals.repo = repo;
  app.locals.saveRepo = saveRepo;
  app.locals.authService = authService;
  app.locals.userSaveService = userSaveService;
  app.locals.teamService = teamService;
  app.locals.shopService = shopService;
  app.locals.gachaService = gachaService;
  app.locals.transferService = transferService;
  app.locals.matchService = matchService;
  app.locals.integrationService = integrationService;

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(PUBLIC_DIR));

  app.get("/health", (req, res) => {
    return ok(res, {
      name: "Football Saga 2",
      mode: "modular-batch-5-final-integration",
      publicDir: path.basename(PUBLIC_DIR),
      dataReady: repo.isReady(),
      savesReady: saveRepo.isReady()
    });
  });

  app.get("/meta/project", (req, res) => {
    return ok(res, {
      folders: {
        data: repo.describe(),
        saves: saveRepo.describe()
      },
      routes: [
        "POST /register",
        "POST /login",
        "POST /logout",
        "GET /auth/me",
        "GET /profile",
        "POST /profile/character",
        "GET /status",
        "GET /team",
        "GET /players",
        "GET /formation",
        "POST /formation/change",
        "POST /formation/set",
        "POST /formation/auto",
        "GET /inventory",
        "POST /equip",
        "POST /unequip",
        "POST /use-consumable",
        "POST /player/recover",
        "GET /shop",
        "GET /shop/equipment",
        "GET /shop/consumable",
        "POST /buy",
        "POST /sell-player",
        "POST /upgrade",
        "POST /repair",
        "GET /gacha/events",
        "GET /gacha",
        "POST /gacha/batch",
        "GET /transfer/market",
        "POST /transfer/buy",
        "GET /bootstrap/game",
        "POST /save/normalize",
        "GET /api/status",
        "GET /api/team",
        "GET /api/formation",
        "GET /api/inventory",
        "GET /api/shop",
        "GET /api/shop/equipment",
        "GET /api/shop/consumable",
        "GET /api/transfer/market",
      ]
    });
  });

  // Adapter router HARUS didaftarkan PERTAMA karena override /team, /formation, /match, dll
  app.use(createAdapterRouter({
    authService,
    userSaveService,
    teamService,
    matchService,
    transferService
  }));

  // Features router — fitur-fitur baru
  app.use(createFeaturesRouter({ authService, userSaveService }));

  app.use(createAuthRouter({ authService, userSaveService }));
  app.use(createProfileRouter({ authService, userSaveService }));
  app.use(createStatusRouter({ authService, userSaveService }));
  app.use(createTeamRouter({ authService, teamService }));
  app.use(createFormationRouter({ authService, teamService }));
  app.use(createInventoryRouter({ authService, teamService }));
  app.use(createShopRouter({ authService, shopService }));
  app.use(createGachaRouter({ authService, gachaService }));
  app.use(createTransferRouter({ authService, transferService }));
  app.use(createBootstrapRouter({ authService, integrationService }));
  app.use(createCharacterRouter({ authService, userSaveService }));
  app.use(createLegacyRouter({
    authService,
    userSaveService,
    teamService,
    shopService,
    transferService,
    matchService,
    integrationService
  }));

  app.use((req, res) => {
    return fail(res, 404, "Endpoint belum tersedia di batch ini.");
  });

  app.use((err, req, res, next) => {
    console.error(err);
    return fail(res, err.statusCode || 500, err.message || "Internal server error");
  });

  return app;
}

module.exports = { createApp };
