'use strict';

const express  = require('express');
const router   = express.Router();
const adminAuth = require('../middleware/auth');

// Controllers
const authCtrl  = require('../controllers/auth.controller');
const orgCtrl   = require('../controllers/organization.controller');
const userCtrl  = require('../controllers/user.controller');
const trackerCtrl = require('../controllers/tracker.controller');

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post('/admin/login', authCtrl.adminLogin);

// ─── Organization ────────────────────────────────────────────────────────────
router.post('/organization/create',    adminAuth(),                           orgCtrl.createOrg);
router.post('/organization/edit',      adminAuth(),                           orgCtrl.editOrg);
router.post('/organization/delete',    adminAuth(),                           orgCtrl.deleteOrg);
router.post('/organization/view',      adminAuth(),                           orgCtrl.viewOrgs);
router.post('/organization/dashboard', adminAuth({ requireAdminAccountType: true }), orgCtrl.adminDashboardCounts);

// ─── Organization Users ──────────────────────────────────────────────────────
router.post('/users/create',           adminAuth({ requireAdminAccountType: true }), userCtrl.createUser);
router.post('/users/update',           adminAuth(),                           userCtrl.updateUser);
router.post('/users/delete',           adminAuth(),                           userCtrl.deleteUser);
router.post('/users/view',             adminAuth(),                           userCtrl.viewUsers);
router.post('/users/update-password',  adminAuth(),                           userCtrl.updatePassword);

// ─── Trackers ────────────────────────────────────────────────────────────────
router.post('/trackers/create',        adminAuth({ requireAdminAccountType: true }), trackerCtrl.createTracker);
router.post('/trackers/update',        adminAuth(),                           trackerCtrl.updateTracker);
router.post('/trackers/delete',        adminAuth(),                           trackerCtrl.deleteTracker);
router.post('/trackers/remove',        adminAuth(),                           trackerCtrl.removeTracker);
router.post('/trackers/view',          adminAuth(),                           trackerCtrl.viewTrackers);

module.exports = router;
