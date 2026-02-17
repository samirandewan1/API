'use strict';

const mongoose  = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');
const { genRandomTracker, orgUsersActionLog } = require('../utils/helpers');
const {
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  updatePasswordSchema,
  viewUsersFilterSchema,
} = require('../validators');

// ─── CREATE USER ─────────────────────────────────────────────────────────────
async function createUser(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'createUser');

  const { error, value } = createUserSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  const db = mongoose.connection;

  // Check duplicate login name in org
  const loginExists = await db.collection('organization_users').countDocuments({
    loginName: value.loginname,
    organizationTracker: value.organizationId,
    status: 'active',
  });
  if (loginExists > 0) return res.json({ status: 'failure', ec: 'SCB11' });

  // Check duplicate email
  const emailExists = await db.collection('organization_users').countDocuments({
    email: value.email,
    status: 'active',
  });
  if (emailExists > 0) return res.json({ status: 'failure', ec: 'SCB67' });

  const tracker = await genRandomTracker('tracker', 'organization_users');

  const document = {
    tracker,
    name               : value.name,
    email              : value.email,
    loginName          : value.loginname,
    password           : value.password ? encrypt(value.password) : '',
    gender             : value.gender,
    designation        : value.designation || '',
    levels             : value.levels,
    status             : value.status,
    dob                : value.dob ? new Date(value.dob) : null,
    phone              : value.phone || '',
    address            : value.address || '',
    area               : value.area || '',
    city               : value.city || '',
    state              : value.state || '',
    country            : value.country || '',
    campaignType       : value.campaignType || '',
    organizationTracker: value.organizationId,
  };

  await db.collection('organization_users').insertOne(document);
  return res.json({ status: 'success', userId: tracker });
}

// ─── UPDATE USER ─────────────────────────────────────────────────────────────
async function updateUser(req, res) {
  const { postdata, userTracker } = req;
  const form     = postdata?.form;
  const filterBy = postdata?.filter;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'updateUser');

  if (!filterBy?.userId || !filterBy?.organizationId) {
    return res.json({ status: 'failure', ec: 'SCB8' });
  }

  const { error, value } = updateUserSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  const db = mongoose.connection;
  const document = {};

  if (value.name)        document.name        = value.name;
  if (value.email)       document.email       = value.email;
  if (value.designation) document.designation = value.designation;
  if (value.levels)      document.levels      = value.levels;
  if (value.status)      document.status      = value.status;
  if (value.phone)       document.phone       = value.phone;
  if (value.address)     document.address     = value.address;
  if (value.area)        document.area        = value.area;
  if (value.city)        document.city        = value.city;
  if (value.state)       document.state       = value.state;
  if (value.country)     document.country     = value.country;
  if (value.campaignType) document.campaignType = value.campaignType;
  if (value.dob)         document.dob         = new Date(value.dob);
  if (value.gender)      document.gender      = value.gender;
  if (value.password)    document.password    = encrypt(value.password);

  // loginname uniqueness check
  if (value.loginname) {
    document.loginName = value.loginname;
    const loginExists = await db.collection('organization_users').countDocuments({
      loginName: value.loginname,
      organizationTracker: filterBy.organizationId,
      status: 'active',
    });
    if (loginExists > 0) {
      const existing = await db.collection('organization_users').findOne({ tracker: filterBy.userId });
      if (existing?.loginName !== value.loginname) {
        return res.json({ status: 'failure', ec: 'SCB11' });
      }
    }
  }

  await db.collection('organization_users').updateOne(
    { tracker: filterBy.userId, organizationTracker: filterBy.organizationId },
    { $set: document }
  );

  return res.json({ status: 'success', userId: filterBy.userId });
}

// ─── DELETE USER (soft) ──────────────────────────────────────────────────────
async function deleteUser(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'deleteUser');

  const { error, value } = deleteUserSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', ec: 'SCB8' });
  }

  const db = mongoose.connection;

  const exists = await db.collection('organization_users').countDocuments({
    tracker: value.userId,
    organizationTracker: value.organizationId,
    $or: [{ status: 'active' }, { status: 'disabled' }],
  });

  if (exists === 0) return res.json({ status: 'failure', ec: 'SCB7' });

  await db.collection('organization_users').updateOne(
    { tracker: value.userId, organizationTracker: value.organizationId },
    { $set: { status: 'hold' } }
  );

  return res.json({ status: 'success', userId: value.userId });
}

// ─── VIEW USERS ──────────────────────────────────────────────────────────────
async function viewUsers(req, res) {
  const { postdata, userTracker } = req;
  const filterBy = postdata?.filter || {};
  const extra    = postdata?.extra  || {};

  await orgUsersActionLog(postdata, userTracker, 'admin', 'viewUsers');

  const { error } = viewUsersFilterSchema.validate(filterBy, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  if (!filterBy.organizationId) {
    return res.json({ status: 'failure', ec: 'SCB12' });
  }

  const limit     = 25;
  const pageIndex = extra.pageIndex > 0 ? extra.pageIndex : 0;
  const pageJump  = extra.pageJump ? extra.pageJump * limit : pageIndex;
  const skip      = pageJump > 0 ? pageJump : pageIndex;
  const sort      = extra.orderByDateCreated === '-1' ? { cashedDATEobjInsert: -1 } : {};

  const db = mongoose.connection;
  const searchQuery = { organizationTracker: filterBy.organizationId };

  if (filterBy.userId)    searchQuery.tracker    = filterBy.userId;
  if (filterBy.name)      searchQuery.name       = new RegExp(filterBy.name, 'i');
  if (filterBy.loginname) searchQuery.loginName  = new RegExp(filterBy.loginname, 'i');
  if (filterBy.email)     searchQuery.email      = new RegExp(filterBy.email, 'i');
  if (filterBy.levels)    searchQuery.levels     = filterBy.levels;

  if (filterBy.status) {
    searchQuery.status = filterBy.status;
  } else {
    searchQuery.$or = [{ status: 'active' }, { status: 'disabled' }];
  }

  const docs = await db.collection('organization_users')
    .find(searchQuery)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();

  const users = docs.map(item => {
    delete item._id;
    item.userId         = item.tracker;
    item.organizationId = item.organizationTracker;
    delete item.tracker;
    delete item.organizationTracker;
    if (item.password) item.password = decrypt(item.password);
    return item;
  });

  return res.json({ status: 'success', response: users });
}

// ─── UPDATE PASSWORD ─────────────────────────────────────────────────────────
async function updatePassword(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'updatePassword');

  const { error, value } = updatePasswordSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  const db = mongoose.connection;
  const encPwd = encrypt(value.password);

  await db.collection('organization_users').updateOne(
    { tracker: value.userId, organizationTracker: value.organizationId },
    { $set: { password: encPwd } }
  );

  return res.json({ status: 'success', userId: value.userId });
}

module.exports = { createUser, updateUser, deleteUser, viewUsers, updatePassword };
