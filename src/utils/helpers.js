'use strict';

const mongoose = require('mongoose');

/**
 * Generate a unique random tracker ID for MongoDB documents.
 * Mimics PHP genrandomnumCommon_Mongo — returns a random 10-digit number string
 * that does not already exist in the given collection field.
 */
async function genRandomTracker(field, collectionName) {
  const Model = mongoose.connection.collection(collectionName);
  let tracker;
  let exists = true;
  while (exists) {
    tracker = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const doc = await Model.findOne({ [field]: tracker });
    exists = !!doc;
  }
  return tracker;
}

/**
 * Log user actions (stub — extend to write to an actionlog collection).
 */
async function orgUsersActionLog(postdata, userTracker, role, endpoint) {
  try {
    const col = mongoose.connection.collection('actionlog');
    await col.insertOne({
      user: userTracker,
      role,
      endpoint,
      logTimeMS: Date.now(),
    });
  } catch (_) {
    // non-blocking
  }
}

/**
 * Convert a boolean-like string ('true'/'false') to a real boolean.
 */
function parseBool(val) {
  if (val === true || val === 'true') return true;
  if (val === false || val === 'false') return false;
  return undefined;
}

module.exports = { genRandomTracker, orgUsersActionLog, parseBool };
