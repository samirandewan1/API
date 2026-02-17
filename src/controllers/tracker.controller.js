'use strict';

const mongoose = require('mongoose');
const { orgUsersActionLog } = require('../utils/helpers');
const {
  createTrackerSchema,
  updateTrackerSchema,
  deleteTrackerSchema,
  removeTrackerSchema,
  viewTrackersFilterSchema,
} = require('../validators');

// ─── CREATE TRACKER ──────────────────────────────────────────────────────────
async function createTracker(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'createTracker');

  const { error, value } = createTrackerSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  const db = mongoose.connection;

  // Check IMEI uniqueness (imei and imei2 across both fields)
  const imeiQuery = { status: 'active' };
  if (value.imei && value.imei2) {
    imeiQuery.$or = [
      { imei: value.imei }, { imei2: value.imei },
      { imei: value.imei2 }, { imei2: value.imei2 },
    ];
  } else if (value.imei) {
    imeiQuery.$or = [{ imei: value.imei }, { imei2: value.imei }];
  } else if (value.imei2) {
    imeiQuery.$or = [{ imei: value.imei2 }, { imei2: value.imei2 }];
  }

  const imeiExists = await db.collection('organization_tracker').findOne(imeiQuery);
  if (imeiExists) return res.json({ status: 'failure', ec: 'SCB9' });

  // Get orgRefNo from organization
  const org = await db.collection('organization').findOne(
    { tracker: value.organizationId, status: 'active' },
    { projection: { orgRefNo: 1 } }
  );

  if (!org) return res.json({ status: 'failure', ec: 'SCB6' });

  const vehRegnoString = value.vehicleInformation.regno.replace(/[^A-Za-z0-9]/g, '');
  const trackerID      = String(org.orgRefNo) + vehRegnoString;

  // Check tracker uniqueness
  const trackerExists = await db.collection('organization_tracker').findOne({
    tracker: trackerID,
    organizationTracker: value.organizationId,
    status: 'active',
  });
  if (trackerExists) return res.json({ status: 'failure', ec: 'SCB10' });

  const document = {
    tracker    : trackerID,
    imei       : value.imei || '',
    imei2      : value.imei2 || '',
    boxid      : value.boxid,
    boxid2     : value.boxid2 || '',
    simvendor  : value.simvendor  || '',
    simvendor2 : value.simvendor2 || '',
    simCard    : value.simCard  || '',
    simCard2   : value.simCard2 || '',
    Date       : new Date().toLocaleDateString('en-GB').replace(/\//g, ''), // ddmmyyyy
    logTimeMS  : Date.now(),
    vehicleInformation: {
      name                : value.vehicleInformation.name,
      type                : value.vehicleInformation.type || '',
      make                : value.vehicleInformation.make || '',
      regno               : value.vehicleInformation.regno,
      tabDeviceName       : value.vehicleInformation.tabDeviceName || '',
      ownerName           : value.vehicleInformation.ownername || '',
      ownerPhone          : value.vehicleInformation.ownerPhone || '',
      ownerAddress        : value.vehicleInformation.ownerAddress || '',
      model               : value.vehicleInformation.model || '',
      manufactureYear     : value.vehicleInformation.manufactureYear || '',
      purchasedYear       : value.vehicleInformation.purchasedYear || '',
      color               : value.vehicleInformation.color || '',
      fuel                : value.vehicleInformation.fuel || '',
      engineNumber        : value.vehicleInformation.engineNumber || '',
      chasisNumber        : value.vehicleInformation.chasisNumber || '',
      insuranceCompany    : value.vehicleInformation.insuranceCompany || '',
      insurancePolicyNumber: value.vehicleInformation.insurancePolicyNumber || '',
      insuranceExpiryDate : value.vehicleInformation.insuranceExpiryDate ? new Date(value.vehicleInformation.insuranceExpiryDate) : null,
      seatCapacity        : value.vehicleInformation.seatCapacity || '',
      driverName          : value.vehicleInformation.driverName || '',
      driverPhone         : value.vehicleInformation.driverPhone || '',
      driverAddress       : value.vehicleInformation.driverAddress || '',
    },
    status             : 'active',
    organizationTracker: value.organizationId,
  };

  await db.collection('organization_tracker').insertOne(document);
  return res.json({ status: 'success', trackerId: trackerID });
}

