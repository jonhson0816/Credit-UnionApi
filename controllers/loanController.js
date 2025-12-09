const Loan = require('../models/Loan');
const User = require('../models/User');
const mongoose = require('mongoose');

const loanController = {
  // Calculate loan details without saving
  calculateLoan: async (req, res) => {
    try {
      const { principalAmount, interestRate, termMonths, startDate } = req.body;

      // Validation
      if (!principalAmount || !interestRate || !termMonths) {
        return res.status(400).json({
          success: false,
          message: 'Principal amount, interest rate, and term are required'
        });
      }

      const principal = parseFloat(principalAmount);
      const rate = parseFloat(interestRate);
      const months = parseInt(termMonths);

      if (principal <= 0 || rate < 0 || months <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid loan parameters'
        });
      }

      // Calculate loan details
      const monthlyPayment = Loan.calculateMonthlyPayment(principal, rate, months);
      const totalInterest = Loan.calculateTotalInterest(principal, rate, months);
      const totalAmount = principal + totalInterest;

      // Generate amortization schedule
      const start = startDate ? new Date(startDate) : new Date();
      const amortizationSchedule = Loan.generateAmortizationSchedule(principal, rate, months, start);

      // Calculate end date
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + months);

      res.json({
        success: true,
        data: {
          principalAmount: principal,
          interestRate: rate,
          termMonths: months,
          monthlyPayment,
          totalInterest,
          totalAmount,
          startDate: start,
          endDate,
          amortizationSchedule
        }
      });
    } catch (error) {
      console.error('Calculate Loan Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate loan',
        error: error.message
      });
    }
  },

  // Create/Apply for a new loan
createLoan: async (req, res) => {
  try {
    const {
      loanType,
      loanPurpose,
      principalAmount,
      interestRate,
      termMonths,
      accountId,
      startDate,
      applicationDetails
    } = req.body;

    // Validation
    if (!loanType || !loanPurpose || !principalAmount || !interestRate || !termMonths) {
      return res.status(400).json({
        success: false,
        message: 'All required loan fields must be provided'
      });
    }

    const principal = parseFloat(principalAmount);
    const rate = parseFloat(interestRate);
    const months = parseInt(termMonths);

    // Calculate loan details
    const monthlyPayment = Loan.calculateMonthlyPayment(principal, rate, months);
    const totalInterest = Loan.calculateTotalInterest(principal, rate, months);
    const totalAmount = principal + totalInterest;

    const start = startDate ? new Date(startDate) : new Date();
    const amortizationSchedule = Loan.generateAmortizationSchedule(principal, rate, months, start);

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    // Generate unique loan number
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const loanNumber = `LN-${date}-${random}`;

    // Create loan with loanNumber
    const loan = await Loan.create({
      userId: req.user._id,
      loanNumber,  // Add this field
      loanType,
      loanPurpose,
      principalAmount: principal,
      interestRate: rate,
      termMonths: months,
      monthlyPayment,
      totalInterest,
      totalAmount,
      startDate: start,
      endDate,
      accountId: accountId || null,
      amortizationSchedule,
      currentBalance: principal,
      paymentsRemaining: months,
      nextPaymentDate: amortizationSchedule[0].paymentDate,
      nextPaymentAmount: monthlyPayment,
      applicationDetails: applicationDetails || {}
    });

    console.log('Loan created:', {
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      userId: req.user._id,
      principal,
      monthlyPayment
    });

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      data: loan
    });
  } catch (error) {
    console.error('Create Loan Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create loan',
      error: error.message
    });
  }
},

  // Get all user loans
  getLoans: async (req, res) => {
    try {
      const { status, loanType } = req.query;

      const query = { userId: req.user._id };
      if (status) query.status = status;
      if (loanType) query.loanType = loanType;

      const loans = await Loan.find(query)
        .sort('-createdAt')
        .lean();

      res.json({
        success: true,
        data: loans
      });
    } catch (error) {
      console.error('Get Loans Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loans',
        error: error.message
      });
    }
  },

  // Get single loan by ID
  getLoanById: async (req, res) => {
    try {
      const { loanId } = req.params;

      const loan = await Loan.findOne({
        _id: loanId,
        userId: req.user._id
      }).lean();

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      res.json({
        success: true,
        data: loan
      });
    } catch (error) {
      console.error('Get Loan Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loan',
        error: error.message
      });
    }
  },

  // Make a loan payment
  makePayment: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { loanId } = req.params;
      const { amount, accountId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid payment amount is required'
        });
      }

      const loan = await Loan.findOne({
        _id: loanId,
        userId: req.user._id
      }).session(session);

      if (!loan) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      if (loan.status !== 'active') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Loan is not active'
        });
      }

      // Deduct from account if accountId provided
      if (accountId) {
        const user = await User.findById(req.user._id).session(session);
        const account = user.accounts.find(acc => 
          acc._id.toString() === accountId.toString() && acc.status === 'active'
        );

        if (!account) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({
            success: false,
            message: 'Account not found'
          });
        }

        if (account.balance < amount) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Insufficient funds'
          });
        }

        // Deduct payment from account
        await User.findOneAndUpdate(
          {
            _id: req.user._id,
            'accounts._id': accountId
          },
          {
            $inc: { 'accounts.$.balance': -amount }
          },
          { session }
        );
      }

      // Make payment on loan
      await loan.makePayment(amount);

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: loan
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Make Payment Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process payment'
      });
    }
  },

  // Make extra payment to principal
  makeExtraPayment: async (req, res) => {
    try {
      const { loanId } = req.params;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid extra payment amount is required'
        });
      }

      const loan = await Loan.findOne({
        _id: loanId,
        userId: req.user._id
      });

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      await loan.applyExtraPayment(amount);

      res.json({
        success: true,
        message: 'Extra payment applied successfully',
        data: loan
      });
    } catch (error) {
      console.error('Extra Payment Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to apply extra payment'
      });
    }
  },

  // Get loan summary/statistics
  getLoanSummary: async (req, res) => {
    try {
      const loans = await Loan.find({ userId: req.user._id }).lean();

      const summary = {
        totalLoans: loans.length,
        activeLoans: loans.filter(l => l.status === 'active').length,
        pendingLoans: loans.filter(l => l.status === 'pending').length,
        paidOffLoans: loans.filter(l => l.status === 'paid-off').length,
        totalBorrowed: loans.reduce((sum, l) => sum + l.principalAmount, 0),
        totalOwed: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.currentBalance, 0),
        totalInterestPaid: loans.reduce((sum, l) => sum + (l.principalAmount * l.paymentsMade / l.termMonths * l.interestRate / 100), 0),
        monthlyPaymentsDue: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.monthlyPayment, 0)
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get Loan Summary Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loan summary',
        error: error.message
      });
    }
  }
};

module.exports = loanController;