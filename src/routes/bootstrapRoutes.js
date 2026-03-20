const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createBootstrapRouter({ authService, integrationService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/bootstrap/game", guard, (req, res) => {
    try {
      return ok(res, integrationService.getBootstrap(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  router.post("/save/normalize", guard, (req, res) => {
    try {
      return ok(res, integrationService.normalizeSave(req.user.username));
    } catch (error) {
      return fail(res, 400, error.message);
    }
  });

  return router;
}

module.exports = {
  createBootstrapRouter
};
