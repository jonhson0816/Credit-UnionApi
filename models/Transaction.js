// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  description: {
    type: String,
    default: 'Transaction'
  },
  category: {
    type: String,
    enum: ['Deposit', 'Withdrawal', 'Transfer', 'Payment', 'Fee', 'Interest', 'Reversal'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  balance: {
    type: Number,
    required: true,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  relatedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  fee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ============ NEW FIELDS FOR COMPLETE TRANSACTION DETAILS ============
  
  // Source Account Details (FROM)
  sourceAccountNumber: {
    type: String,
    required: true
  },
  sourceAccountType: {
    type: String,
    default: 'Checking'
  },
  sourceAccountHolderName: {
    type: String,
    required: true
  },
  sourceRoutingNumber: {
    type: String,
    default: '256074974' // Navy Federal routing number
  },
  
  // Destination Account Details (TO) - For Transfers/Payments
  destinationAccountNumber: {
    type: String,
    default: null
  },
  destinationAccountHolderName: {
    type: String,
    default: null
  },
  destinationBank: {
    type: String,
    default: null
  },
  destinationRoutingNumber: {
    type: String,
    default: null
  },
  
  // Transaction Method Details
  transactionMethod: {
    type: String,
    enum: ['cash', 'check', 'wire', 'mobile', 'atm', 'branch', 'online', 'ach', 'card'],
    default: 'online'
  },
  
  // Payment/Bill Details (for Bill Payments)
  payeeName: {
    type: String,
    default: null
  },
  payeeAccountNumber: {
    type: String,
    default: null
  },
  billType: {
    type: String,
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  
  // Confirmation Details
  confirmationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Location/Device Info (for security)
  initiatedFrom: {
    type: String,
    enum: ['web', 'mobile', 'atm', 'branch', 'phone'],
    default: 'web'
  },
  
  // Additional metadata
  memo: {
    type: String,
    default: null
  }
  
}, {
  timestamps: true
});

// Compound indexes for efficient queries
transactionSchema.index({ userId: 1, accountId: 1, createdAt: -1 });
transactionSchema.index({ accountId: 1, date: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ confirmationNumber: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;