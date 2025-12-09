const {
  Account,
  Transaction,
  Transfer,
  BillPayment,
  MobileDeposit,
  AccountAlert
} = require('../models/MobileBanking');

// ==================== ACCOUNTS ====================

// Get all user accounts - USE USER'S EMBEDDED ACCOUNTS
exports.getAccounts = async (req, res) => {
  try {
    const User = require('../models/User');
    
    console.log('Mobile Banking - Getting accounts for user:', req.user._id);
    
    // Get user with embedded accounts
    const user = await User.findById(req.user._id)
      .select('accounts')
      .lean();

    if (!user || !user.accounts || user.accounts.length === 0) {
      console.log('No accounts found for user');
      return res.status(200).json({
        success: true,
        data: [],
        summary: {
          totalBalance: 0,
          totalAccounts: 0
        }
      });
    }

    // Filter active accounts and transform to mobile banking format
    const accounts = user.accounts
      .filter(acc => acc.status === 'active')
      .map(acc => {
        const balance = acc.balance || 0;
        return {
          _id: acc._id,
          accountName: acc.accountType,
          accountNumber: acc.accountNumber,
          routingNumber: acc.routingNumber || '256074974',
          accountType: acc.accountType.toLowerCase(),
          balance: {
            available: balance,
            current: balance,
            pending: 0
          },
          status: acc.status || 'active',
          isPrimary: false,
          maskedAccountNumber: `****${(acc.accountNumber || '').slice(-4)}`
        };
      });

    // Calculate total balance
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance.available, 0);

    console.log('Mobile Banking - Accounts loaded:', {
      userId: req.user._id,
      accountsCount: accounts.length,
      totalBalance,
      accounts: accounts.map(a => ({ id: a._id, type: a.accountType, balance: a.balance.available }))
    });

    res.status(200).json({
      success: true,
      data: accounts,
      summary: {
        totalBalance,
        totalAccounts: accounts.length
      }
    });
  } catch (error) {
    console.error('Get Accounts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts',
      error: error.message
    });
  }
};

// Get single account details
exports.getAccountById = async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({
      _id: accountId,
      userId: req.user._id
    }).lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({
      accountId,
      userId: req.user._id
    })
      .sort('-transactionDate')
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...account,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get Account Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account',
      error: error.message
    });
  }
};

// Update account settings
exports.updateAccountSettings = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { accountName, alerts, isPrimary } = req.body;

    const account = await Account.findOne({
      _id: accountId,
      userId: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Update fields
    if (accountName) account.accountName = accountName;
    if (alerts) account.alerts = { ...account.alerts, ...alerts };
    if (isPrimary !== undefined) {
      // If setting as primary, remove primary from other accounts
      if (isPrimary) {
        await Account.updateMany(
          { userId: req.user._id, _id: { $ne: accountId } },
          { isPrimary: false }
        );
      }
      account.isPrimary = isPrimary;
    }

    await account.save();

    res.status(200).json({
      success: true,
      message: 'Account settings updated',
      data: account
    });
  } catch (error) {
    console.error('Update Account Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account',
      error: error.message
    });
  }
};

// ==================== TRANSACTIONS ====================

// Get transaction history
exports.getTransactions = async (req, res) => {
  try {
    const {
      accountId,
      startDate,
      endDate,
      type,
      category,
      status,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (accountId) query.accountId = accountId;
    if (type) query.transactionType = type;
    if (category) query.category = category;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort('-transactionDate')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('accountId', 'accountName accountNumber accountType')
      .lean();

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user._id
    })
      .populate('accountId', 'accountName accountNumber accountType')
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get Transaction Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message
    });
  }
};

