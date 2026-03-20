const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createShopRouter({ authService, shopService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/shop", (req, res) => res.json(shopService.getConsumableShop()));
  router.get("/shop/equipment", (req, res) => res.json(shopService.getEquipmentShop()));
  router.get("/shop/consumable", (req, res) => res.json(shopService.getConsumableShop()));

  router.post("/buy", guard, (req, res) => {
    try {
      return ok(res, shopService.buyItem(req.user.username, req.body?.id));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/sell-player", guard, (req, res) => {
    try {
      return ok(res, shopService.sellPlayer(req.user.username, req.body?.playerId));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/upgrade", guard, (req, res) => {
    try {
      return ok(res, shopService.upgradeEquipment(req.user.username, req.body?.equipId, req.body?.useProtect));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/repair", guard, (req, res) => {
    try {
      return ok(res, shopService.repairEquipment(req.user.username, req.body?.equipId, req.body?.repairItemId));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createShopRouter
};
