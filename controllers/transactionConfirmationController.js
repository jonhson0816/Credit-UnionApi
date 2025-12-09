// controllers/transactionConfirmationController.js
const TransactionConfirmation = require('../models/TransactionConfirmation');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const mongoose = require('mongoose');

// Create a new transaction confirmation
exports.createConfirmation = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    
    console.log('Creating confirmation with data:', req.body);
    console.log('User ID:', userId);

    const {
      type,
      amount,
      sourceAccount,
      destinationAccount,
      accountNumber,
      recipientName,
      recipientBank,
      routingNumber,
      transferType,
      payeeName,
      billType,
      dueDate,
      memo,
      quantity,
      checkStyle,
      startingNumber,
      shippingAddress,
      deliverySpeed,
      depositMethod,
      withdrawMethod,
      description,
      relatedTransactionId
    } = req.body;

    // Validate required fields
    if (!type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Transaction type and amount are required'
      });
    }

    // Generate unique confirmation number
    const confirmationNumber = TransactionConfirmation.generateConfirmationNumber();

    // Create confirmation
    const confirmation = new TransactionConfirmation({
      userId,
      confirmationNumber,
      transactionType: type,
      amount: parseFloat(amount),
      sourceAccount,
      destinationAccount,
      accountNumber,
      recipientName,
      recipientBank,
      routingNumber,
      transferType,
      payeeName,
      billType,
      dueDate,
      memo,
      quantity,
      checkStyle,
      startingNumber,
      shippingAddress,
      deliverySpeed,
      depositMethod,
      withdrawMethod,
      description,
      relatedTransactionId,
      status: 'completed',
      confirmedAt: new Date(),
      completedAt: new Date(),
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    await confirmation.save();

    console.log('Confirmation created successfully:', confirmationNumber);

    res.status(201).json({
      success: true,
      message: 'Transaction confirmed successfully',
      data: confirmation
    });
  } catch (error) {
    console.error('Error creating transaction confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction confirmation',
      error: error.message
    });
  }
};

// Get confirmation by confirmation number
exports.getConfirmationByNumber = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { confirmationNumber } = req.params;

    const confirmation = await TransactionConfirmation.findOne({
      userId,
      confirmationNumber
    }).populate('relatedTransactionId');

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        message: 'Confirmation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: confirmation
    });
  } catch (error) {
    console.error('Error fetching confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch confirmation',
      error: error.message
    });
  }
};

// Get all confirmations for a user
exports.getUserConfirmations = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { page = 1, limit = 20, status, transactionType } = req.query;

    // Build query
    const query = { userId };
    if (status) query.status = status;
    if (transactionType) query.transactionType = transactionType;

    const confirmations = await TransactionConfirmation.find(query)
      .sort({ confirmedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('relatedTransactionId')
      .exec();

    const count = await TransactionConfirmation.countDocuments(query);

    res.status(200).json({
      success: true,
      data: confirmations,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalConfirmations: count
    });
  } catch (error) {
    console.error('Error fetching user confirmations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch confirmations',
      error: error.message
    });
  }
};

// Mark receipt as downloaded
exports.markReceiptDownloaded = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { confirmationNumber } = req.params;

    const confirmation = await TransactionConfirmation.findOne({
      userId,
      confirmationNumber
    });

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        message: 'Confirmation not found'
      });
    }

    await confirmation.markReceiptDownloaded();

    res.status(200).json({
      success: true,
      message: 'Receipt marked as downloaded',
      data: confirmation
    });
  } catch (error) {
    console.error('Error marking receipt as downloaded:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update receipt status',
      error: error.message
    });
  }
};

// Mark receipt as printed
exports.markReceiptPrinted = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { confirmationNumber } = req.params;

    const confirmation = await TransactionConfirmation.findOne({
      userId,
      confirmationNumber
    });

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        message: 'Confirmation not found'
      });
    }

    await confirmation.markReceiptPrinted();

    res.status(200).json({
      success: true,
      message: 'Receipt marked as printed',
      data: confirmation
    });
  } catch (error) {
    console.error('Error marking receipt as printed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update receipt status',
      error: error.message
    });
  }
};

// Get confirmation statistics
exports.getConfirmationStats = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;

    const stats = await TransactionConfirmation.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalConfirmations = await TransactionConfirmation.countDocuments({ userId });
    const completedConfirmations = await TransactionConfirmation.countDocuments({
      userId,
      status: 'completed'
    });

    res.status(200).json({
      success: true,
      data: {
        byType: stats,
        total: totalConfirmations,
        completed: completedConfirmations
      }
    });
  } catch (error) {
    console.error('Error fetching confirmation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch confirmation statistics',
      error: error.message
    });
  }
};

// Delete a confirmation (admin only or for failed transactions)
exports.deleteConfirmation = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { confirmationNumber } = req.params;

    const confirmation = await TransactionConfirmation.findOne({
      userId,
      confirmationNumber
    });

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        message: 'Confirmation not found'
      });
    }

    // Only allow deletion of failed or cancelled confirmations
    if (confirmation.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed confirmations'
      });
    }

    await confirmation.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Confirmation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete confirmation',
      error: error.message
    });
  }
};