// Get spending analytics
exports.getSpendingAnalytics = async (req, res) => {
  try {
    const { accountId, startDate, endDate } = req.query;

    const matchQuery = {
      userId: req.user._id,
      status: 'completed'
    };

    if (accountId) matchQuery.accountId = accountId;
    if (startDate || endDate) {
      matchQuery.transactionDate = {};
      if (startDate) matchQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) matchQuery.transactionDate.$lte = new Date(endDate);
    }

    // CRITICAL FIX: Get spending data correctly
    const categorySpending = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          total: { $sum: { $abs: '$amount' } }, // Use absolute value
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Calculate total spending (absolute values)
    const totalSpending = categorySpending.reduce((sum, cat) => sum + Math.abs(cat.total), 0);

    // Get daily spending trend
    const dailyTrend = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' }
          },
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('Analytics calculated:', {
      totalSpending,
      categoriesCount: categorySpending.length
    });

    res.status(200).json({
      success: true,
      data: {
        totalSpending,
        categoryBreakdown: categorySpending,
        dailyTrend
      }
    });
  } catch (error) {
    console.error('Get Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

// ==================== TRANSFERS ====================

// Create transfer
// Create transfer
exports.createTransfer = async (req, res) => {
  try {
    const {
      fromAccountId,
      toAccountId,
      toAccountNumber,      // NEW: External account number
      toBankName,           // NEW: External bank name
      toRoutingNumber,      // NEW: External routing number
      toAccountHolderName,  // NEW: External account holder
      amount,
      description,
      transferType,         // NEW: 'internal' or 'external'
      scheduledDate,
      isRecurring,
      recurringFrequency
    } = req.body;

    // Validation
    if (!fromAccountId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Source account and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than zero'
      });
    }

    // Determine transfer type
    const isExternal = transferType === 'external' || toAccountNumber;

    // Validate based on transfer type
    if (isExternal) {
      // External transfer validation
      if (!toAccountNumber || !toBankName || !toRoutingNumber || !toAccountHolderName) {
        return res.status(400).json({
          success: false,
          message: 'External transfers require account number, bank name, routing number, and account holder name'
        });
      }

      // Basic validation for account number (US bank accounts are typically 4-17 digits)
      if (!/^\d{4,17}$/.test(toAccountNumber.replace(/\s/g, ''))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account number format. Must be 4-17 digits.'
        });
      }

      // Basic validation for routing number (US routing numbers are 9 digits)
      if (!/^\d{9}$/.test(toRoutingNumber.replace(/\s/g, ''))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid routing number format. Must be 9 digits.'
        });
      }
    } else {
      // Internal transfer validation
      if (!toAccountId) {
        return res.status(400).json({
          success: false,
          message: 'Destination account is required for internal transfers'
        });
      }
    }

    // Check from account - USE USER'S EMBEDDED ACCOUNTS
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    console.log('Transfer - Looking for account:', {
      userId: req.user._id,
      fromAccountId,
      userAccountsCount: user?.accounts?.length
    });
    
    if (!user || !user.accounts || user.accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No accounts found'
      });
    }

    const fromAccount = user.accounts.find(acc => 
      acc._id.toString() === fromAccountId.toString() && acc.status === 'active'
    );

    if (!fromAccount) {
      console.log('Source account not found. Available accounts:', 
        user.accounts.map(a => ({ id: a._id, status: a.status }))
      );
      return res.status(404).json({
        success: false,
        message: 'Source account not found',
        debug: {
          requestedId: fromAccountId,
          availableAccounts: user.accounts.map(a => a._id.toString())
        }
      });
    }

    const availableBalance = fromAccount.balance || 0;
    
    console.log('Source account found:', {
      accountId: fromAccount._id,
      accountType: fromAccount.accountType,
      balance: availableBalance,
      requestedAmount: amount
    });
    
    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds',
        details: {
          availableBalance,
          requestedAmount: amount
        }
      });
    }

    // For internal transfers, check destination account exists
    let toAccount = null;
    let toUser = null;
    
    if (!isExternal) {
      // Check in same user's accounts first
      toAccount = user.accounts.find(acc => 
        acc._id.toString() === toAccountId.toString() && acc.status === 'active'
      );
      
      if (toAccount) {
        toUser = user;
        console.log('Destination account found in same user');
      } else {
        // Try to find in another user's accounts
        toUser = await User.findOne({
          'accounts._id': toAccountId,
          'accounts.status': 'active'
        });
        
        if (toUser) {
          toAccount = toUser.accounts.find(acc => 
            acc._id.toString() === toAccountId.toString()
          );
          console.log('Destination account found in different user');
        }
      }
      
      if (!toAccount) {
        return res.status(404).json({
          success: false,
          message: 'Destination account not found'
        });
      }
    }

    // Create transfer with external account details
    const transfer = await Transfer.create({
      userId: req.user._id,
      fromAccountId,
      toAccountId: isExternal ? null : toAccountId,
      amount,
      description: description || (isExternal 
        ? `Transfer to ${toBankName} - ${toAccountHolderName}` 
        : 'Internal Transfer'),
      transferType: isExternal ? 'external' : 'internal',
      scheduledDate: scheduledDate || Date.now(),
      isRecurring,
      recurringFrequency,
      externalAccount: isExternal ? {
        bankName: toBankName,
        accountNumber: toAccountNumber,
        routingNumber: toRoutingNumber,
        accountHolderName: toAccountHolderName
      } : undefined,
      confirmationNumber: generateConfirmationNumber()
    });

    // If immediate transfer, process it
    if (!scheduledDate || new Date(scheduledDate) <= new Date()) {
      if (isExternal) {
        await processExternalTransfer(transfer);
      } else {
        await processTransfer(transfer);
      }
    }

    res.status(201).json({
      success: true,
      message: isExternal 
        ? 'External transfer initiated successfully' 
        : 'Internal transfer created successfully',
      data: transfer
    });
  } catch (error) {
    console.error('Create Transfer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transfer',
      error: error.message
    });
  }
};

