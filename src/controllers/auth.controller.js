'use strict';

const mongoose       = require('mongoose');
const { encrypt }    = require('../utils/crypto');
const { generateAPIToken } = require('../utils/token');
const { adminLoginSchema } = require('../validators');

/**
 * POST /api/admin/login
 * Body: { data: { form: { loginname, password } } }
 */
async function adminLogin(req, res) {
  const body = req.body?.data || req.body;
  const form = body?.form;

  // Joi validation
  const { error, value } = adminLoginSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.status(400).json({ status: 'failure', ec: 'SCB4', response: error.details.map(d => d.message) });
  }

  const { loginname, password } = value;

  try {
    const encryptedPassword = encrypt(password);
    const col = mongoose.connection.collection('admin_users');
    const user = await col.findOne({ loginName: loginname, password: encryptedPassword, status: 'active' });

    if (!user) {
      return res.status(401).json({ status: 'failure', ec: 'SCB3' });
    }

    const extra = { accountType: 'admin' };
    const token = generateAPIToken(user.tracker, extra);
    return res.json({ status: 'success', token });
  } catch (err) {
    return res.status(500).json({ status: 'failure', response: err.message });
  }
}

module.exports = { adminLogin };
