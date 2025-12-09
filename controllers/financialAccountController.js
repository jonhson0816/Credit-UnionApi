const FinancialAccount = require('../models/FinancialAccount');
const FinancialTransfer = require('../models/FinancialTransfer');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllAccounts = catchAsync(async (req, res) => {
  const accounts = await FinancialAccount.find({ userId: req.user.id });
  
  res.status(200).json({
    status: 'success',
    results: accounts.length,
    data: accounts
  });
});

exports.getAccount = catchAsync(async (req, res, next) => {
  const account = await FinancialAccount.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!account) {
    return next(new AppError('No account found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: account
  });
});

exports.createAccount = catchAsync(async (req, res) => {
  const newAccount = await FinancialAccount.create({
    ...req.body,
    userId: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: newAccount
  });
});

exports.updateAccount = catchAsync(async (req, res, next) => {
  const account = await FinancialAccount.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user.id
    },
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!account) {
    return next(new AppError('No account found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: account
  });
});

exports.deleteAccount = catchAsync(async (req, res, next) => {
  const account = await FinancialAccount.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!account) {
    return next(new AppError('No account found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getAccountStats = catchAsync(async (req, res) => {
  const stats = await FinancialAccount.aggregate([
    {
      $match: { userId: req.user.id }
    },
    {
      $group: {
        _id: null,
        totalAccounts: { $sum: 1 },
        totalBalance: { $sum: '$balance' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: stats[0] || {
      totalAccounts: 0,
      totalBalance: 0
    }
  });
});