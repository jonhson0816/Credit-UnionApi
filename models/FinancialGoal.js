const mongoose = require('mongoose');

const financialGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A financial goal must belong to a user']
  },
  name: {
    type: String,
    required: [true, 'A financial goal must have a name'],
    trim: true,
    maxlength: [100, 'A financial goal name must have less than or equal to 100 characters']
  },
  targetAmount: {
    type: Number,
    required: [true, 'A financial goal must have a target amount'],
    min: [0, 'Target amount cannot be negative']
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative']
  },
  targetDate: {
    type: Date,
    required: [true, 'A financial goal must have a target date']
  },
  category: {
    type: String,
    required: [true, 'A financial goal must have a category'],
    enum: {
      values: ['Savings', 'Checking', 'Investment', 'Debt Payoff', 'Large Purchase', 'Emergency Fund', 'Retirement', 'Other', 'Education', 'House', 'Car', 'Travel', 'Emergency', 'Debt'],
      message: 'Category is not valid'
    }
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'completed', 'cancelled'],
      message: 'Status is either: active, completed, or cancelled'
    },
    default: 'active'
  },
  linkedAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0
  }
});

// Middleware to update the updatedAt field on save
financialGoalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate progress
  if (this.targetAmount > 0) {
    this.progress = Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
  }
  
  next();
});

// Middleware to update the updatedAt field on update
financialGoalSchema.pre(/^findOneAndUpdate/, function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const FinancialGoal = mongoose.model('FinancialGoal', financialGoalSchema);

module.exports = FinancialGoal;