const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountType: {
    type: String,
    required: true,
    enum: ['Checking', 'Savings', 'Credit', 'Investment'],
    index: true
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  routingNumber: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  nickname: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'suspended'],
    default: 'active',  // Fixed: changed from 'completed' to 'active'
    index: true
  },
  interestRate: {
    type: Number,
    required: true,
    default: 0.01
  },
  overdraftProtection: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add compound index for common queries
accountSchema.index({ userId: 1, status: 1 });
accountSchema.index({ accountNumber: 1, userId: 1 });

// Pre-save middleware to trim strings
accountSchema.pre('save', function(next) {
  if (this.accountNumber) this.accountNumber = this.accountNumber.trim();
  if (this.nickname) this.nickname = this.nickname.trim();
  next();
});

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;