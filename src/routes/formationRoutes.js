const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createFormationRouter({ authService, teamService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/formation", guard, (req, res) => {
    try {
      return ok(res, teamService.getFormation(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/formation/change", guard, (req, res) => {
    try {
      const result = teamService.changeFormation(req.user.username, req.body?.formation);
      return ok(res, result);
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/formation/set", guard, (req, res) => {
    try {
      const result = teamService.setFormationPlayer(req.user.username, req.body?.position, req.body?.playerId);
      return ok(res, result);
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/formation/auto", guard, (req, res) => {
    try {
      const result = teamService.autoFormation(req.user.username);
      return ok(res, result);
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createFormationRouter
};
