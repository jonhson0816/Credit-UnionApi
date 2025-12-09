const FinancialGoal = require('../models/FinancialGoal');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

// Create a custom error handler
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Financial Goal Controller
exports.getAllGoals = catchAsync(async (req, res) => {
  try {
    const goals = await FinancialGoal.find({
      userId: req.user.id,
      status: { $ne: 'cancelled' }
    }).sort({ targetDate: 1 });
    
    res.status(200).json({
      status: 'success',
      data: goals
    });
  } catch (err) {
    console.error('Error fetching goals:', err);
    res.status(500).json({ message: 'Failed to fetch financial goals', error: err.message });
  }
});

exports.getGoal = catchAsync(async (req, res, next) => {
  try {
    const goal = await FinancialGoal.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!goal) {
      return next(new AppError('No goal found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: goal
    });
  } catch (err) {
    console.error('Error fetching goal:', err);
    res.status(500).json({ message: 'Failed to fetch goal', error: err.message });
  }
});

exports.createGoal = catchAsync(async (req, res, next) => {
  try {
    const { name, targetAmount, targetDate, category, currentAmount, notes } = req.body;
    
    if (!name || !targetAmount || !targetDate || !category) {
      return res.status(400).json({ message: 'Missing required goal details' });
    }

    // Calculate progress
    const parsedTargetAmount = parseFloat(targetAmount);
    const parsedCurrentAmount = parseFloat(currentAmount) || 0;
    const progress = parsedTargetAmount > 0 ? 
      Math.min(100, Math.round((parsedCurrentAmount / parsedTargetAmount) * 100)) : 0;
    
    const newGoal = await FinancialGoal.create({
      userId: req.user.id,
      name,
      targetAmount: parsedTargetAmount,
      currentAmount: parsedCurrentAmount,
      targetDate: new Date(targetDate),
      category,
      notes,
      progress,
      status: 'active'
    });

    res.status(201).json({
      status: 'success',
      data: newGoal
    });
  } catch (err) {
    console.error('Error creating goal:', err);
    res.status(500).json({ message: 'Failed to create financial goal', error: err.message });
  }
});

exports.updateGoal = catchAsync(async (req, res, next) => {
  try {
    const { name, targetAmount, targetDate, category, currentAmount, notes } = req.body;
    
    // Calculate progress if we have both amounts
    let progress;
    if (targetAmount !== undefined && currentAmount !== undefined) {
      const parsedTargetAmount = parseFloat(targetAmount);
      const parsedCurrentAmount = parseFloat(currentAmount);
      progress = parsedTargetAmount > 0 ? 
        Math.min(100, Math.round((parsedCurrentAmount / parsedTargetAmount) * 100)) : 0;
    }

    const allowedUpdates = {
      name, 
      targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : undefined, 
      targetDate: targetDate ? new Date(targetDate) : undefined, 
      category,
      notes,
      currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : undefined,
      progress
    };
    
    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined)
    );
    
    // If updating the current amount, check if it meets or exceeds the target amount
    if (updates.currentAmount !== undefined) {
      const goal = await FinancialGoal.findById(req.params.id);
      if (!goal) {
        return res.status(404).json({ message: 'No goal found with that ID' });
      }
      
      const targetAmount = updates.targetAmount || goal.targetAmount;
      if (updates.currentAmount >= targetAmount) {
        updates.status = 'completed';
      }
    }
    
    const goal = await FinancialGoal.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
        status: { $ne: 'cancelled' }
      },
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!goal) {
      return res.status(404).json({ message: 'No goal found with that ID' });
    }

    res.status(200).json({
      status: 'success',
      data: goal
    });
  } catch (err) {
    console.error('Error updating goal:', err);
    res.status(500).json({ message: 'Failed to update financial goal', error: err.message });
  }
});

exports.deleteGoal = catchAsync(async (req, res, next) => {
  try {
    const goal = await FinancialGoal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!goal) {
      return res.status(404).json({ message: 'No goal found with that ID' });
    }

    res.status(204).json(null);
  } catch (err) {
    console.error('Error deleting goal:', err);
    res.status(500).json({ message: 'Failed to delete financial goal', error: err.message });
  }
});

exports.cancelGoal = catchAsync(async (req, res, next) => {
  try {
    const goal = await FinancialGoal.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
        status: 'active'
      },
      { status: 'cancelled' },
      { new: true }
    );
    
    if (!goal) {
      return res.status(404).json({ message: 'No goal found with that ID or goal already cancelled' });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Financial goal cancelled successfully',
      data: goal
    });
  } catch (err) {
    console.error('Error cancelling goal:', err);
    res.status(500).json({ message: 'Failed to cancel financial goal', error: err.message });
  }
});

