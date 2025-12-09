// routes/transactionConfirmationRoutes.js
const express = require('express');
const router = express.Router();
const transactionConfirmationController = require('../controllers/transactionConfirmationController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
// router.use(authenticateToken);

// @route   POST /api/transaction-confirmations
// @desc    Create a new transaction confirmation
// @access  Private
router.post('/', transactionConfirmationController.createConfirmation);

// @route   GET /api/transaction-confirmations
// @desc    Get all confirmations for the authenticated user
// @access  Private
router.get('/', transactionConfirmationController.getUserConfirmations);

// @route   GET /api/transaction-confirmations/stats
// @desc    Get confirmation statistics for the authenticated user
// @access  Private
router.get('/stats', transactionConfirmationController.getConfirmationStats);

// @route   GET /api/transaction-confirmations/:confirmationNumber
// @desc    Get a specific confirmation by confirmation number
// @access  Private
router.get('/:confirmationNumber', transactionConfirmationController.getConfirmationByNumber);

// @route   PATCH /api/transaction-confirmations/:confirmationNumber/download
// @desc    Mark receipt as downloaded
// @access  Private
router.patch('/:confirmationNumber/download', transactionConfirmationController.markReceiptDownloaded);

// @route   PATCH /api/transaction-confirmations/:confirmationNumber/print
// @desc    Mark receipt as printed
// @access  Private
router.patch('/:confirmationNumber/print', transactionConfirmationController.markReceiptPrinted);

// @route   DELETE /api/transaction-confirmations/:confirmationNumber
// @desc    Delete a confirmation (only failed/cancelled)
// @access  Private
router.delete('/:confirmationNumber', transactionConfirmationController.deleteConfirmation);

module.exports = router;