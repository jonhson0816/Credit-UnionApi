const mongoose = require('mongoose');

const financialAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxLength: [100, 'Account name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['checking', 'savings', 'credit', 'loan', 'investment', 'other']
  },
  balance: {
    type: Number,
    required: [true, 'Balance is required']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true
  },
  available: {
    type: Number
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

const FinancialAccount = mongoose.model('FinancialAccount', financialAccountSchema);

module.exports = FinancialAccount;