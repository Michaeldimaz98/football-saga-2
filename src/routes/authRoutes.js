const express = require("express");
const { ok, fail } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

function createAuthRouter({ authService, userSaveService }) {
  const router = express.Router();

  function sendAuthSuccess(res, user) {
    const { token, cookie } = authService.issueAuthCookie(user.username);
    res.setHeader("Set-Cookie", cookie);
    userSaveService.ensureUserSave(user);
    // BUG 1 FIX: merge buildStatus so frontend gets hasCharacter, needSeasonPos, myClub, etc.
    const status = userSaveService.buildStatus(user.username) || {};
    return ok(res, {
      user,
      token,
      username: user.username,
      displayName: user.displayName || user.username,
      hasCharacter: status.hasCharacter || false,
      needSeasonPos: status.needSeasonPos || false,
      myClub: status.myClub || null,
      character: status.character || null,
      seasonPos: status.seasonPos || null,
    });
  }

  async function registerHandler(req, res) {
    try {
      const user = await authService.register(req.body || {});
      return sendAuthSuccess(res, user);
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  async function loginHandler(req, res) {
    try {
      const user = await authService.login(req.body || {});
      userSaveService.ensureUserSave(user);
      return sendAuthSuccess(res, user);
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  function logoutHandler(req, res) {
    res.setHeader("Set-Cookie", authService.clearAuthCookie());
    return ok(res, { message: "Logout berhasil." });
  }

  router.post("/register", registerHandler);
  router.post("/auth/register", registerHandler);
  router.post("/login", loginHandler);
  router.post("/auth/login", loginHandler);
  router.post("/logout", logoutHandler);
  router.post("/auth/logout", logoutHandler);
  router.get("/auth/me", requireAuth(authService), (req, res) => {
    const user = authService.sanitizeUser(req.user);
    const status = userSaveService.buildStatus(req.user.username) || {};
    return ok(res, {
      user,
      username: user?.username,
      displayName: user?.displayName || user?.username,
      hasCharacter: status.hasCharacter || false,
      needSeasonPos: status.needSeasonPos || false,
      myClub: status.myClub || null,
      character: status.character || null,
      seasonPos: status.seasonPos || null,
    });
  });

  return router;
}

module.exports = {
  createAuthRouter
};
