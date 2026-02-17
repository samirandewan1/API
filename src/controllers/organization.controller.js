'use strict';

const mongoose = require('mongoose');
const { genRandomTracker, orgUsersActionLog, parseBool } = require('../utils/helpers');
const {
  createOrgSchema,
  editOrgSchema,
  deleteOrgSchema,
  viewOrgFilterSchema,
} = require('../validators');

// ─── CREATE ──────────────────────────────────────────────────────────────────
async function createOrg(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'createOrg');

  const { error, value } = createOrgSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  const col = mongoose.connection.collection('organization');

  // Check duplicate name
  const existing = await col.countDocuments({ name: value.name, status: 'active' });
  if (existing > 0) {
    return res.json({ status: 'failure', ec: 'SCB78' });
  }

  const tracker = await genRandomTracker('tracker', 'organization');
  const milliseconds = Date.now();

  const defaultReports = {
    rfid: true,
    tracking: { movement: true, halt: true, movementandhalt: true, overspeed: true, lowspeed: true, rangeofspeed: true, daysummary: true },
    alertlog: { callalertmadelog: true, routehistorylog: true, memberhistorylog: true },
    others:   { panic: true, vehiclelastupdate: true, engine: true, ac: true, accanddecc: true, routevehiclemapped: true, geofence: true },
  };

  const defaultWeekdays = { sunday: false, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false };
  const defaultVoiceCall = { channel: '', voiceId: '' };

  const document = {
    tracker,
    name            : value.name,
    category        : value.category,
    address         : value.address,
    area            : value.area,
    city            : value.city,
    state           : value.state,
    country         : value.country,
    website         : value.website || '',
    email           : value.email,
    description     : value.description || '',
    contactInformation: value.contactInformation || null,
    status          : value.status,
    smsAlert        : true,
    appAlert        : true,
    callAlert       : true,
    emailAlert      : true,
    rfidAlert       : false,
    etaAlert        : false,
    alertlock       : false,
    orgStartTime    : value.orgStartTime || '',
    orgEndTime      : value.orgEndTime   || '',
    orgRefNo        : milliseconds,
    orgLocation     : value.location || null,
    reports         : value.reports   || defaultReports,
    weekdays        : value.weekdays  || defaultWeekdays,
    voiceCall       : value.voiceCall || defaultVoiceCall,
    cameraModuleView: !!value.cameraModuleView,
    otherlang       : !!value.otherlang,
  };

  if (value.classLists)        document.classLists         = value.classLists;
  if (value.SectionLists)      document.SectionLists        = value.SectionLists;
  if (value.schoolsessionLists) document.schoolsessionLists = value.schoolsessionLists;

  await col.insertOne(document);

  return res.json({ status: 'success', organizationId: tracker });
}

// ─── EDIT ────────────────────────────────────────────────────────────────────
async function editOrg(req, res) {
  const { postdata, userTracker } = req;
  const form     = postdata?.form;
  const filterBy = postdata?.filter;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'editOrg');

  if (!filterBy?.organizationId) {
    return res.json({ status: 'failure', ec: 'SCB8' });
  }

  const { error, value } = editOrgSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  const document = {};

  if (value.name)            document.name            = value.name;
  if (value.category)        document.category        = value.category;
  if (value.address)         document.address         = value.address;
  if (value.area)            document.area            = value.area;
  if (value.city)            document.city            = value.city;
  if (value.state)           document.state           = value.state;
  if (value.country)         document.country         = value.country;
  if (value.website)         document.website         = value.website;
  if (value.email)           document.email           = value.email;
  if (value.description)     document.description     = value.description;
  if (value.contactInformation) document.contactInformation = value.contactInformation;
  if (value.location)        document.orgLocation     = value.location;
  if (value.reports)         document.reports         = value.reports;
  if (value.weekdays)        document.weekdays        = value.weekdays;
  if (value.voiceCall)       document.voiceCall       = value.voiceCall;
  if (value.orgStartTime)    document.orgStartTime    = value.orgStartTime;
  if (value.orgEndTime)      document.orgEndTime      = value.orgEndTime;
  if (value.classLists)      document.classLists      = value.classLists;
  if (value.SectionLists)    document.SectionLists    = value.SectionLists;

  // callingURL always set (even if empty)
  document.callingURL = value.callingURL || '';

  // schoolsessionLists
  if (value.schoolsessionLists === 'clear')                   document.schoolsessionLists = [];
  else if (value.schoolsessionLists)                          document.schoolsessionLists = value.schoolsessionLists;

  // boolean alert flags
  ['smsAlert', 'appAlert', 'emailAlert', 'callAlert', 'rfidAlert', 'etaAlert', 'alertlock', 'cameraModuleView', 'otherlang'].forEach(flag => {
    const parsed = parseBool(value[flag]);
    if (parsed !== undefined) document[flag] = parsed;
  });

  const col = mongoose.connection.collection('organization');
  await col.updateOne({ tracker: filterBy.organizationId }, { $set: document });

  return res.json({ status: 'success', organizationId: filterBy.organizationId });
}

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
async function deleteOrg(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'deleteOrg');

  const { error, value } = deleteOrgSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', ec: 'SCB12' });
  }

  const db  = mongoose.connection;
  const org = await db.collection('organization').findOne({ tracker: value.orgId, status: 'active' });
  if (!org) {
    return res.json({ status: 'failure', ec: 'SCB6' });
  }

  // Soft-delete org
  await db.collection('organization').updateOne({ tracker: value.orgId }, { $set: { status: 'hold' } });
  // Cascade to users, trackers, routes, pickup, members, templates
  const cascade = { organizationTracker: value.orgId, status: 'active' };
  await db.collection('organization_users').updateMany(cascade, { $set: { status: 'hold' } });
  await db.collection('organization_tracker').updateMany(cascade, { $set: { status: 'hold' } });

  const orgCascade = { orgId: value.orgId, status: 'active' };
  await db.collection('routes').updateMany(orgCascade, { $set: { status: 'hold' } });
  await db.collection('pickupcollection').updateMany(orgCascade, { $set: { status: 'hold' } });
  await db.collection('membercollection').updateMany(orgCascade, { $set: { status: 'hold' } });
  await db.collection('templatecollection').updateMany(orgCascade, { $set: { status: 'hold' } });
  await db.collection('assignmentcollection').deleteMany({ orgId: value.orgId });

  // Action log
  await db.collection('actionlog').insertOne({ action: 'delete', collection: 'Org', user: userTracker });

  return res.json({ status: 'success' });
}

