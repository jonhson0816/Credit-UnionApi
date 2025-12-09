const { validationResult } = require('express-validator');

exports.validateTransaction = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
      message: 'Invalid transaction data'
    });
  }
  next();
};

exports.validateTransfer = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
      message: 'Invalid transfer data'
    });
  }
  
  // Additional transfer-specific validation
  const { sourceAccount, destinationAccount } = req.body;
  if (sourceAccount === destinationAccount) {
    return res.status(400).json({
      success: false,
      message: 'Source and destination accounts must be different'
    });
  }
  
  next();
};