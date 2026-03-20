const crypto = require("crypto");
const { promisify } = require("util");
const { AUTH_COOKIE_NAME, AUTH_SECRET } = require("../config/paths");
const { parseCookies, buildCookie } = require("../utils/cookies");
const { normalizeUsername } = require("../repositories/dataRepository");

const pbkdf2 = promisify(crypto.pbkdf2);

async function hashPassword(password, salt) {
  const hash = await pbkdf2(password, salt, 120000, 64, "sha512");
  return hash.toString("hex");
}

async function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await hashPassword(password, salt);
  return {
    salt,
    hash
  };
}

async function verifyPassword(password, passwordRecord = {}) {
  if (!passwordRecord.hash || !passwordRecord.salt) return false;
  // Support legacy SHA256 dari server.js lama
  if (passwordRecord.salt === 'legacy_sha256') {
    const legacyHash = crypto.createHash('sha256')
      .update(String(password) + 'fs2_salt_2025').digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(legacyHash), Buffer.from(passwordRecord.hash));
    } catch { return false; }
  }
  try {
    const computed = await hashPassword(password, passwordRecord.salt);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(passwordRecord.hash));
  } catch { return false; }
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
}

function createAuthToken(username) {
  const payload = JSON.stringify({
    username: normalizeUsername(username),
    iat: Date.now()
  });
  const encoded = base64UrlEncode(payload);
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 hari

function verifyAuthToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  const expected = signPayload(encoded);
  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    if (!payload.username) return null;
    if (payload.iat && Date.now() - payload.iat > TOKEN_MAX_AGE) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null
  };
}

function createAuthService({ repo, saveRepo }) {
  async function register({ username, password, displayName }) {
    const normalized = normalizeUsername(username);
    if (!normalized || normalized.length < 3 || normalized.length > 20) {
      throw new Error("Username harus 3-20 karakter.");
    }
    if (!password || String(password).length < 6) {
      throw new Error("Password minimal 6 karakter.");
    }
    if (repo.findUserByUsername(normalized)) {
      throw new Error("Username sudah dipakai.");
    }

    const passwordRecord = await createPasswordRecord(String(password));
    const newUser = repo.createUser({
      username: normalized,
      displayName: String(displayName || normalized).trim() || normalized,
      password: passwordRecord,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });

    return sanitizeUser(newUser);
  }

  async function login({ username, password }) {
    const normalized = normalizeUsername(username);
    const user = repo.findUserByUsername(normalized);
    if (!user || !(await verifyPassword(String(password || ""), user.password))) {
      throw new Error("Username atau password salah.");
    }

    const updated = repo.updateUser(normalized, (current) => ({
      ...current,
      lastLoginAt: new Date().toISOString()
    }));

    return sanitizeUser(updated || user);
  }

  function ensureSaveExists(username, builder) {
    if (!saveRepo.exists(username)) {
      saveRepo.save(username, builder(username));
    }
    return saveRepo.get(username, {});
  }

  function issueAuthCookie(username) {
    const token = createAuthToken(username);
    return {
      token,
      cookie: buildCookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
      })
    };
  }

  function clearAuthCookie() {
    return buildCookie(AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 0
    });
  }

  function getRequestUser(req) {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const cookies = parseCookies(req.headers.cookie || "");
    const cookieToken = cookies[AUTH_COOKIE_NAME] || null;
    const payload = verifyAuthToken(bearer || cookieToken);
    if (!payload?.username) return null;
    return repo.findUserByUsername(payload.username);
  }

  return {
    register,
    login,
    ensureSaveExists,
    issueAuthCookie,
    clearAuthCookie,
    getRequestUser,
    sanitizeUser
  };
}

module.exports = {
  createAuthService
};
