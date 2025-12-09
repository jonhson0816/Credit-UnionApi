const mongoose = require('mongoose');

const loanPaymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  principalPayment: {
    type: Number,
    required: true
  },
  interestPayment: {
    type: Number,
    required: true
  },
  totalPayment: {
    type: Number,
    required: true
  },
  remainingBalance: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'pending', 'paid', 'late', 'missed'],
    default: 'scheduled'
  },
  paidDate: Date,
  paidAmount: Number
}, { _id: false });

const loanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  loanType: {
    type: String,
    required: true,
    enum: ['personal', 'auto', 'home', 'mortgage', 'student', 'business', 'debt-consolidation']
  },
  loanPurpose: {
    type: String,
    required: true
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 100
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  termMonths: {
    type: Number,
    required: true,
    min: 1
  },
  monthlyPayment: {
    type: Number,
    required: true
  },
  totalInterest: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'paid-off', 'defaulted', 'rejected'],
    default: 'pending'
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  amortizationSchedule: [loanPaymentSchema],
  currentBalance: {
    type: Number,
    required: true
  },
  paymentsMade: {
    type: Number,
    default: 0
  },
  paymentsRemaining: {
    type: Number,
    required: true
  },
  nextPaymentDate: {
    type: Date
  },
  nextPaymentAmount: {
    type: Number
  },
  lastPaymentDate: Date,
  applicationDetails: {
    employmentStatus: String,
    annualIncome: Number,
    monthlyDebts: Number,
    creditScore: Number,
    collateralValue: Number,
    collateralDescription: String
  },
  extraPayments: [{
    amount: Number,
    date: Date,
    appliedToPrincipal: Number,
    newBalance: Number
  }],
  notes: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  rejectionReason: String
}, {
  timestamps: true
});

// Indexes for performance
loanSchema.index({ userId: 1, status: 1 });
loanSchema.index({ status: 1, nextPaymentDate: 1 });
loanSchema.index({ loanType: 1 });

// Add loanNumber field if it doesn't exist
if (!loanSchema.path('loanNumber')) {
  loanSchema.add({
    loanNumber: {
      type: String,
      unique: true,
      sparse: true  // This allows multiple null values
    }
  });
}

// Pre-save hook to generate loanNumber
loanSchema.pre('save', async function(next) {
  if (!this.loanNumber && this.isNew) {
    // Generate unique loan number: LN-YYYYMMDD-RANDOM
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.loanNumber = `LN-${date}-${random}`;
  }
  next();
});

// Calculate monthly payment using loan formula
loanSchema.statics.calculateMonthlyPayment = function(principal, annualRate, months) {
  const monthlyRate = annualRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return principal / months;
  }
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                  (Math.pow(1 + monthlyRate, months) - 1);
  
  return Math.round(payment * 100) / 100;
};

// Generate amortization schedule
loanSchema.statics.generateAmortizationSchedule = function(principal, annualRate, months, startDate) {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, months);
  
  const schedule = [];
  let balance = principal;
  const start = new Date(startDate);
  
  for (let i = 1; i <= months; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    
    // Calculate payment date (add i months to start date)
    const paymentDate = new Date(start);
    paymentDate.setMonth(paymentDate.getMonth() + i);
    
    schedule.push({
      paymentNumber: i,
      paymentDate,
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      totalPayment: monthlyPayment,
      remainingBalance: Math.max(0, Math.round(balance * 100) / 100),
      status: 'scheduled'
    });
  }
  
  return schedule;
};

// Calculate total interest
loanSchema.statics.calculateTotalInterest = function(principal, annualRate, months) {
  const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, months);
  const totalAmount = monthlyPayment * months;
  return Math.round((totalAmount - principal) * 100) / 100;
};

// Instance method to make a payment
loanSchema.methods.makePayment = function(amount, paymentDate = new Date()) {
  const payment = this.amortizationSchedule[this.paymentsMade];
  
  if (!payment) {
    throw new Error('No scheduled payment found');
  }
  
  if (amount < payment.totalPayment) {
    throw new Error(`Payment amount must be at least $${payment.totalPayment}`);
  }
  
  payment.status = 'paid';
  payment.paidDate = paymentDate;
  payment.paidAmount = amount;
  
  this.paymentsMade += 1;
  this.paymentsRemaining -= 1;
  this.currentBalance = payment.remainingBalance;
  this.lastPaymentDate = paymentDate;
  
  // Set next payment details
  if (this.paymentsRemaining > 0) {
    const nextPayment = this.amortizationSchedule[this.paymentsMade];
    this.nextPaymentDate = nextPayment.paymentDate;
    this.nextPaymentAmount = nextPayment.totalPayment;
  } else {
    this.status = 'paid-off';
    this.nextPaymentDate = null;
    this.nextPaymentAmount = null;
  }
  
  return this.save();
};

// Instance method to apply extra payment
loanSchema.methods.applyExtraPayment = function(amount, date = new Date()) {
  if (amount <= 0) {
    throw new Error('Extra payment must be positive');
  }
  
  const appliedToPrincipal = amount;
  this.currentBalance -= appliedToPrincipal;
  
  this.extraPayments.push({
    amount,
    date,
    appliedToPrincipal,
    newBalance: this.currentBalance
  });
  
  // Recalculate remaining payments
  const remainingMonths = this.paymentsRemaining;
  if (this.currentBalance <= 0) {
    this.status = 'paid-off';
    this.currentBalance = 0;
    this.paymentsRemaining = 0;
  }
  
  return this.save();
};

const Loan = mongoose.model('Loan', loanSchema);

module.exports = Loan;