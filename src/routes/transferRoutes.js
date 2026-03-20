const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createTransferRouter({ authService, transferService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/transfer/market", guard, (req, res) => {
    try {
      return ok(res, transferService.getMarket(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/transfer/buy", guard, (req, res) => {
    try {
      return ok(res, transferService.buyPlayer(req.user.username, req.body?.marketId));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createTransferRouter
};
