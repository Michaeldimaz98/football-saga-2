const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createTeamRouter({ authService, teamService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/team", guard, (req, res) => {
    try {
      return ok(res, teamService.getTeam(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.get("/players", guard, (req, res) => {
    try {
      const team = teamService.getTeam(req.user.username);
      return ok(res, { team: team.players, starters: team.starters, bench: team.bench });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createTeamRouter
};
