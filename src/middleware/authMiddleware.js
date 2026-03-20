const { fail } = require("../utils/http");

function requireAuth(authService) {
  return function authMiddleware(req, res, next) {
    const user = authService.getRequestUser(req);
    if (!user) {
      return fail(res, 401, "Unauthorized");
    }
    req.user = user;
    next();
  };
}

module.exports = {
  requireAuth
};
