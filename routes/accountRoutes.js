const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to validate transfer request
const validateTransfer = (req, res, next) => {
  const { sourceAccount, destinationAccount, amount } = req.body;
  
  if (!sourceAccount || !destinationAccount || !amount) {
    return res.status(400).json({
      message: 'Missing required transfer details',
      error: 'Please provide sourceAccount, destinationAccount, and amount'
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      message: 'Invalid transfer amount',
      error: 'Transfer amount must be greater than 0'
    });
  }

  if (sourceAccount === destinationAccount) {
    return res.status(400).json({
      message: 'Invalid transfer',
      error: 'Source and destination accounts cannot be the same'
    });
  }

  next();
};

// Settings routes
router.get('/settings/:id', authMiddleware, accountController.getUserSettings);
router.post('/settings/:id', authMiddleware, accountController.saveUserSettings);

// CRITICAL: Specific routes MUST come BEFORE parameterized routes (/:id)
// Transaction routes
router.post('/deposit', authMiddleware, accountController.deposit);
router.post('/withdraw', authMiddleware, accountController.withdraw);
router.post('/transfer', authMiddleware, validateTransfer, accountController.transferFunds);
router.post('/transactions/:transactionId/cancel', authMiddleware, accountController.cancelTransaction);

// Account management routes
router.post('/create-if-missing', authMiddleware, accountController.createIfMissing);
router.post('/initial-setup', authMiddleware, accountController.createInitialAccounts);

// Account status routes (must come before /:id routes)
router.patch('/:id/deactivate', authMiddleware, accountController.deactivateAccount);
router.patch('/:id/reactivate', authMiddleware, accountController.reactivateAccount);
router.patch('/:id/close', authMiddleware, accountController.closeAccount);

// General CRUD routes (these MUST be at the end)
router.get('/', authMiddleware, accountController.getAccounts);
router.post('/', authMiddleware, accountController.createAccount);
router.get('/:id', authMiddleware, accountController.getAccountById);
router.put('/:id', authMiddleware, accountController.updateAccount);
router.delete('/:id', authMiddleware, accountController.deleteAccount);
router.post('/bill-payment', authMiddleware, accountController.billPayment);
router.post('/order-checks', authMiddleware, accountController.orderChecks);

module.exports = router;