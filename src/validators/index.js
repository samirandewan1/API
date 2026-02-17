'use strict';

const Joi = require('joi');

// ─────────────────────────────────────────────
// Reusable field definitions
// ─────────────────────────────────────────────
const strRequired  = Joi.string().trim().required();
const strOptional  = Joi.string().trim().allow('', null).optional();
const emailReq     = Joi.string().trim().email({ tlds: { allow: false } }).required();
const emailOpt     = Joi.string().trim().email({ tlds: { allow: false } }).allow('', null).optional();
const boolString   = Joi.string().valid('true', 'false').optional();

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
const adminLoginSchema = Joi.object({
  loginname: strRequired.label('Login Name'),
  password : strRequired.label('Password'),
});

// ─────────────────────────────────────────────
// Organization
// ─────────────────────────────────────────────
const vehicleInfoSchema = Joi.object({
  name               : strOptional.label('Vehicle Name'),
  type               : strOptional,
  make               : strOptional,
  regno              : strOptional.label('Vehicle Regno'),
  tabDeviceName      : strOptional,
  ownername          : strOptional,
  ownerPhone         : strOptional,
  ownerAddress       : strOptional,
  model              : strOptional,
  manufactureYear    : strOptional,
  purchasedYear      : strOptional,
  color              : strOptional,
  fuel               : strOptional,
  engineNumber       : strOptional,
  chasisNumber       : strOptional,
  insuranceCompany   : strOptional,
  insurancePolicyNumber: strOptional,
  insuranceExpiryDate: strOptional,
  seatCapacity       : Joi.alternatives().try(Joi.number(), Joi.string().allow('', null)).optional(),
  driverName         : strOptional,
  driverPhone        : strOptional,
  driverAddress      : strOptional,
}).optional();

const createOrgSchema = Joi.object({
  name           : strRequired.label('Name'),
  category       : strRequired.label('Category'),
  address        : strRequired.label('Address'),
  area           : strRequired.label('Area'),
  city           : strRequired.label('City'),
  state          : strRequired.label('State'),
  country        : strRequired.label('Country'),
  website        : strOptional.label('Website'),
  email          : emailReq.label('Email'),
  description    : strOptional.label('Description'),
  contactInformation: Joi.any().optional(),
  status         : Joi.string().valid('active', 'hold').required().label('Status'),
  orgStartTime   : strOptional.label('Org Start Time'),
  orgEndTime     : strOptional.label('Org End Time'),
  location       : Joi.any().optional().label('Org Location'),
  reports        : Joi.any().optional(),
  weekdays       : Joi.any().optional(),
  classLists     : Joi.any().optional(),
  SectionLists   : Joi.any().optional(),
  voiceCall      : Joi.any().optional(),
  cameraModuleView: Joi.any().optional(),
  otherlang      : Joi.any().optional(),
  schoolsessionLists: Joi.any().optional(),
});

const editOrgSchema = Joi.object({
  name           : strOptional.label('Name'),
  category       : strOptional.label('Category'),
  address        : strOptional.label('Address'),
  area           : strOptional.label('Area'),
  city           : strOptional.label('City'),
  state          : strOptional.label('State'),
  country        : strOptional.label('Country'),
  website        : strOptional.label('Website'),
  email          : emailOpt.label('Email'),
  description    : strOptional.label('Description'),
  contactInformation: Joi.any().optional(),
  location       : Joi.any().optional(),
  smsAlert       : boolString,
  appAlert       : boolString,
  emailAlert     : boolString,
  callAlert      : boolString,
  rfidAlert      : boolString,
  etaAlert       : boolString,
  alertlock      : boolString,
  cameraModuleView: boolString,
  otherlang      : boolString,
  reports        : Joi.any().optional(),
  weekdays       : Joi.any().optional(),
  callingURL     : strOptional,
  voiceCall      : Joi.any().optional(),
  orgStartTime   : strOptional,
  orgEndTime     : strOptional,
  classLists     : Joi.any().optional(),
  SectionLists   : Joi.any().optional(),
  schoolsessionLists: Joi.any().optional(),
});

const deleteOrgSchema = Joi.object({
  orgId: strRequired.label('Organization ID'),
});

// ─────────────────────────────────────────────
// Organization Users
// ─────────────────────────────────────────────
const createUserSchema = Joi.object({
  name          : strRequired.label('Name'),
  email         : emailReq.label('Email'),
  loginname     : strRequired.label('Login Name'),
  password      : strRequired.min(4).label('Password'),
  gender        : Joi.string().valid('male', 'female', 'other').required().label('Gender'),
  designation   : strOptional,
  levels        : strRequired.label('Levels'),
  status        : Joi.string().valid('active', 'hold').required().label('Status'),
  dob           : strOptional,
  phone         : strOptional,
  address       : strOptional,
  area          : strOptional,
  city          : strOptional,
  state         : strOptional,
  country       : strOptional,
  campaignType  : Joi.string().valid('sms', 'broadcast', 'both').allow('', null).optional(),
  organizationId: strRequired.label('Organization ID'),
});

