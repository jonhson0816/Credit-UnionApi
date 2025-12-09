const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const authMiddleware = require('../middleware/authMiddleware');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validation');

// Validation middleware
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate
];

const validate2FAEnable = [
  body('method')
    .isIn(['sms', 'email', 'app'])
    .withMessage('Invalid 2FA method'),
  body('phoneNumber')
    .optional()
    .if(body('method').equals('sms'))
    .notEmpty()
    .withMessage('Phone number is required for SMS verification')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format'),
  validate
];

const validate2FACode = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
  validate
];

const validateSecurityQuestions = [
  body('questions')
    .isArray({ min: 3, max: 3 })
    .withMessage('Exactly 3 security questions are required'),
  body('questions.*.question')
    .notEmpty()
    .withMessage('Question cannot be empty'),
  body('questions.*.answer')
    .notEmpty()
    .withMessage('Answer cannot be empty')
    .isLength({ min: 2 })
    .withMessage('Answer must be at least 2 characters long'),
  validate
];

const validateAlertPreferences = [
  body('loginAlerts')
    .optional()
    .isBoolean()
    .withMessage('loginAlerts must be a boolean'),
  body('transactionAlerts')
    .optional()
    .isBoolean()
    .withMessage('transactionAlerts must be a boolean'),
  body('largeTransactionAmount')
    .optional()
    .isNumeric()
    .withMessage('largeTransactionAmount must be a number')
    .isFloat({ min: 0 })
    .withMessage('largeTransactionAmount must be positive'),
  body('securityAlerts')
    .optional()
    .isBoolean()
    .withMessage('securityAlerts must be a boolean'),
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('emailNotifications must be a boolean'),
  body('smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('smsNotifications must be a boolean'),
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('pushNotifications must be a boolean'),
  validate
];

const validateMongoId = [
  param('sessionId')
    .isMongoId()
    .withMessage('Invalid session ID'),
  validate
];

const validateDeviceId = [
  param('deviceId')
    .isMongoId()
    .withMessage('Invalid device ID'),
  validate
];

// All routes require authentication
router.use(authMiddleware);

// Routes

// Get security settings
router.get('/settings', securityController.getSecuritySettings);

// Change password
router.post('/change-password', validatePasswordChange, securityController.changePassword);

// Two-factor authentication
router.post('/enable-2fa', validate2FAEnable, securityController.enable2FA);
router.post('/verify-2fa', validate2FACode, securityController.verify2FA);
router.post('/disable-2fa', securityController.disable2FA);

// Remove validation middleware temporarily to see raw data
router.post('/security-questions', securityController.saveSecurityQuestions);

// Alert preferences
router.post('/alert-preferences', validateAlertPreferences, securityController.saveAlertPreferences);

// Session management
router.delete('/sessions/:sessionId', validateMongoId, securityController.terminateSession);

// Trusted devices
router.delete('/trusted-devices/:deviceId', validateDeviceId, securityController.removeTrustedDevice);

module.exports = router;