// Get user transfers
exports.getTransfers = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;

    const transfers = await Transfer.find(query)
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('fromAccountId', 'accountName accountNumber')
      .populate('toAccountId', 'accountName accountNumber')
      .lean();

    const total = await Transfer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transfers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Transfers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfers',
      error: error.message
    });
  }
};

// Cancel transfer
exports.cancelTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;

    const transfer = await Transfer.findOne({
      _id: transferId,
      userId: req.user._id
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transfers can be cancelled'
      });
    }

    transfer.status = 'cancelled';
    await transfer.save();

    res.status(200).json({
      success: true,
      message: 'Transfer cancelled successfully',
      data: transfer
    });
  } catch (error) {
    console.error('Cancel Transfer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel transfer',
      error: error.message
    });
  }
};

// ==================== BILL PAYMENTS ====================

// Create bill payment
exports.createBillPayment = async (req, res) => {
  try {
    const {
      accountId,
      payee,
      amount,
      paymentDate,
      isRecurring,
      recurringFrequency,
      memo
    } = req.body;

    // Validation
    if (!accountId || !payee || !amount || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: 'Account, payee, amount, and payment date are required'
      });
    }

    // Check account
    // Check account - USE USER'S EMBEDDED ACCOUNTS
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (!user || !user.accounts || user.accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No accounts found'
      });
    }

    const account = user.accounts.find(acc => 
      acc._id.toString() === accountId.toString() && acc.status === 'active'
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const availableBalance = account.balance || 0;

    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds',
        details: {
          availableBalance,
          requestedAmount: amount
        }
      });
    }

    // Create bill payment
    const billPayment = await BillPayment.create({
      userId: req.user._id,
      accountId,
      payee,
      amount,
      paymentDate,
      isRecurring,
      recurringFrequency,
      memo,
      confirmationNumber: generateConfirmationNumber()
    });

    res.status(201).json({
      success: true,
      message: 'Bill payment scheduled successfully',
      data: billPayment
    });
  } catch (error) {
    console.error('Create Bill Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bill payment',
      error: error.message
    });
  }
};

// Get bill payments
exports.getBillPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;

    const payments = await BillPayment.find(query)
      .sort('-paymentDate')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('accountId', 'accountName accountNumber')
      .lean();

    const total = await BillPayment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Bill Payments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill payments',
      error: error.message
    });
  }
};

// Cancel bill payment
exports.cancelBillPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await BillPayment.findOne({
      _id: paymentId,
      userId: req.user._id
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Bill payment not found'
      });
    }

    if (payment.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled payments can be cancelled'
      });
    }

    payment.status = 'cancelled';
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Bill payment cancelled successfully',
      data: payment
    });
  } catch (error) {
    console.error('Cancel Bill Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel bill payment',
      error: error.message
    });
  }
};

// ==================== MOBILE CHECK DEPOSIT ====================

// Submit mobile deposit
exports.submitMobileDeposit = async (req, res) => {
  try {
    const { accountId, amount, checkNumber, checkImages } = req.body;

    // Validation
    if (!accountId || !amount || !checkImages || !checkImages.front || !checkImages.back) {
      return res.status(400).json({
        success: false,
        message: 'Account, amount, and check images are required'
      });
    }

    // Check account
    // Check account - USE USER'S EMBEDDED ACCOUNTS
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (!user || !user.accounts || user.accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No accounts found'
      });
    }

    const account = user.accounts.find(acc => 
      acc._id.toString() === accountId.toString() && acc.status === 'active'
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Create mobile deposit
    const deposit = await MobileDeposit.create({
      userId: req.user._id,
      accountId,
      amount,
      checkNumber,
      checkImages,
      confirmationNumber: generateConfirmationNumber(),
      availableDate: calculateAvailableDate()
    });

    res.status(201).json({
      success: true,
      message: 'Check deposit submitted for review',
      data: deposit
    });
  } catch (error) {
    console.error('Submit Mobile Deposit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit mobile deposit',
      error: error.message
    });
  }
};

