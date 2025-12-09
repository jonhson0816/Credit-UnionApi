const express = require('express');
const router = express.Router();
const mobileBankingController = require('../controllers/mobileBankingController');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== ALL ROUTES REQUIRE AUTHENTICATION ====================

// Apply auth middleware to all routes
router.use(authMiddleware);

// ==================== ACCOUNTS ====================

// Get all user accounts
router.get('/accounts', mobileBankingController.getAccounts);

// Get single account details
router.get('/accounts/:accountId', mobileBankingController.getAccountById);

// Update account settings
router.patch('/accounts/:accountId', mobileBankingController.updateAccountSettings);

// ==================== TRANSACTIONS ====================

// Get transaction history
router.get('/transactions', mobileBankingController.getTransactions);

// Get transaction by ID
router.get('/transactions/:transactionId', mobileBankingController.getTransactionById);

// Get spending analytics
router.get('/analytics/spending', mobileBankingController.getSpendingAnalytics);

// ==================== TRANSFERS ====================

// Create new transfer
router.post('/transfers', mobileBankingController.createTransfer);

// Get user transfers
router.get('/transfers', mobileBankingController.getTransfers);

// Cancel transfer
router.patch('/transfers/:transferId/cancel', mobileBankingController.cancelTransfer);

// ==================== BILL PAYMENTS ====================

// Create bill payment
router.post('/bill-payments', mobileBankingController.createBillPayment);

// Get bill payments
router.get('/bill-payments', mobileBankingController.getBillPayments);

// Cancel bill payment
router.patch('/bill-payments/:paymentId/cancel', mobileBankingController.cancelBillPayment);

// ==================== MOBILE CHECK DEPOSIT ====================

// Submit mobile deposit
router.post('/mobile-deposits', mobileBankingController.submitMobileDeposit);

// Get mobile deposits
router.get('/mobile-deposits', mobileBankingController.getMobileDeposits);

// ==================== ALERTS ====================

// Get user alerts
router.get('/alerts', mobileBankingController.getAlerts);

// Mark alert as read
router.patch('/alerts/:alertId/read', mobileBankingController.markAlertRead);

// Mark all alerts as read
router.patch('/alerts/read-all', mobileBankingController.markAllAlertsRead);

module.exports = router;