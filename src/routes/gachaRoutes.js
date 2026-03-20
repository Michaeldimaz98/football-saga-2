const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createGachaRouter({ authService, gachaService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/gacha/events", (req, res) => ok(res, gachaService.getEvents()));

  router.get("/gacha", guard, (req, res) => {
    try {
      return ok(res, gachaService.spin(req.user.username, req.query?.event || "standard"));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/gacha/batch", guard, (req, res) => {
    try {
      return ok(res, gachaService.spinBatch(req.user.username, req.body?.event || "standard", req.body?.times || 10));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createGachaRouter
};