const updateUserSchema = Joi.object({
  name        : strOptional.label('Name'),
  email       : emailOpt.label('Email'),
  loginname   : strOptional.label('Login Name'),
  password    : Joi.string().min(4).allow('', null).optional().label('Password'),
  gender      : Joi.string().valid('male', 'female', 'other').allow('', null).optional(),
  designation : strOptional,
  levels      : strOptional.label('Levels'),
  status      : Joi.string().valid('active', 'hold').allow('', null).optional().label('Status'),
  dob         : strOptional,
  phone       : strOptional,
  address     : strOptional,
  area        : strOptional,
  city        : strOptional,
  state       : strOptional,
  country     : strOptional,
  campaignType: strOptional,
});

const deleteUserSchema = Joi.object({
  organizationId: strRequired.label('Organization ID'),
  userId        : strRequired.label('User ID'),
});

// ─────────────────────────────────────────────
// Trackers
// ─────────────────────────────────────────────
const createTrackerSchema = Joi.object({
  imei              : strRequired.label('IMEI'),
  imei2             : strOptional,
  boxid             : strRequired.label('Box ID'),
  boxid2            : strOptional,
  simvendor         : strOptional,
  simvendor2        : strOptional,
  simCard           : strOptional,
  simCard2          : strOptional,
  organizationId    : strRequired.label('Organization ID'),
  vehicleInformation: Joi.object({
    name               : strRequired.label('Vehicle Name'),
    type               : strOptional,
    make               : strOptional,
    regno              : strRequired.label('Vehicle Regno'),
    tabDeviceName      : strOptional,
    ownername          : strOptional,
    ownerPhone         : strOptional,
    ownerAddress       : strOptional,
    model              : strOptional,
    manufactureYear    : strOptional,
    purchasedYear      : strOptional,
    color              : strOptional,
    fuel               : strOptional,
    engineNumber       : strOptional,
    chasisNumber       : strOptional,
    insuranceCompany   : strOptional,
    insurancePolicyNumber: strOptional,
    insuranceExpiryDate: strOptional,
    seatCapacity       : Joi.alternatives().try(Joi.number(), Joi.string().allow('', null)).optional(),
    driverName         : strOptional,
    driverPhone        : strOptional,
    driverAddress      : strOptional,
  }).required(),
});

const updateTrackerSchema = Joi.object({
  organizationId    : strRequired.label('Organization ID'),
  trackerId         : strRequired.label('Tracker ID'),
  imei              : strOptional,
  imei2             : strOptional,
  boxid             : strOptional,
  boxid2            : strOptional,
  simvendor         : strOptional,
  simvendor2        : strOptional,
  simCard           : strOptional,
  simCard2          : strOptional,
  status            : strOptional,
  vehicleInformation: vehicleInfoSchema,
});

const deleteTrackerSchema = Joi.object({
  organizationId: strRequired.label('Organization ID'),
  trackerId     : strRequired.label('Tracker ID'),
});

const removeTrackerSchema = Joi.object({
  organizationId: strRequired.label('Organization ID'),
  trackerId     : strRequired.label('Tracker ID'),
});

// ─────────────────────────────────────────────
// Passwords
// ─────────────────────────────────────────────
const updatePasswordSchema = Joi.object({
  organizationId: strRequired.label('Organization ID'),
  userId        : strRequired.label('User ID'),
  password      : strRequired.min(4).label('New Password'),
});

// ─────────────────────────────────────────────
// View / Filter schemas (query filters)
// ─────────────────────────────────────────────
const viewOrgFilterSchema = Joi.object({
  organizationId: strOptional,
  name          : strOptional,
  category      : strOptional,
  city          : strOptional,
  state         : strOptional,
  country       : strOptional,
  email         : strOptional,
  location      : strOptional,
  smsAlert      : boolString,
  appAlert      : boolString,
  emailAlert    : boolString,
  callAlert     : boolString,
  rfidAlert     : boolString,
  etaAlert      : boolString,
  alertlock     : boolString,
  regNo         : strOptional,
  boxId         : strOptional,
  imei          : strOptional,
  simCard       : strOptional,
});

const viewUsersFilterSchema = Joi.object({
  organizationId: strRequired.label('Organization ID'),
  userId        : strOptional,
  name          : strOptional,
  loginname     : strOptional,
  email         : strOptional,
  status        : strOptional,
  levels        : strOptional,
});

const viewTrackersFilterSchema = Joi.object({
  organizationId: strRequired.label('Organization ID'),
  trackerId     : strOptional,
  imei          : strOptional,
  regno         : strOptional,
  status        : strOptional,
});

module.exports = {
  adminLoginSchema,
  createOrgSchema,
  editOrgSchema,
  deleteOrgSchema,
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  createTrackerSchema,
  updateTrackerSchema,
  deleteTrackerSchema,
  removeTrackerSchema,
  updatePasswordSchema,
  viewOrgFilterSchema,
  viewUsersFilterSchema,
  viewTrackersFilterSchema,
};
