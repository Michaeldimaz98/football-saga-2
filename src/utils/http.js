/**
 * utils/http.js
 * Helper functions for consistent JSON responses.
 */

function ok(res, data = {}) {
  return res.status(200).json(data);
}

function fail(res, status = 400, message = "Terjadi kesalahan.") {
  return res.status(status).json({ error: message });
}

function created(res, data = {}) {
  return res.status(201).json(data);
}

function noContent(res) {
  return res.status(204).send();
}

module.exports = { ok, fail, created, noContent };
