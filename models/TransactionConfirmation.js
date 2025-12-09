// models/TransactionConfirmation.js
const mongoose = require('mongoose');

const transactionConfirmationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  confirmationNumber: {
    type: String,
    required: true,
    unique: true,
    // index: true
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['Deposit', 'Transfer', 'Withdrawal', 'Bill Payment', 'Check Order']
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Source and Destination Details
  sourceAccount: {
    type: String
  },
  destinationAccount: {
    type: String
  },
  accountNumber: {
    type: String
  },
  
  // Transfer Details
  recipientName: {
    type: String
  },
  recipientBank: {
    type: String
  },
  routingNumber: {
    type: String
  },
  transferType: {
    type: String,
    enum: ['domestic', 'international', 'wire']
  },
  
  // Bill Payment Details
  payeeName: {
    type: String
  },
  billType: {
    type: String,
    enum: ['utility', 'credit-card', 'phone', 'insurance', 'other']
  },
  dueDate: {
    type: Date
  },
  memo: {
    type: String
  },
  
  // Check Order Details
  quantity: {
    type: Number
  },
  checkStyle: {
    type: String,
    enum: ['standard', 'premium', 'designer']
  },
  startingNumber: {
    type: String
  },
  shippingAddress: {
    type: String
  },
  deliverySpeed: {
    type: String,
    enum: ['standard', 'expedited', 'overnight']
  },
  
  // Deposit/Withdrawal Details
  depositMethod: {
    type: String,
    enum: ['cash', 'check', 'wire', 'mobile']
  },
  withdrawMethod: {
    type: String,
    enum: ['atm', 'branch', 'check']
  },
  
  // General Details
  description: {
    type: String
  },
  
  // Timestamps
  confirmedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  
  // Receipt Information
  receiptDownloaded: {
    type: Boolean,
    default: false
  },
  receiptPrinted: {
    type: Boolean,
    default: false
  },
  
  // Related Transaction
  relatedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  }
}, {
  timestamps: true
});

// Index for faster queries
transactionConfirmationSchema.index({ userId: 1, confirmedAt: -1 });
transactionConfirmationSchema.index({ status: 1 });

// Method to generate confirmation number
transactionConfirmationSchema.statics.generateConfirmationNumber = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
};

// Method to mark as completed
transactionConfirmationSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to mark receipt as downloaded
transactionConfirmationSchema.methods.markReceiptDownloaded = function() {
  this.receiptDownloaded = true;
  return this.save();
};

// Method to mark receipt as printed
transactionConfirmationSchema.methods.markReceiptPrinted = function() {
  this.receiptPrinted = true;
  return this.save();
};

const TransactionConfirmation = mongoose.model('TransactionConfirmation', transactionConfirmationSchema);

module.exports = TransactionConfirmation;