// ─── VIEW (list) ─────────────────────────────────────────────────────────────
async function viewOrgs(req, res) {
  const { postdata, userTracker } = req;
  const filterBy = postdata?.filter || {};
  const extra    = postdata?.extra  || {};

  await orgUsersActionLog(postdata, userTracker, 'admin', 'viewOrgs');

  const { error } = viewOrgFilterSchema.validate(filterBy, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  const limit     = 10;
  const pageIndex = extra.pageIndex > 0 ? extra.pageIndex : 0;
  const pageJump  = extra.pageJump  ? extra.pageJump * limit : pageIndex;
  const skip      = pageJump > 0 ? pageJump : pageIndex;

  const db  = mongoose.connection;
  const searchQuery = { status: 'active' };

  // Optional tracker lookup by device fields
  let orgFromDevice = null;
  if (filterBy.regNo || filterBy.boxId || filterBy.imei || filterBy.simCard) {
    const trackerQuery = {};
    if (filterBy.regNo)   trackerQuery['vehicleInformation.regno'] = new RegExp(filterBy.regNo, 'i');
    if (filterBy.boxId)   trackerQuery.boxid  = filterBy.boxId;
    if (filterBy.imei)    trackerQuery.$or    = [{ imei: filterBy.imei }, { imei2: filterBy.imei }];
    if (filterBy.simCard) trackerQuery.simCard = filterBy.simCard;
    trackerQuery.status = 'active';
    const tDoc = await db.collection('organization_tracker').findOne(trackerQuery, { projection: { organizationTracker: 1 } });
    if (tDoc?.organizationTracker) orgFromDevice = tDoc.organizationTracker;
  }

  if (orgFromDevice || filterBy.organizationId) {
    searchQuery.tracker = orgFromDevice || filterBy.organizationId;
  }
  if (filterBy.name)     searchQuery.name     = new RegExp(filterBy.name, 'i');
  if (filterBy.category) searchQuery.category = new RegExp(filterBy.category, 'i');
  if (filterBy.city)     searchQuery.city     = new RegExp(filterBy.city, 'i');
  if (filterBy.state)    searchQuery.state    = new RegExp(filterBy.state, 'i');
  if (filterBy.country)  searchQuery.country  = new RegExp(filterBy.country, 'i');
  if (filterBy.email)    searchQuery.email    = new RegExp(filterBy.email, 'i');

  if (filterBy.location) {
    searchQuery.$or = [
      { area:  new RegExp(filterBy.location, 'i') },
      { city:  new RegExp(filterBy.location, 'i') },
      { state: new RegExp(filterBy.location, 'i') },
    ];
  }

  ['smsAlert', 'appAlert', 'emailAlert', 'callAlert', 'rfidAlert', 'etaAlert', 'alertlock'].forEach(flag => {
    const b = parseBool(filterBy[flag]);
    if (b !== undefined) searchQuery[flag] = b;
  });

  const sort = extra.orderByDateCreated === '-1' ? { cashedDATEobjInsert: -1 } : {};

  const docs = await db.collection('organization')
    .find(searchQuery)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();

  const organizations = await Promise.all(docs.map(async item => {
    delete item._id;
    item.organizationId = item.tracker;
    delete item.tracker;
    delete item.cashedDATEobjInsert;
    delete item.cashedDATEobjUpdate;

    const lastLogin = await db.collection('loginlatest').findOne(
      { orgId: item.organizationId },
      { projection: { userName: 1, routeId: 1, userEmail: 1, loginTime: 1 } }
    );
    if (lastLogin) { delete lastLogin._id; item.lastLogin = lastLogin; }

    const trackerCnt = await db.collection('organization_tracker').countDocuments({ organizationTracker: item.organizationId, status: 'active' });
    const userCnt    = await db.collection('organization_users').countDocuments({ organizationTracker: item.organizationId, status: 'active' });
    item.orgTrackerCount = trackerCnt;
    item.orgUserCount    = userCnt;

    return item;
  }));

  return res.json({ status: 'success', response: organizations });
}

// ─── DASHBOARD COUNTS ────────────────────────────────────────────────────────
async function adminDashboardCounts(req, res) {
  const { postdata, userTracker } = req;
  await orgUsersActionLog(postdata, userTracker, 'admin', 'adminDashboardCounts');

  const db = mongoose.connection;
  const q  = { status: 'active' };

  const [activeOrgCount, activeTrackerCount, activeAdminUC, activeOrgAdminUC] = await Promise.all([
    db.collection('organization').countDocuments(q),
    db.collection('organization_tracker').countDocuments(q),
    db.collection('admin_users').countDocuments(q),
    db.collection('organization_users').countDocuments(q),
  ]);

  return res.json({
    status: 'success',
    response: {
      AdminStats: { activeOrgCount, activeTrackerCount, activeAdminUC, activeOrgAdminUC },
    },
  });
}

module.exports = { createOrg, editOrg, deleteOrg, viewOrgs, adminDashboardCounts };
