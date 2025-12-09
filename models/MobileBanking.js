const mongoose = require('mongoose');

// Helper function to safely get or create model
const getModel = (name, schema) => {
  try {
    // Try to get existing model
    return mongoose.model(name);
  } catch (error) {
    // Model doesn't exist, create it
    return mongoose.model(name, schema);
  }
};

// Account Schema
const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  accountType: {
    type: String,
    required: true,
    enum: ['checking', 'savings', 'credit-card', 'loan', 'investment', 'money-market']
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  balance: {
    available: {
      type: Number,
      required: true,
      default: 0
    },
    current: {
      type: Number,
      required: true,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    }
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD']
  },
  status: {
    type: String,
    enum: ['active', 'frozen', 'closed', 'restricted'],
    default: 'active'
  },
  interestRate: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumBalance: {
    type: Number,
    default: 0
  },
  overdraftProtection: {
    enabled: {
      type: Boolean,
      default: false
    },
    limit: {
      type: Number,
      default: 0
    }
  },
  routingNumber: {
    type: String,
    default: '256074974' // Navy Federal routing number
  },
  openedDate: {
    type: Date,
    default: Date.now
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  alerts: {
    lowBalanceAlert: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 100 }
    },
    largeTransactionAlert: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 500 }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
accountSchema.index({ userId: 1, accountType: 1 });
accountSchema.index({ accountNumber: 1 });
accountSchema.index({ status: 1 });

// Virtual for masked account number
accountSchema.virtual('maskedAccountNumber').get(function() {
  const lastFour = this.accountNumber.slice(-4);
  return `****${lastFour}`;
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  transactionType: {
    type: String,
    required: true,
    enum: [
      'deposit',
      'withdrawal',
      'transfer',
      'payment',
      'purchase',
      'refund',
      'fee',
      'interest',
      'check-deposit',
      'atm-withdrawal',
      'direct-deposit',
      'bill-payment',
      'mobile-deposit'
    ]
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'groceries',
      'dining',
      'shopping',
      'entertainment',
      'gas',
      'utilities',
      'healthcare',
      'travel',
      'education',
      'income',
      'transfer',
      'other'
    ],
    default: 'other'
  },
  merchant: {
    name: String,
    location: String,
    category: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  transactionDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  postedDate: {
    type: Date
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringPayment'
  },
  checkImage: {
    front: String,
    back: String
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ accountId: 1, transactionDate: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ transactionType: 1 });
transactionSchema.index({ category: 1 });

// Transfer Schema
const transferSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fromAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  toAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  transferType: {
    type: String,
    enum: ['internal', 'external', 'wire', 'ach'],
    default: 'internal'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  scheduledDate: {
    type: Date,
    default: Date.now
  },
  completedDate: {
    type: Date
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly']
  },
  nextRecurringDate: {
    type: Date
  },
  externalAccount: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    accountHolderName: String
  },
  fees: {
    type: Number,
    default: 0
  },
  confirmationNumber: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes
transferSchema.index({ userId: 1, createdAt: -1 });
transferSchema.index({ status: 1 });
transferSchema.index({ scheduledDate: 1 });

// Bill Payment Schema
const billPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  payee: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    phoneNumber: String,
    category: {
      type: String,
      enum: ['utilities', 'credit-card', 'loan', 'rent', 'insurance', 'subscription', 'other'],
      default: 'other'
    }
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  paymentDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'scheduled'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly']
  },
  nextPaymentDate: {
    type: Date
  },
  deliveryMethod: {
    type: String,
    enum: ['electronic', 'check'],
    default: 'electronic'
  },
  confirmationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  memo: {
    type: String,
    trim: true,
    maxlength: 100
  }
}, {
  timestamps: true
});

// Indexes
billPaymentSchema.index({ userId: 1, paymentDate: -1 });
billPaymentSchema.index({ status: 1 });

// Mobile Check Deposit Schema
const mobileDepositSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  checkNumber: {
    type: String,
    trim: true
  },
  checkImages: {
    front: {
      type: String,
      required: true
    },
    back: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  depositDate: {
    type: Date,
    default: Date.now
  },
  availableDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  reviewNotes: {
    type: String,
    trim: true
  },
  confirmationNumber: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes
mobileDepositSchema.index({ userId: 1, createdAt: -1 });
mobileDepositSchema.index({ status: 1 });

// Account Alert Schema
const accountAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  alertType: {
    type: String,
    required: true,
    enum: [
      'low-balance',
      'large-transaction',
      'unusual-activity',
      'payment-due',
      'deposit-received',
      'transfer-completed',
      'security-alert',
      'maintenance'
    ]
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String,
    trim: true
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
accountAlertSchema.index({ userId: 1, createdAt: -1 });
accountAlertSchema.index({ isRead: 1 });
accountAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create or get models safely
const Account = getModel('Account', accountSchema);
const Transaction = getModel('Transaction', transactionSchema);
const Transfer = getModel('Transfer', transferSchema);
const BillPayment = getModel('BillPayment', billPaymentSchema);
const MobileDeposit = getModel('MobileDeposit', mobileDepositSchema);
const AccountAlert = getModel('AccountAlert', accountAlertSchema);

module.exports = {
  Account,
  Transaction,
  Transfer,
  BillPayment,
  MobileDeposit,
  AccountAlert
};