// ─── UPDATE TRACKER ──────────────────────────────────────────────────────────
async function updateTracker(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'updateTracker');

  const { error, value } = updateTrackerSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', response: error.details.map(d => d.message) });
  }

  if (!value.organizationId || !value.trackerId) {
    return res.json({ status: 'failure', ec: 'SCB5' });
  }

  const db = mongoose.connection;

  // IMEI uniqueness checks
  const imeiCheck = async (imei) => {
    const q = { $or: [{ imei }, { imei2: imei }], status: 'active' };
    return db.collection('organization_tracker').findOne(q);
  };

  if (value.imei) {
    const imeiExists = await imeiCheck(value.imei);
    if (imeiExists) return res.json({ status: 'failure', ec: 'SCB9' });
  }
  if (value.imei2) {
    const imei2Exists = await imeiCheck(value.imei2);
    if (imei2Exists) return res.json({ status: 'failure', ec: 'SCB9' });
  }

  // Fetch current tracker data (for history)
  const oldTracker = await db.collection('organization_tracker').findOne(
    { tracker: value.trackerId },
    { projection: { imei: 1, imei2: 1, boxid: 1, boxid2: 1, simCard: 1, simCard2: 1, vehicleInformation: 1, organizationTracker: 1 } }
  );

  const document = {};
  const vi = value.vehicleInformation || {};

  if (value.imei)      document.imei      = value.imei;
  if (value.imei2)     document.imei2     = value.imei2;
  if (value.boxid)     document.boxid     = value.boxid;
  if (value.boxid2)    document.boxid2    = value.boxid2;
  if (value.simvendor)  document.simvendor  = value.simvendor;
  if (value.simvendor2) document.simvendor2 = value.simvendor2;
  if (value.simCard)   document.simCard   = value.simCard;
  if (value.simCard2)  document.simCard2  = value.simCard2;
  if (value.status)    document.status    = value.status;

  if (vi.regno)               document['vehicleInformation.regno']                = vi.regno;
  if (vi.name)                document['vehicleInformation.name']                 = vi.name;
  if (vi.type)                document['vehicleInformation.type']                 = vi.type;
  if (vi.tabDeviceName)       document['vehicleInformation.tabDeviceName']        = vi.tabDeviceName;
  if (vi.make)                document['vehicleInformation.make']                 = vi.make;
  if (vi.ownerName)           document['vehicleInformation.ownerName']            = vi.ownerName;
  if (vi.ownerPhone)          document['vehicleInformation.ownerPhone']           = vi.ownerPhone;
  if (vi.ownerAddress)        document['vehicleInformation.ownerAddress']         = vi.ownerAddress;
  if (vi.model)               document['vehicleInformation.model']                = vi.model;
  if (vi.manufactureYear)     document['vehicleInformation.manufactureYear']      = vi.manufactureYear;
  if (vi.purchasedYear)       document['vehicleInformation.purchasedYear']        = vi.purchasedYear;
  if (vi.color)               document['vehicleInformation.color']                = vi.color;
  if (vi.fuel)                document['vehicleInformation.fuel']                 = vi.fuel;
  if (vi.engineNumber)        document['vehicleInformation.engineNumber']         = vi.engineNumber;
  if (vi.chasisNumber)        document['vehicleInformation.chasisNumber']         = vi.chasisNumber;
  if (vi.insuranceCompany)    document['vehicleInformation.insuranceCompany']     = vi.insuranceCompany;
  if (vi.insurancePolicyNumber) document['vehicleInformation.insurancePolicyNumber'] = vi.insurancePolicyNumber;
  if (vi.seatCapacity)        document['vehicleInformation.seatCapacity']         = vi.seatCapacity;
  if (vi.driverName)          document['vehicleInformation.driverName']           = vi.driverName;
  if (vi.driverPhone)         document['vehicleInformation.driverPhone']          = vi.driverPhone;
  if (vi.driverAddress)       document['vehicleInformation.driverAddress']        = vi.driverAddress;

  await db.collection('organization_tracker').updateOne(
    { tracker: value.trackerId, organizationTracker: value.organizationId },
    { $set: document }
  );

  // Write tracker history if IMEI / boxid changed
  const imeiChanged = (value.imei  && oldTracker?.imei  !== value.imei)
                   || (value.imei2 && oldTracker?.imei2 !== value.imei2);
  const boxChanged  = (value.boxid  && oldTracker?.boxid  !== value.boxid)
                   || (value.boxid2 && oldTracker?.boxid2 !== value.boxid2);

  if (imeiChanged || boxChanged) {
    const orgInfo = await db.collection('organization').findOne(
      { tracker: value.organizationId, status: 'active' },
      { projection: { name: 1 } }
    );

    const histDoc = {
      tracker     : String(Date.now()),
      veh_tracker : value.trackerId,
      old_imei    : oldTracker?.imei,
      old_imei2   : oldTracker?.imei2,
      old_boxid   : oldTracker?.boxid,
      old_boxid2  : oldTracker?.boxid2,
      old_simCard : oldTracker?.simCard,
      old_simCard2: oldTracker?.simCard2,
      old_regno   : oldTracker?.vehicleInformation?.regno,
      userTracker,
      orgId       : value.organizationId,
      orgName     : orgInfo?.name || '',
      logTimeMS   : Date.now(),
      old_data    : {
        vehicleInformation: oldTracker?.vehicleInformation,
        organizationTracker: oldTracker?.organizationTracker,
      },
    };

    if (value.imei)  { histDoc.new_imei  = value.imei; }
    if (value.imei2) { histDoc.new_imei2 = value.imei2; }
    if (value.boxid) { histDoc.new_boxid = value.boxid; }
    if (value.boxid2){ histDoc.new_boxid2 = value.boxid2; }
    if (vi.regno)    { histDoc.new_regno = vi.regno; }

    await db.collection('tracker_history').insertOne(histDoc);
  }

  return res.json({ status: 'success', trackerId: value.trackerId });
}