exports.updateGoalAmount = catchAsync(async (req, res, next) => {
  try {
    const { currentAmount } = req.body;
    
    if (typeof currentAmount !== 'number' && typeof parseFloat(currentAmount) !== 'number') {
      return res.status(400).json({ message: 'Current amount must be a valid number' });
    }
    
    const parsedAmount = parseFloat(currentAmount);
    if (parsedAmount < 0) {
      return res.status(400).json({ message: 'Current amount must be a positive number' });
    }

    // First fetch the goal to check the target amount
    const existingGoal = await FinancialGoal.findOne({
      _id: req.params.id,
      userId: req.user.id,
      status: { $ne: 'cancelled' }
    });

    if (!existingGoal) {
      return res.status(404).json({ message: 'No goal found with that ID' });
    }

    // Calculate progress
    const progress = existingGoal.targetAmount > 0 ? 
      Math.min(100, Math.round((parsedAmount / existingGoal.targetAmount) * 100)) : 0;
    
    // Check if the new amount meets or exceeds the target
    const updates = { 
      currentAmount: parsedAmount,
      progress
    };
    
    if (parsedAmount >= existingGoal.targetAmount) {
      updates.status = 'completed';
    }

    const goal = await FinancialGoal.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      data: goal
    });
  } catch (err) {
    console.error('Error updating goal amount:', err);
    res.status(500).json({ message: 'Failed to update goal amount', error: err.message });
  }
});

exports.contributeToGoal = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { amount, sourceAccountId } = req.body;
    const parsedAmount = parseFloat(amount);
    
    if (!parsedAmount || parsedAmount <= 0 || !sourceAccountId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid contribution details' });
    }
    
    const goal = await FinancialGoal.findOne({
      _id: req.params.id,
      userId: req.user.id,
      status: 'active'
    }).session(session);
    
    if (!goal) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Financial goal not found' });
    }
    
    const account = await Account.findOne({
      _id: sourceAccountId,
      userId: req.user.id,
      status: 'active'
    }).session(session);
    
    if (!account) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Source account not found' });
    }
    
    if (account.balance < parsedAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient funds in source account' });
    }
    
    // Deduct from source account
    await Account.findByIdAndUpdate(
      sourceAccountId,
      { $inc: { balance: -parsedAmount } }
    ).session(session);
    
    // Calculate if this contribution will complete the goal
    const newAmount = goal.currentAmount + parsedAmount;
    const progress = goal.targetAmount > 0 ? 
      Math.min(100, Math.round((newAmount / goal.targetAmount) * 100)) : 0;
    
    const statusUpdate = newAmount >= goal.targetAmount ? { status: 'completed' } : {};
    
    // Add to goal
    const updatedGoal = await FinancialGoal.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { currentAmount: parsedAmount },
        progress,
        ...statusUpdate
      },
      { new: true }
    ).session(session);
    
    // Create transaction record
    await Transaction.create([{
      userId: req.user.id,
      accountId: sourceAccountId,
      type: 'debit',
      amount: parsedAmount,
      description: `Contribution to goal: ${goal.name}`,
      category: 'Goal Contribution',
      status: 'completed',
      metadata: {
        goalId: goal._id
      }
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({
      status: 'success',
      message: 'Contribution successful',
      data: updatedGoal
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Contribution error:', error);
    res.status(500).json({ message: 'Failed to contribute to goal', error: error.message });
  }
});

exports.getGoalStats = catchAsync(async (req, res) => {
  try {
    // Get all active and completed goals
    const goals = await FinancialGoal.find({
      userId: req.user.id,
      status: { $in: ['active', 'completed'] }
    });
    
    const totalGoals = goals.length;
    const completedGoals = goals.filter(goal => goal.status === 'completed').length;
    const activeGoals = goals.filter(goal => goal.status === 'active').length;
    
    // Calculate overall progress
    const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const overallProgress = totalTargetAmount > 0 ? 
      Math.min(100, Math.round((totalCurrentAmount / totalTargetAmount) * 100)) : 0;
    
    // Calculate time-based metrics
    const now = new Date();
    const upcomingGoals = goals.filter(goal => 
      goal.status === 'active' && goal.targetDate > now
    ).sort((a, b) => a.targetDate - b.targetDate);
    
    const overdueGoals = goals.filter(goal => 
      goal.status === 'active' && goal.targetDate < now
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        totalGoals,
        completedGoals,
        activeGoals,
        overallProgress,
        upcomingGoals: upcomingGoals.slice(0, 3), // Return the 3 most imminent goals
        overdueGoalsCount: overdueGoals.length
      }
    });
  } catch (err) {
    console.error('Error fetching goal stats:', err);
    res.status(500).json({ message: 'Failed to fetch goal statistics', error: err.message });
  }
});

module.exports = exports;