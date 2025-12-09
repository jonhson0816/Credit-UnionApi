const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  month: {
    type: Date,
    required: true
  },
  categories: [{
    name: {
      type: String,
      required: true
    },
    limit: {
      type: Number,
      required: true
    },
    spent: {
      type: Number,
      default: 0
    }
  }],
  totalBudget: {
    type: Number,
    required: true
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient querying
budgetSchema.index({ userId: 1, month: 1 });

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;