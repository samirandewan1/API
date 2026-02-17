'use strict';

const { decodeAPIToken } = require('../utils/token');

/**
 * Generic admin auth middleware.
 * Validates the Bearer / key token and attaches decoded payload to req.adminUser.
 *
 * @param {object}  options
 * @param {boolean} options.requireAdminAccountType - if true, enforces accountType === 'admin'
 */
function adminAuth({ requireAdminAccountType = false } = {}) {
  return (req, res, next) => {
    const body = req.body?.data || req.body;
    const key  = body?.key;

    if (!key) {
      return res.status(401).json({ status: 'failure', ec: 'SCB1' });
    }

    const decoded = decodeAPIToken(key);

    if (decoded === 'expired') {
      return res.status(401).json({ status: 'failure', ec: 'SCB2' });
    }

    if (!decoded || !decoded.token) {
      return res.status(401).json({ status: 'failure', ec: 'SCB3' });
    }

    if (requireAdminAccountType && decoded.accountType !== 'admin') {
      return res.status(401).json({ status: 'failure', ec: 'SCB3' });
    }

    req.adminUser   = decoded;
    req.userTracker = decoded.token;
    req.postdata    = body;
    next();
  };
}

module.exports = adminAuth;
