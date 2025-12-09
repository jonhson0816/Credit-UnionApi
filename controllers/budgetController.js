const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const FinancialGoal = require('../models/FinancialGoal');
const Account = require('../models/Account');
const mongoose = require('mongoose');

const budgetController = {
  // Create or update a monthly budget
  createOrUpdateBudget: async (req, res) => {
    try {
      const { month, categories, totalBudget, notes } = req.body;
      
      if (!month || !categories || !totalBudget) {
        return res.status(400).json({
          success: false,
          message: 'Missing required budget details'
        });
      }
      
      // Format the month as the first day of the month (YYYY-MM-01)
      const budgetMonth = new Date(month);
      budgetMonth.setDate(1);
      
      // Check if a budget already exists for this month
      let budget = await Budget.findOne({
        userId: req.user._id,
        month: {
          $gte: new Date(budgetMonth.getFullYear(), budgetMonth.getMonth(), 1),
          $lt: new Date(budgetMonth.getFullYear(), budgetMonth.getMonth() + 1, 1)
        }
      });
      
      if (budget) {
        // Update existing budget
        budget.categories = categories;
        budget.totalBudget = totalBudget;
        budget.notes = notes;
        await budget.save();
      } else {
        // Create new budget
        budget = new Budget({
          userId: req.user._id,
          month: budgetMonth,
          categories,
          totalBudget,
          notes
        });
        await budget.save();
      }
      
      res.status(201).json({
        success: true,
        data: budget
      });
    } catch (error) {
      console.error('Budget creation/update error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating/updating budget',
        error: error.message
      });
    }
  },
  
  // Get current month's budget
  getCurrentBudget: async (req, res) => {
    try {
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let budget = await Budget.findOne({
        userId: req.user._id,
        month: {
          $gte: currentMonth,
          $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        },
        status: 'active'
      });
      
      // If no budget exists for current month, return an empty budget structure
      if (!budget) {
        return res.json({
          success: true,
          data: {
            month: currentMonth,
            categories: [],
            totalBudget: 0,
            spent: 0
          }
        });
      }
      
      // Get actual spending for the current month to update category spent values
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      
      const transactions = await Transaction.find({
        userId: req.user._id,
        type: 'debit',
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'completed'
      });
      
      // Calculate spending by category
      const categorySpending = {};
      transactions.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        categorySpending[category] = (categorySpending[category] || 0) + transaction.amount;
      });
      
      // Update budget with actual spending
      const budgetObj = budget.toObject();
      budgetObj.categories = budgetObj.categories.map(category => {
        return {
          ...category,
          spent: categorySpending[category.name] || 0
        };
      });
      
      // Calculate total spending
      budgetObj.spent = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);
      
      res.json({
        success: true,
        data: budgetObj
      });
    } catch (error) {
      console.error('Budget fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching current budget',
        error: error.message
      });
    }
  },
  
  // Get budget for a specific month
  getBudgetByMonth: async (req, res) => {
    try {
      const { year, month } = req.params;
      
      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Year and month are required'
        });
      }
      
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      
      const budget = await Budget.findOne({
        userId: req.user._id,
        month: {
          $gte: startDate,
          $lte: endDate
        },
        status: 'active'
      });
      
      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found for the specified month'
        });
      }
      
      // Get transactions for the month to calculate actual spending
      const transactions = await Transaction.find({
        userId: req.user._id,
        type: 'debit',
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });
      
      // Calculate spending by category
      const categorySpending = {};
      transactions.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        categorySpending[category] = (categorySpending[category] || 0) + transaction.amount;
      });
      
      // Update budget with actual spending
      const budgetObj = budget.toObject();
      budgetObj.categories = budgetObj.categories.map(category => {
        return {
          ...category,
          spent: categorySpending[category.name] || 0
        };
      });
      
      // Calculate total spending
      budgetObj.spent = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);
      
      res.json({
        success: true,
        data: budgetObj
      });
    } catch (error) {
      console.error('Budget fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching budget',
        error: error.message
      });
    }
  },
  
  // Get spending insights
  getSpendingInsights: async (req, res) => {
    try {
      const { months = 3 } = req.query;
      const numMonths = parseInt(months);
      
      if (isNaN(numMonths) || numMonths < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid number of months'
        });
      }
      
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - (numMonths - 1), 1);
      
      // Get all transactions for the period
      const transactions = await Transaction.find({
        userId: req.user._id,
        type: 'debit',
        createdAt: { $gte: startDate },
        status: 'completed'
      });
      
      // Calculate spending by category
      const categorySpending = {};
      transactions.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        categorySpending[category] = (categorySpending[category] || 0) + transaction.amount;
      });
      
      // Format the data for charts
      const spendingByCategory = Object.entries(categorySpending)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      // Calculate monthly spending
      const monthlySpending = {};
      for (let i = 0; i < numMonths; i++) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        monthlySpending[monthKey] = 0;
      }
      
      transactions.forEach(transaction => {
        const date = new Date(transaction.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlySpending[monthKey] !== undefined) {
          monthlySpending[monthKey] += transaction.amount;
        }
      });
      
      // Format monthly spending for charts
      const spendingTrend = Object.entries(monthlySpending)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));
      
      // Get account balances
      const accounts = await Account.find({
        userId: req.user._id,
        status: 'active'
      });
      
      const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
      
      // Calculate cash flow (income vs expenses)
      const incomeTransactions = await Transaction.find({
        userId: req.user._id,
        type: 'credit',
        createdAt: { $gte: startDate },
        status: 'completed'
      });
      
      const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const totalExpenses = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      
      res.json({
        success: true,
        data: {
          totalBalance,
          spendingByCategory,
          spendingTrend,
          cashFlow: {
            income: totalIncome,
            expenses: totalExpenses,
            savings: totalIncome - totalExpenses
          }
        }
      });
    } catch (error) {
      console.error('Spending insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching spending insights',
        error: error.message
      });
    }
  },
  
  // Delete a budget
  deleteBudget: async (req, res) => {
    try {
      const { id } = req.params;
      
      const budget = await Budget.findOneAndUpdate(
        {
          _id: id,
          userId: req.user._id
        },
        { status: 'archived' },
        { new: true }
      );
      
      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Budget deleted successfully'
      });
    } catch (error) {
      console.error('Budget deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting budget',
        error: error.message
      });
    }
  }
};

module.exports = budgetController;