// Get mobile deposits
exports.getMobileDeposits = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;

    const deposits = await MobileDeposit.find(query)
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('accountId', 'accountName accountNumber')
      .lean();

    const total = await MobileDeposit.countDocuments(query);

    res.status(200).json({
      success: true,
      data: deposits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Mobile Deposits Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mobile deposits',
      error: error.message
    });
  }
};

// ==================== ALERTS ====================

// Get user alerts
exports.getAlerts = async (req, res) => {
  try {
    const { isRead, page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const alerts = await AccountAlert.find(query)
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('accountId', 'accountName accountNumber')
      .lean();

    const total = await AccountAlert.countDocuments(query);
    const unreadCount = await AccountAlert.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: alerts,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Alerts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

// Mark alert as read
exports.markAlertRead = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await AccountAlert.findOneAndUpdate(
      { _id: alertId, userId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert marked as read',
      data: alert
    });
  } catch (error) {
    console.error('Mark Alert Read Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark alert',
      error: error.message
    });
  }
};

// Mark all alerts as read
exports.markAllAlertsRead = async (req, res) => {
  try {
    await AccountAlert.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All alerts marked as read'
    });
  } catch (error) {
    console.error('Mark All Alerts Read Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark alerts',
      error: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Process internal transfer - UPDATED FOR EMBEDDED ACCOUNTS
async function processTransfer(transfer) {
  try {
    const User = require('../models/User');
    
    console.log('Processing internal transfer:', {
      transferId: transfer._id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: transfer.amount
    });
    
    // Deduct from source account
    const updatedFromUser = await User.findOneAndUpdate(
      { 
        _id: transfer.userId,
        'accounts._id': transfer.fromAccountId
      },
      { 
        $inc: { 'accounts.$.balance': -transfer.amount }
      },
      { new: true }
    );

    if (!updatedFromUser) {
      throw new Error('Failed to update source account');
    }

    // Add to destination account
    const updatedToUser = await User.findOneAndUpdate(
      { 
        'accounts._id': transfer.toAccountId
      },
      { 
        $inc: { 'accounts.$.balance': transfer.amount }
      },
      { new: true }
    );

    if (!updatedToUser) {
      // Rollback source account
      await User.findOneAndUpdate(
        { 
          _id: transfer.userId,
          'accounts._id': transfer.fromAccountId
        },
        { 
          $inc: { 'accounts.$.balance': transfer.amount }
        }
      );
      throw new Error('Failed to update destination account');
    }

    // Get updated account balances
    const fromAcc = updatedFromUser.accounts.find(a => 
      a._id.toString() === transfer.fromAccountId.toString()
    );
    const toAcc = updatedToUser.accounts.find(a => 
      a._id.toString() === transfer.toAccountId.toString()
    );

    console.log('Account balances updated:', {
      fromAccount: { id: fromAcc._id, newBalance: fromAcc.balance },
      toAccount: { id: toAcc._id, newBalance: toAcc.balance }
    });

    // Create transaction records
    await Transaction.create([
      {
        accountId: transfer.fromAccountId,
        userId: transfer.userId,
        transactionType: 'transfer',
        amount: -transfer.amount,
        balanceAfter: fromAcc.balance,
        description: `Transfer to ${toAcc.accountNumber}`,
        category: 'transfer',
        status: 'completed',
        transactionDate: new Date()
      },
      {
        accountId: transfer.toAccountId,
        userId: updatedToUser._id,
        transactionType: 'transfer',
        amount: transfer.amount,
        balanceAfter: toAcc.balance,
        description: `Transfer from ${fromAcc.accountNumber}`,
        category: 'transfer',
        status: 'completed',
        transactionDate: new Date()
      }
    ]);

    // Update transfer status
    transfer.status = 'completed';
    transfer.completedDate = new Date();
    await transfer.save();

    console.log('Internal transfer completed successfully');

    return true;
  } catch (error) {
    console.error('Process Transfer Error:', error);
    transfer.status = 'failed';
    await transfer.save();
    return false;
  }
}

// Helper function to generate confirmation number
function generateConfirmationNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `CNF${timestamp}${random}`;
}

// Helper function to calculate available date for deposits
function calculateAvailableDate() {
  const today = new Date();
  today.setDate(today.getDate() + 2); // Available in 2 business days
  return today;
}