// ─── DELETE TRACKER (soft) ───────────────────────────────────────────────────
async function deleteTracker(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'deleteTracker');

  const { error, value } = deleteTrackerSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', ec: 'SCB5' });
  }

  const db = mongoose.connection;

  const trackerExists = await db.collection('organization_tracker').countDocuments({
    tracker: value.trackerId,
    organizationTracker: value.organizationId,
    $or: [{ status: 'active' }, { status: 'disabled' }],
  });

  if (trackerExists === 0) return res.json({ status: 'failure', ec: 'SCB7' });

  await db.collection('organization_tracker').updateOne(
    { tracker: value.trackerId, organizationTracker: value.organizationId },
    { $set: { status: 'hold' } }
  );

  return res.json({ status: 'success', trackerId: value.trackerId });
}

// ─── REMOVE TRACKER (hard delete) ───────────────────────────────────────────
async function removeTracker(req, res) {
  const { postdata, userTracker } = req;
  const form = postdata?.form;

  await orgUsersActionLog(postdata, userTracker, 'admin', 'removeTracker');

  const { error, value } = removeTrackerSchema.validate(form, { abortEarly: false });
  if (error) {
    return res.json({ status: 'failure', ec: 'SCB5' });
  }

  const db = mongoose.connection;

  const trackerExists = await db.collection('organization_tracker').countDocuments({
    tracker: value.trackerId,
    organizationTracker: value.organizationId,
  });

  if (trackerExists === 0) return res.json({ status: 'failure', ec: 'SCB7' });

  await db.collection('organization_tracker').deleteOne({
    tracker: value.trackerId,
    organizationTracker: value.organizationId,
  });

  return res.json({ status: 'success', trackerId: value.trackerId });
}

// ─── VIEW TRACKERS ───────────────────────────────────────────────────────────
async function viewTrackers(req, res) {
  const { postdata, userTracker } = req;
  const filterBy = postdata?.filter || {};
  const extra    = postdata?.extra  || {};

  await orgUsersActionLog(postdata, userTracker, 'admin', 'viewTrackers');

  const { error } = viewTrackersFilterSchema.validate(filterBy, { abortEarly: false });
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
  const sort      = extra.orderByDateCreated === '-1' ? { logTimeMS: -1 } : {};

  const db = mongoose.connection;
  const searchQuery = { organizationTracker: filterBy.organizationId };

  if (filterBy.trackerId) searchQuery.tracker = filterBy.trackerId;
  if (filterBy.imei)      searchQuery.$or = [{ imei: filterBy.imei }, { imei2: filterBy.imei }];
  if (filterBy.regno)     searchQuery['vehicleInformation.regno'] = new RegExp(filterBy.regno, 'i');
  if (filterBy.status)    searchQuery.status = filterBy.status;
  else                    searchQuery.status = 'active';

  const docs = await db.collection('organization_tracker')
    .find(searchQuery)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();

  const trackers = docs.map(item => {
    delete item._id;
    item.trackerId      = item.tracker;
    item.organizationId = item.organizationTracker;
    delete item.tracker;
    delete item.organizationTracker;
    return item;
  });

  return res.json({ status: 'success', response: trackers });
}

module.exports = { createTracker, updateTracker, deleteTracker, removeTracker, viewTrackers };
