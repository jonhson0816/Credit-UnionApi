const express = require('express');
const router = express.Router();
const accountSettingsController = require('../controllers/accountSettingsController');

// Get and update account settings
router.get('/', accountSettingsController.getSettings);
router.put('/', accountSettingsController.updateSettings);

// Update specific section of settings
router.patch('/:section', accountSettingsController.updateSettingsSection);

// Email and phone management
router.post('/email', accountSettingsController.updateStatementEmail);
router.post('/phone', accountSettingsController.updatePhone);

// Security settings
router.post('/twoFactor', accountSettingsController.setupTwoFactor);
router.post('/biometric', accountSettingsController.setupBiometric);
router.post('/change-password', accountSettingsController.changePassword);
router.post('/logout-all-sessions', accountSettingsController.logoutAllSessions);

// Login activity
router.post('/loginActivity', accountSettingsController.recordLogin);
router.get('/loginActivity', accountSettingsController.getLoginActivity);

// Paperless and notifications
router.post('/paperless', accountSettingsController.togglePaperless);
router.patch('/notifications', accountSettingsController.updateNotificationPreferences);
router.post('/pendingAction', accountSettingsController.clearPendingAction);

module.exports = router;