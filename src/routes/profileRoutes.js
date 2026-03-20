const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createProfileRouter({ authService, userSaveService }) {
  const router = express.Router();
  const guard = requireAuth(authService);

  router.get("/profile", guard, (req, res) => {
    const save = userSaveService.ensureUserSave(req.user);
    return ok(res, {
      account: authService.sanitizeUser(req.user),
      character: save.character || null,
      formation: save.formation || "4-3-3",
      playersCount: Array.isArray(save.players) ? save.players.length : 0
    });
  });

  router.post("/profile/character", guard, (req, res) => {
    const { name, age, nationality, position } = req.body || {};
    if (!String(name || "").trim()) {
      return fail(res, 400, "Nama karakter wajib diisi.");
    }
    const next = userSaveService.setCharacter(req.user.username, {
      name,
      age,
      nationality,
      position
    });
    return ok(res, {
      character: next.character,
      profile: next.profile
    });
  });

  return router;
}

module.exports = {
  createProfileRouter
};
