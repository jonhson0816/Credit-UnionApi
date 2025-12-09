const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

const accountDetailsController = {
  // Get detailed information about a specific account
  getAccountDetails: async (req, res) => {
    try {
      const { accountId } = req.params;
      
      console.log('=== BACKEND ACCOUNT DETAILS DEBUG ===');
      console.log('Received accountId:', accountId);
      console.log('User ID:', req.user._id);
      
      if (!accountId || accountId === 'undefined' || accountId === 'null') {
        console.log('Invalid accountId received');
        return res.status(400).json({
          success: false,
          message: 'Invalid account ID - cannot be undefined or null'
        });
      }
      
      // Look in req.user.accounts (embedded accounts)
      const userAccounts = req.user.accounts || [];
      
      console.log('User has', userAccounts.length, 'embedded accounts');
      console.log('Looking for accountId:', accountId);
      
      // Find the account in the user's embedded accounts array
      let account = userAccounts.find(acc => 
        acc._id.toString() === accountId || 
        acc.accountNumber === accountId
      );
      
      console.log('Found account:', account ? 'YES' : 'NO');
      console.log('=== END BACKEND DEBUG ===');

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found or access denied'
        });
      }

      // Get transactions for this account from Transaction collection
      console.log('=== FETCHING TRANSACTIONS ===');
      console.log('Account ID:', account._id);
      console.log('User ID:', req.user._id);

      const transactions = await Transaction.find({
        accountId: account._id,
        userId: req.user._id
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

      console.log(`✅ Found ${transactions.length} transactions`);
      if (transactions.length > 0) {
        console.log('First transaction:', JSON.stringify(transactions[0], null, 2));
        console.log('Last transaction:', JSON.stringify(transactions[transactions.length - 1], null, 2));
      }

      console.log(`Found ${transactions.length} transactions for account ${account._id}`);

      // Format transactions - CRITICAL: Remove any circular references
      const formattedTransactions = transactions.map(t => ({
        _id: t._id ? t._id.toString() : null,
        date: t.createdAt,
        description: t.description || 'No description',
        type: t.type,
        amount: parseFloat(t.amount) || 0,
        balance: parseFloat(t.balance) || 0,
        category: t.category || 'General',
        status: t.status || 'completed',
        reference: t.reference || '',
        fee: parseFloat(t.fee) || 0
      }));

      // Calculate stats
      const stats = await calculateAccountStats(account._id, req.user._id);

      // CRITICAL FIX: Create a clean response object with NO circular references
      const responseData = {
        success: true,
        data: {
          account: {
            _id: account._id.toString(),
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            balance: parseFloat(account.balance) || 0,
            routingNumber: account.routingNumber,
            interestRate: parseFloat(account.interestRate) || 0,
            overdraftProtection: Boolean(account.overdraftProtection),
            status: account.status || 'active'
          },
          transactions: formattedTransactions,
          stats: stats
        }
      };

      // Set proper headers
      res.setHeader('Content-Type', 'application/json');
      
      console.log('✅ Sending response with', formattedTransactions.length, 'transactions');
      
      // Send response
      return res.status(200).json(responseData);

    } catch (error) {
      console.error('❌ Account details fetch error:', error);
      
      // Make sure we haven't sent a response yet
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Error fetching account details',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  // Get filtered transactions for an account
  getAccountTransactions: async (req, res) => {
    try {
      const { accountId } = req.params;
      const { startDate, endDate, type, category, limit = 50, page = 1 } = req.query;

      // Verify account ownership
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

      // Build query
      const query = {
        accountId: account._id,
        userId: req.user._id
      };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      if (type) query.type = type.toLowerCase();
      if (category) query.category = category;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Transaction fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transactions',
        error: error.message
      });
    }
  },

  // Get account summary
  getAccountSummary: async (req, res) => {
    try {
      const { accountId } = req.params;
      const { period = '30' } = req.query;

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

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const transactions = await Transaction.find({
        accountId: account._id,
        userId: req.user._id,
        createdAt: { $gte: startDate }
      });

      const summary = {
        totalCredits: 0,
        totalDebits: 0,
        transactionCount: transactions.length,
        averageTransaction: 0,
        largestCredit: 0,
        largestDebit: 0
      };

      transactions.forEach(t => {
        if (t.type === 'credit') {
          summary.totalCredits += t.amount;
          summary.largestCredit = Math.max(summary.largestCredit, t.amount);
        } else {
          summary.totalDebits += t.amount;
          summary.largestDebit = Math.max(summary.largestDebit, t.amount);
        }
      });

      summary.averageTransaction = transactions.length > 0
        ? (summary.totalCredits + summary.totalDebits) / transactions.length
        : 0;
      summary.netChange = summary.totalCredits - summary.totalDebits;

      res.json({
        success: true,
        data: {
          account,
          summary,
          period: parseInt(period)
        }
      });
    } catch (error) {
      console.error('Account summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching account summary',
        error: error.message
      });
    }
  },

  // Get single transaction details with full information
  getTransactionById: async (req, res) => {
    try {
      const { transactionId } = req.params;
      
      console.log('=== FETCHING TRANSACTION RECEIPT ===');
      console.log('Transaction ID:', transactionId);
      console.log('User ID:', req.user._id);
      
      // Find transaction and verify ownership
      const transaction = await Transaction.findOne({
        _id: transactionId,
        userId: req.user._id
      }).lean();
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found or access denied'
        });
      }
      
      console.log('✅ Transaction found:', transaction.reference);
      
      // Format response with all details
      const formattedTransaction = {
        _id: transaction._id.toString(),
        type: transaction.type,
        amount: parseFloat(transaction.amount),
        description: transaction.description || 'No description',
        category: transaction.category,
        status: transaction.status,
        balance: parseFloat(transaction.balance),
        date: transaction.date || transaction.createdAt,
        reference: transaction.reference,
        fee: parseFloat(transaction.fee) || 0,
        
        // Source account details
        sourceAccountNumber: transaction.sourceAccountNumber,
        sourceAccountType: transaction.sourceAccountType,
        sourceAccountHolderName: transaction.sourceAccountHolderName,
        sourceRoutingNumber: transaction.sourceRoutingNumber,
        
        // Destination account details (if applicable)
        destinationAccountNumber: transaction.destinationAccountNumber || null,
        destinationAccountHolderName: transaction.destinationAccountHolderName || null,
        destinationBank: transaction.destinationBank || null,
        destinationRoutingNumber: transaction.destinationRoutingNumber || null,
        
        // Transaction method
        transactionMethod: transaction.transactionMethod || 'online',
        
        // Payment details (if applicable)
        payeeName: transaction.payeeName || null,
        payeeAccountNumber: transaction.payeeAccountNumber || null,
        billType: transaction.billType || null,
        dueDate: transaction.dueDate || null,
        
        // Confirmation
        confirmationNumber: transaction.confirmationNumber || null,
        
        // Metadata
        initiatedFrom: transaction.initiatedFrom || 'web',
        memo: transaction.memo || null,
        
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      };
      
      return res.status(200).json({
        success: true,
        data: formattedTransaction
      });
      
    } catch (error) {
      console.error('❌ Error fetching transaction:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

// Helper function to calculate account statistics
async function calculateAccountStats(accountId, userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await Transaction.find({
    accountId,
    userId,
    createdAt: { $gte: thirtyDaysAgo }
  });

  const stats = {
    last30Days: {
      totalCredits: 0,
      totalDebits: 0,
      transactionCount: transactions.length
    },
    allTime: {
      totalTransactions: await Transaction.countDocuments({ accountId, userId })
    }
  };

  transactions.forEach(t => {
    if (t.type === 'credit') {
      stats.last30Days.totalCredits += t.amount;
    } else {
      stats.last30Days.totalDebits += t.amount;
    }
  });

  return stats;
}

module.exports = accountDetailsController;