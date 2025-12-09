// routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionLimiter = require('../middleware/rateLimit');
const { body, validationResult } = require('express-validator');
const transactionController = require('../controllers/transactionController');
const transactionConfirmationController = require('../controllers/transactionConfirmationController');
const authMiddleware = require('../middleware/authMiddleware');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
      message: 'Invalid request data'
    });
  }
  next();
};

// Transaction validation rules
const transactionRules = [
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('type').isIn(['Credit', 'Debit', 'credit', 'debit']).withMessage('Invalid transaction type'),
  body('description').optional().trim(),
  body('category').optional().trim()
];

// Transfer validation rules
const transferRules = [
  body('sourceAccount').notEmpty().withMessage('Source account is required'),
  body('destinationAccount')
    .notEmpty()
    .withMessage('Destination account is required')
    .custom((value, { req }) => {
      if (value === req.body.sourceAccount) {
        throw new Error('Source and destination accounts must be different');
      }
      return true;
    }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').optional().trim(),
  body('recipientDetails').optional(),
  body('recipientDetails.name').optional().trim(),
  body('recipientDetails.bank').optional().trim(),
  body('recipientDetails.routingNumber').optional().trim(),
  body('recipientDetails.transferType').optional().trim()
];

// Bill payment validation rules
// Bill payment validation rules
const billPaymentRules = [
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('payeeName').notEmpty().trim().withMessage('Payee name is required'),
  body('billType').optional().trim(),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('memo').optional().trim()
];

// Check order validation rules
const checkOrderRules = [
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('quantity').isInt({ min: 50, max: 200 }).withMessage('Quantity must be between 50 and 200'),
  body('checkStyle').optional().isIn(['standard', 'premium', 'designer']).withMessage('Invalid check style'),
  body('startingNumber').optional().trim(),
  body('shippingAddress').notEmpty().trim().withMessage('Shipping address is required'),
  body('deliverySpeed').optional().isIn(['standard', 'expedited', 'overnight']).withMessage('Invalid delivery speed')
];

// Confirmation validation rules
const confirmationRules = [
  body('transactionId').notEmpty().withMessage('Transaction ID is required')
];

// Apply auth middleware to all routes
router.use(authMiddleware);

// Define routes with validation

// Get all transactions
router.get('/', transactionLimiter, transactionController.getTransactions);

// Create a new transaction (deposit/withdrawal)
router.post(
  '/create',
  transactionRules,
  validateRequest,
  transactionController.createTransaction
);

// Transfer funds between accounts
router.post(
  '/transfer',
  transferRules,
  validateRequest,
  transactionController.transferFunds
);

// Bill payment
router.post(
  '/bill-payment',
  billPaymentRules,
  validateRequest,
  transactionController.billPayment
);

// Order checks
router.post(
  '/order-checks',
  checkOrderRules,
  validateRequest,
  transactionController.orderChecks
);

// Confirm transaction
router.post(
  '/confirm', 
  transactionLimiter, 
  transactionConfirmationController.createConfirmation);

  // Get single transaction by ID
router.get(
  '/:transactionId',
  transactionLimiter,
  transactionController.getTransactionById
);

module.exports = router;