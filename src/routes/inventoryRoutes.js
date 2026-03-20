const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createInventoryRouter({ authService, teamService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/inventory", guard, (req, res) => {
    try {
      return ok(res, teamService.getInventory(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/equip", guard, (req, res) => {
    try {
      const player = teamService.equipItem(req.user.username, req.body?.playerId, req.body?.equipmentId, req.body?.slot);
      return ok(res, { player });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/unequip", guard, (req, res) => {
    try {
      const player = teamService.unequipItem(req.user.username, req.body?.playerId, req.body?.slot);
      return ok(res, { player });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/use-consumable", guard, (req, res) => {
    try {
      const result = teamService.useConsumable(req.user.username, req.body?.id, req.body?.targetPlayerId);
      return ok(res, result);
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/player/recover", guard, (req, res) => {
    try {
      const result = teamService.recoverPlayer(req.user.username, {
        playerId: req.body?.playerId,
        type: req.body?.type
      });
      return ok(res, result);
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createInventoryRouter
};
