const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Calculate loan (no saving)
router.post('/calculate', loanController.calculateLoan);

// Create/Apply for loan
router.post('/', loanController.createLoan);

// Get all user loans
router.get('/', loanController.getLoans);

// Get loan summary
router.get('/summary', loanController.getLoanSummary);

// Get single loan
router.get('/:loanId', loanController.getLoanById);

// Make payment
router.post('/:loanId/payment', loanController.makePayment);

// Make extra payment
router.post('/:loanId/extra-payment', loanController.makeExtraPayment);

module.exports = router;