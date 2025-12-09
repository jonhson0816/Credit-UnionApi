const express = require('express');
const router = express.Router();
const accountDetailsController = require('../controllers/accountDetailsController');
const authMiddleware = require('../middleware/authMiddleware');

// IMPORTANT: Add authMiddleware to protect these routes

// Get single transaction receipt (MUST come before /:accountId to avoid conflicts)
router.get('/transaction/:transactionId', authMiddleware, accountDetailsController.getTransactionById);

// Get detailed account information
router.get('/:accountId', authMiddleware, accountDetailsController.getAccountDetails);

// Get filtered transactions for an account
router.get('/:accountId/transactions', authMiddleware, accountDetailsController.getAccountTransactions);

// Get account summary
router.get('/:accountId/summary', authMiddleware, accountDetailsController.getAccountSummary);

module.exports = router;