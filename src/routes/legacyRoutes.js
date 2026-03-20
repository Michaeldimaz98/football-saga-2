const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createLegacyRouter({ authService, userSaveService, teamService, shopService, transferService, matchService, integrationService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/api/status", guard, (req, res) => {
    try {
      const save = userSaveService.getUserSave(req.user.username);
      return ok(res, {
        coin: Number(save?.coin || 0),
        premiumCoin: Number(save?.premiumCoin || 0),
        stage: Number(save?.stage || 1),
        winCount: Number(save?.winCount || 0),
        drawCount: Number(save?.drawCount || 0),
        loseCount: Number(save?.loseCount || 0)
      });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.get("/api/team", guard, (req, res) => {
    try {
      return ok(res, teamService.getTeam(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.get("/api/formation", guard, (req, res) => {
    try {
      return ok(res, teamService.getFormation(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.get("/api/inventory", guard, (req, res) => {
    try {
      return ok(res, teamService.getInventory(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.get("/api/shop", (req, res) => res.json(shopService.getConsumableShop()));
  router.get("/api/shop/equipment", (req, res) => res.json(shopService.getEquipmentShop()));
  router.get("/api/shop/consumable", (req, res) => res.json(shopService.getConsumableShop()));

  router.get("/api/transfer/market", guard, (req, res) => {
    try {
      return ok(res, transferService.getMarket(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.get("/api/bootstrap/game", guard, (req, res) => {
    try {
      return ok(res, integrationService.getBootstrap(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createLegacyRouter
};
