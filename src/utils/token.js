'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = '7d'; // token expiry

/**
 * Generate a signed JWT (API token) for an authenticated user.
 * @param {string} tracker  - User tracker ID stored in the collection
 * @param {object} extra    - Extra claims (e.g. { accountType: 'admin' })
 */
function generateAPIToken(tracker, extra = {}) {
  return jwt.sign({ token: tracker, ...extra }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * Decode and verify an API token.
 * Returns the decoded payload, or the string "expired" if the token has expired,
 * or null if invalid.
 */
function decodeAPIToken(tokenString) {
  try {
    return jwt.verify(tokenString, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') return 'expired';
    return null;
  }
}

module.exports = { generateAPIToken, decodeAPIToken };
