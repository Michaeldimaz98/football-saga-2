const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createStatusRouter({ authService, userSaveService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/status", guard, (req, res) => {
    const status = userSaveService.buildStatus(req.user.username);
    if (!status) {
      return fail(res, 404, "Save user tidak ditemukan.");
    }
    return ok(res, status);
  });

  return router;
}

module.exports = {
  createStatusRouter
};
