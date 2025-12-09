const FinancialTransfer = require('../models/FinancialTransfer');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

// Get all transfers for the authenticated user
exports.getTransfers = catchAsync(async (req, res) => {
  const transfers = await FinancialTransfer.find({ userId: req.user._id })
    .sort({ date: -1 })
    .limit(50);
  
  res.status(200).json({
    status: 'success',
    results: transfers.length,
    data: transfers
  });
});

// Get a specific transfer by ID
exports.getTransfer = catchAsync(async (req, res, next) => {
  const transfer = await FinancialTransfer.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!transfer) {
    return next(new AppError('No transfer found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: transfer
  });
});

// Create a new transfer
exports.createTransfer = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { fromAccount, toAccount, amount, description } = req.body;
    
    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required fields'
      });
    }
    
    // Convert amount to number and validate
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid transfer amount'
      });
    }
    
    // Handle external accounts
    let fromAccountId = null;
    let toAccountId = null;
    
    // Check if transfers are external
    const isFromExternal = fromAccount === 'External Account' || fromAccount === 'Payroll Deposit';
    const isToExternal = toAccount === 'External Account' || toAccount === 'Rent Payment' || toAccount === 'Utility Payment';
    
    // Fetch the user with their accounts
    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('User not found', 404));
    }
    
    // Handle internal account transfers
    if (!isFromExternal) {
      // Find the fromAccount in user's accounts
      const sourceAccount = user.accounts.find(acc => 
        `${acc.accountType} Account` === fromAccount
      );
      
      if (!sourceAccount) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError('Source account not found', 404));
      }
      
      if (sourceAccount.balance < transferAmount) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError('Insufficient funds', 400));
      }
      
      fromAccountId = sourceAccount._id;
      // Deduct amount from source account
      sourceAccount.balance -= transferAmount;
    }
    
    if (!isToExternal) {
      // Find the toAccount in user's accounts
      const destinationAccount = user.accounts.find(acc => 
        `${acc.accountType} Account` === toAccount
      );
      
      if (!destinationAccount) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError('Destination account not found', 404));
      }
      
      toAccountId = destinationAccount._id;
      // Add amount to destination account
      destinationAccount.balance += transferAmount;
    }
    
    // Create the transfer record
    const transfer = new FinancialTransfer({
      userId: req.user._id,
      from: fromAccount,
      to: toAccount,
      fromAccountId,
      toAccountId,
      amount: transferAmount,
      description: description || 'Transfer',
      date: new Date(),
      isExternal: isFromExternal || isToExternal
    });
    
    await transfer.save({ session });
    await user.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({
      status: 'success',
      data: transfer
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    return next(error);
  }
});

// Get transfer statistics
exports.getTransferStats = catchAsync(async (req, res) => {
  const stats = await FinancialTransfer.aggregate([
    {
      $match: { userId: req.user._id }
    },
    {
      $group: {
        _id: null,
        totalTransfers: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: stats[0] || {
      totalTransfers: 0,
      totalAmount: 0,
      avgAmount: 0
    }
  });
});