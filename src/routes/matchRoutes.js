const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createMatchRouter({ authService, matchService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.post("/match/play", guard, (req, res) => {
    try {
      return ok(res, matchService.playMatch(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.get("/match/status", guard, (req, res) => {
    try {
      return ok(res, matchService.getMatchStatus(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.get("/league", guard, (req, res) => {
    try {
      return ok(res, matchService.getLeague(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createMatchRouter
};
