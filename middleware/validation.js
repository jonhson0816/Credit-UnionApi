const { body, validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

exports.validateFinancialGoal = [
  body('name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Goal name is required')
    .isLength({ max: 100 })
    .withMessage('Goal name cannot exceed 100 characters'),
  
  body('targetAmount')
    .notEmpty()
    .withMessage('Target amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Target amount must be greater than 0'),
  
  body('currentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current amount must be a positive number'),
  
  body('targetDate')
    .notEmpty()
    .withMessage('Target date is required')
    .isISO8601()
    .withMessage('Target date must be a valid date')
    .custom((value) => {
      const targetDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (targetDate < today) {
        throw new Error('Target date must be in the future');
      }
      return true;
    }),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['Savings', 'Investment', 'Debt Payoff', 'Large Purchase', 'Emergency Fund', 'Retirement', 'Other'])
    .withMessage('Invalid category'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100')
];

exports.validateFinancialAccount = [
  body('name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Account name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Account name must be between 2 and 100 characters'),
  
  body('type')
    .notEmpty()
    .withMessage('Account type is required')
    .isIn(['checking', 'savings', 'credit', 'loan', 'investment', 'other'])
    .withMessage('Invalid account type'),
  
  body('balance')
    .notEmpty()
    .withMessage('Balance is required')
    .isFloat()
    .withMessage('Balance must be a valid number'),
  
  body('accountNumber')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Account number is required')
    .isLength({ min: 4 })
    .withMessage('Account number must be at least 4 characters')
];

exports.validateFinancialTransfer = [
  body('fromAccount')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Source account is required')
    .isMongoId()
    .withMessage('Invalid source account ID'),
  
  body('toAccount')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination account is required')
    .isMongoId()
    .withMessage('Invalid destination account ID')
    .custom((value, { req }) => {
      if (value === req.body.fromAccount) {
        throw new Error('Cannot transfer to the same account');
      }
      return true;
    }),
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
];

// Additional validation for transactions
exports.validateTransaction = [
  body('accountId')
    .notEmpty()
    .withMessage('Account ID is required')
    .isMongoId()
    .withMessage('Invalid account ID'),
  
  body('type')
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(['Credit', 'Debit', 'Transfer'])
    .withMessage('Invalid transaction type'),
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Description must be between 2 and 200 characters'),
  
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string')
];

// Validation for budget
exports.validateBudget = [
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  
  body('limit')
    .notEmpty()
    .withMessage('Budget limit is required')
    .isFloat({ min: 0.01 })
    .withMessage('Budget limit must be greater than 0'),
  
  body('period')
    .notEmpty()
    .withMessage('Period is required')
    .isIn(['weekly', 'monthly', 'yearly'])
    .withMessage('Invalid period. Must be weekly, monthly, or yearly'),
  
  body('spent')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Spent amount must be a positive number')
];