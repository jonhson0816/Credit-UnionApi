const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');

const accountController = {
  getAccounts: async (req, res) => {
    try {
      const accounts = await Account.find({
        userId: req.user._id,
        status: 'active'
      });
      
      res.json(accounts);
    } catch (error) {
      console.error('Account fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching accounts',
        error: error.message
      });
    }
  },

  createAccount: async (req, res) => {
  try {
    const { accountType } = req.body;
    
    if (!['Checking', 'Savings', 'Credit', 'Investment'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account type'
      });
    }

    // Set default values based on account type
    let interestRate, overdraftProtection;
    
    switch(accountType) {
      case 'Savings':
        interestRate = process.env.SAVINGS_INTEREST_RATE || 0.05;
        overdraftProtection = false;
        break;
      case 'Credit':
        interestRate = process.env.CREDIT_INTEREST_RATE || 0.12;
        overdraftProtection = false;
        break;
      case 'Investment':
        interestRate = process.env.INVESTMENT_INTEREST_RATE || 0.08;
        overdraftProtection = false;
        break;
      default: // Checking
        interestRate = process.env.DEFAULT_INTEREST_RATE || 0.01;
        overdraftProtection = true;
    }

    // Generate unique account number
    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Create new account object
    const newAccount = {
      accountType,
      accountNumber,
      routingNumber: '256074974',
      balance: process.env.DEFAULT_INITIAL_BALANCE || 0,
      interestRate,
      overdraftProtection,
      status: 'active',
      openedDate: new Date()
    };

    // Add account to user's accounts array
    const User = require('../models/User');
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { accounts: newAccount } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get the newly created account
    const createdAccount = updatedUser.accounts[updatedUser.accounts.length - 1];

    res.status(201).json({
      success: true,
      data: createdAccount
    });
  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: error.message
    });
  }
},

  createInitialAccounts: async (req, res) => {
    try {
      // Create both a checking and savings account for new user
      const checkingAccount = new Account({
        userId: req.user._id,
        accountType: 'Checking',
        accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        routingNumber: '256074974',
        balance: process.env.DEFAULT_INITIAL_BALANCE || 0,
        interestRate: process.env.DEFAULT_INTEREST_RATE,
        overdraftProtection: true
      });

      const savingsAccount = new Account({
        userId: req.user._id,
        accountType: 'Savings',
        accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        routingNumber: '256074974',
        balance: process.env.DEFAULT_INITIAL_BALANCE || 0,
        interestRate: process.env.SAVINGS_INTEREST_RATE,
        overdraftProtection: false
      });

      await Promise.all([
        checkingAccount.save(),
        savingsAccount.save()
      ]);

      res.status(201).json({
        success: true,
        data: {
          checking: checkingAccount,
          savings: savingsAccount
        }
      });
    } catch (error) {
      console.error('Initial accounts creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating initial accounts',
        error: error.message
      });
    }
  },

  getAccountById: async (req, res) => {
    try {
      const account = await Account.findOne({
        _id: req.params.id,
        userId: req.user._id,
        status: 'active'
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Account fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching account',
        error: error.message
      });
    }
  },

  updateAccount: async (req, res) => {
    try {
      const allowedUpdates = ['nickname', 'overdraftProtection'];
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      const account = await Account.findOneAndUpdate(
        {
          _id: req.params.id,
          userId: req.user._id,
          status: 'active'
        },
        updates,
        { new: true }
      );

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Account update error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating account',
        error: error.message
      });
    }
  },

  closeAccount: async (req, res) => {
    try {
      const account = await Account.findOneAndUpdate(
        {
          _id: req.params.id,
          userId: req.user._id,
          status: 'active'
        },
        { status: 'closed' },
        { new: true }
      );

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      res.json({
        success: true,
        message: 'Account closed successfully'
      });
    } catch (error) {
      console.error('Account closure error:', error);
      res.status(500).json({
        success: false,
        message: 'Error closing account',
        error: error.message
      });
    }
  },

  deposit: async (req, res) => {
  let session;
  
  try {
    console.log("=== DEPOSIT REQUEST START ===");
    
    const { accountNumber, amount, description } = req.body;
    
    if (!accountNumber || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid deposit details'
      });
    }
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (!user || !user.accounts || user.accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No accounts found'
      });
    }
    
    const account = user.accounts.find(acc => 
      acc.accountNumber === accountNumber.trim()
    );
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    console.log('✅ Found account:', {
      accountId: account._id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,  // ← CRITICAL: Log this
      currentBalance: account.balance
    });
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const uniqueReference = `DEP-${timestamp}-${randomString}`;
    
    session = await mongoose.startSession();
    session.startTransaction();
    
    const depositAmount = parseFloat(amount);
    
    const updatedUser = await User.findOneAndUpdate(
      { 
        _id: req.user._id,
        'accounts._id': account._id
      },
      { 
        $inc: { 'accounts.$.balance': depositAmount }
      },
      { 
        new: true, 
        session 
      }
    );
    
    if (!updatedUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Failed to update account'
      });
    }
    
    const updatedAccount = updatedUser.accounts.find(acc => 
      acc._id.toString() === account._id.toString()
    );
    
    console.log('✅ Updated balance:', updatedAccount.balance);
    
    const userDoc = await User.findById(req.user._id).select('fullName firstName lastName').lean();
    const actualUserName = userDoc?.fullName || `${userDoc?.firstName || ''} ${userDoc?.lastName || ''}`.trim() || 'Account Holder';
    
    console.log('💡 Deposit - Using actual user name:', actualUserName);
    console.log('💡 Account type to save:', account.accountType);  // ← CRITICAL LOG

    const Transaction = require('../models/Transaction');

    const transactionData = {
      userId: req.user._id,
      accountId: account._id,
      type: 'credit',
      amount: depositAmount,
      description: description || 'Deposit',
      category: 'Deposit',
      status: 'completed',
      date: new Date(),
      balance: updatedAccount.balance,
      reference: uniqueReference,
      fee: 0,
      
      // FROM (source) - The account holder
      sourceAccountNumber: account.accountNumber,
      sourceAccountHolderName: actualUserName,
      sourceAccountType: account.accountType,  // ← REMOVED the fallback || 'Checking'
      sourceRoutingNumber: '256074974',
      
      // TO (destination) - SAME as source for deposits
      destinationAccountNumber: account.accountNumber,
      destinationAccountHolderName: actualUserName,
      destinationBank: 'Navy Federal Credit Union',
      destinationRoutingNumber: '256074974',
      
      transactionMethod: 'online',
      initiatedFrom: 'web'
    };
    
    console.log('📝 Creating transaction with data:', transactionData);
    
    const transaction = await Transaction.create([transactionData], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    console.log('=== DEPOSIT SUCCESS ===');
    console.log('✅ Transaction created with accountType:', transaction[0].sourceAccountType);
    
    return res.status(200).json({
      success: true,
      message: 'Deposit successful',
      newBalance: updatedAccount.balance,
      transaction: transaction[0],
      updatedUser: {
        accounts: updatedUser.accounts
      }
    });
    
  } catch (error) {
    console.error('=== DEPOSIT ERROR ===', error);
    
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    
    return res.status(500).json({
      success: false,
      message: 'Deposit failed: ' + (error.message || 'Server error')
    });
  }
},

  createIfMissing: async (req, res) => {
    try {
      const { accountNumber, accountType } = req.body;
      
      // Check if account already exists
      const existingAccount = await Account.findOne({
        accountNumber: accountNumber.trim(),
        userId: req.user._id
      });
      
      if (existingAccount) {
        return res.status(200).json({
          success: true,
          message: 'Account already exists',
          account: existingAccount
        });
      }
      
      // Create new account
      const newAccount = await Account.create({
        userId: req.user._id,
        accountNumber: accountNumber.trim(),
        accountType: accountType || 'Checking',
        balance: 0,
        status: 'active',
        routingNumber: '256074974',
        interestRate: accountType === 'Savings' ? 0.05 : 0.01,
        overdraftProtection: accountType === 'Checking'
      });
      
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        account: newAccount
      });
    } catch (error) {
      console.error('Create account error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create account',
        error: error.message
      });
    }
  },
  
  withdraw: async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('=== WITHDRAW REQUEST START ===');
    const { accountNumber, amount, description } = req.body;
    
    if (!accountNumber || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal details'
      });
    }

    const userAccounts = req.user.accounts || [];
    const account = userAccounts.find(acc => 
      acc.accountNumber === accountNumber.trim()
    );

    if (!account) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    const withdrawAmount = parseFloat(amount);
    
    if (account.balance < withdrawAmount && !account.overdraftProtection) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
    }
    
    const User = require('../models/User');
    const updatedUser = await User.findOneAndUpdate(
      { 
        _id: req.user._id,
        'accounts._id': account._id
      },
      { 
        $inc: { 'accounts.$.balance': -withdrawAmount }
      },
      { 
        new: true, 
        session 
      }
    );
    
    if (!updatedUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Failed to update account'
      });
    }

    const updatedAccount = updatedUser.accounts.find(acc => 
      acc._id.toString() === account._id.toString()
    );

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const uniqueReference = `WD-${timestamp}-${randomString}`;
    
    // ===== CRITICAL FIX: Get ACTUAL user's full name from User document =====
    const userDoc = await User.findById(req.user._id).select('fullName firstName lastName').lean();
    const actualUserName = userDoc?.fullName || `${userDoc?.firstName || ''} ${userDoc?.lastName || ''}`.trim() || 'Account Holder';
    
    console.log('💡 Withdrawal - Using actual user name:', actualUserName);

    const Transaction = require('../models/Transaction');

    const transaction = await Transaction.create([{
      userId: req.user._id,
      accountId: account._id,
      type: 'debit',
      amount: withdrawAmount,
      description: description || 'Withdrawal',
      category: 'Withdrawal',
      status: 'completed',
      reference: uniqueReference,
      balance: updatedAccount.balance,
      date: new Date(),
      fee: 0,
      
      // FROM (source) - The account holder
      sourceAccountNumber: account.accountNumber,
      sourceAccountHolderName: actualUserName,  // ← ACTUAL NAME
      sourceAccountType: account.accountType || 'Checking',
      sourceRoutingNumber: '256074974',
      
      // TO (destination) - Cash withdrawal / External
      destinationAccountNumber: null,
      destinationAccountHolderName: 'Cash Withdrawal',
      destinationBank: null,
      destinationRoutingNumber: null,
      
      transactionMethod: 'online',
      initiatedFrom: 'web'
    }], { session });

    await session.commitTransaction();
    session.endSession();
    
    console.log('=== WITHDRAW SUCCESS ===');
    console.log('✅ Saved with name:', actualUserName);
    
    res.status(200).json({
      success: true,
      message: 'Withdrawal successful',
      newBalance: updatedAccount.balance,
      transaction: transaction[0],
      updatedUser: {
        accounts: updatedUser.accounts
      }
    });
    
  } catch (error) {
    console.error('=== WITHDRAW ERROR ===', error);
    
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).json({
      success: false,
      message: 'Withdrawal failed: ' + (error.message || 'Server error')
    });
  }
},
  
  cancelTransaction: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { transactionId } = req.params;
  
      const transaction = await Transaction.findOne({
        _id: transactionId,
        userId: req.user._id,
        status: 'completed'
      }).session(session);
  
      if (!transaction) {
        throw new Error('Transaction not found or already cancelled');
      }
  
      // Only allow cancellation of recent transactions (e.g., within 24 hours)
      const hoursSinceTransaction = (Date.now() - transaction.createdAt) / (1000 * 60 * 60);
      if (hoursSinceTransaction > 24) {
        throw new Error('Transaction cannot be cancelled after 24 hours');
      }
  
      const account = await Account.findOne({
        _id: transaction.accountId,
        status: 'active'
      }).session(session);
  
      if (!account) {
        throw new Error('Associated account not found');
      }
  
      // Reverse the transaction amount
      const reverseAmount = transaction.type === 'debit' ? transaction.amount : -transaction.amount;
      await Account.updateOne(
        { _id: account._id },
        { $inc: { balance: reverseAmount } }
      ).session(session);
  
      // Mark original transaction as cancelled
      await Transaction.updateOne(
        { _id: transaction._id },
        { status: 'cancelled' }
      ).session(session);
  
      // Create reversal transaction
      await Transaction.create([{
        userId: req.user._id,
        accountId: account._id,
        type: transaction.type === 'debit' ? 'credit' : 'debit',
        amount: transaction.amount,
        description: `Reversal of: ${transaction.description}`,
        category: 'Reversal',
        status: 'completed',
        relatedTransactionId: transaction._id
      }], { session });
  
      await session.commitTransaction();
      
      res.json({
        success: true,
        message: 'Transaction cancelled successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      res.status(500).json({
        success: false,
        message: 'Failed to cancel transaction',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

 transferFunds: async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('=== TRANSFER REQUEST START ===');
    
    const {
      sourceAccount,
      sourceAccountNumber,
      destinationAccount,
      destinationAccountNumber,
      amount,
      description,
      recipientName,
      recipientBank,
      routingNumber
    } = req.body;

    const fromAccount = sourceAccountNumber || sourceAccount;
    const toAccount = destinationAccountNumber || destinationAccount;
    
    console.log('📋 Transfer request details:', {
      fromAccount,
      toAccount,
      amount: parseFloat(amount),
      recipientName,
      recipientBank,
      routingNumber
    });

    // Validation
    if (!fromAccount || !toAccount || !amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Source account, destination account, and amount are required'
      });
    }

    if (!recipientName || !recipientBank) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Recipient name and bank are required'
      });
    }

    const transferAmount = parseFloat(amount);
    
    // Get sender's account
    const User = require('../models/User');
    const userDoc = await User.findById(req.user._id).select('fullName firstName lastName accounts').lean();
    
    if (!userDoc || !userDoc.accounts || userDoc.accounts.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'No accounts found'
      });
    }

    const sourceAcc = userDoc.accounts.find(acc => 
      acc.accountNumber === fromAccount.trim()
    );

    if (!sourceAcc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Source account not found'
      });
    }

    // Check balance
    if (sourceAcc.balance < transferAmount && !sourceAcc.overdraftProtection) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
    }

    // Get sender's actual name
    const senderName = userDoc.fullName || 
                      `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 
                      'Account Holder';

    console.log('✅ Sender (YOU):', senderName);
    console.log('✅ Recipient:', recipientName);
    console.log('✅ Recipient Bank:', recipientBank);
    console.log('✅ Source Account ID:', sourceAcc._id);

    // Deduct from sender's account
    const updatedSourceUser = await User.findOneAndUpdate(
      { 
        _id: req.user._id,
        'accounts._id': sourceAcc._id
      },
      { 
        $inc: { 'accounts.$.balance': -transferAmount }
      },
      { 
        new: true, 
        session 
      }
    );

    if (!updatedSourceUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({
        success: false,
        message: 'Failed to update source account balance'
      });
    }

    const updatedSourceAcc = updatedSourceUser.accounts.find(acc => 
      acc._id.toString() === sourceAcc._id.toString()
    );

    // Create transaction with CORRECT recipient information
    const Transaction = require('../models/Transaction');
    const reference = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    // ===== FIX 3: Use sourceAcc._id as accountId =====
    const debitTransaction = new Transaction({
      userId: req.user._id,
      accountId: sourceAcc._id,  // ← CRITICAL: Use the embedded account's _id
      type: 'debit',
      amount: transferAmount,
      description: description || `Transfer to ${recipientName}`,
      balance: updatedSourceAcc.balance,
      category: 'Transfer',
      status: 'completed',
      reference,
      fee: 0,
      date: new Date(),
      
      // FROM (sender) - YOU
      sourceAccountNumber: fromAccount,
      sourceAccountHolderName: senderName,
      sourceAccountType: sourceAcc.accountType || 'Checking',
      sourceRoutingNumber: '256074974',
      
      // TO (recipient) - THE PERSON YOU'RE SENDING TO
      destinationAccountNumber: toAccount,
      destinationAccountHolderName: recipientName,
      destinationBank: recipientBank,
      destinationRoutingNumber: routingNumber || null,
      
      transactionMethod: 'online',
      initiatedFrom: 'web'
    });

    await debitTransaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log('=== TRANSFER SUCCESS ===');
    console.log('✅ Transaction saved with:');
    console.log('   Sender:', senderName);
    console.log('   Recipient:', recipientName);
    console.log('   Recipient Bank:', recipientBank);
    console.log('   Account ID in transaction:', debitTransaction.accountId);

    res.json({
      success: true,
      message: 'Transfer successful',
      newBalance: updatedSourceAcc.balance,
      updatedUser: {
        accounts: updatedSourceUser.accounts
      },
      transaction: {
        _id: debitTransaction._id,
        reference: reference,
        amount: transferAmount,
        from: fromAccount,
        to: toAccount,
        sourceAccountHolderName: senderName,
        destinationAccountHolderName: recipientName,
        destinationBank: recipientBank
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('=== TRANSFER ERROR ===', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Error processing transfer'
    });
  }
},

  getUserSettings: async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Ensure the user can only access their own settings
      if (userId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to settings'
        });
      }
      
      // Get user's accounts to build settings
      const accounts = await Account.find({
        userId: userId,
        status: 'active'
      });
      
      // Create settings object with default preferences and account information
      const settings = {
        displayPreferences: {
          defaultAccountId: accounts.length > 0 ? accounts[0]._id : null,
          theme: 'light',
          currency: 'USD',
          language: 'en',
          dateFormat: 'MM/DD/YYYY'
        },
        notifications: {
          emailAlerts: true,
          pushNotifications: true,
          lowBalanceAlerts: true,
          lowBalanceThreshold: 100
        },
        security: {
          twoFactorEnabled: false,
          lastPasswordChange: null,
          loginNotifications: true
        },
        accounts: accounts.map(account => ({
          id: account._id,
          nickname: account.nickname || account.accountType,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          isDefault: account === accounts[0]
        }))
      };
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching account settings',
        error: error.message
      });
    }
  },
  
  // You might also want to add a method to save settings
  saveUserSettings: async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Ensure the user can only modify their own settings
      if (userId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to settings'
        });
      }
      
      const { settings } = req.body;
      
      // Here you would typically save to a database
      // For this implementation, we'll just return success
      
      res.json({
        success: true,
        message: 'Settings saved successfully',
        settings
      });
    } catch (error) {
      console.error('Settings save error:', error);
      res.status(500).json({
        success: false,
        message: 'Error saving account settings',
        error: error.message
      });
    }
  },

  deactivateAccount: async (req, res) => {
  try {
    const accountId = req.params.id;
    console.log('Deactivating account:', accountId);

    // ===== CRITICAL FIX: Update account in User's embedded accounts array =====
    const User = require('../models/User');
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'accounts._id': accountId,
        'accounts.status': 'active'
      },
      {
        $set: { 'accounts.$.status': 'inactive' }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or already inactive'
      });
    }

    // Find the updated account to return
    const updatedAccount = updatedUser.accounts.find(
      acc => acc._id.toString() === accountId
    );

    console.log('Account deactivated successfully:', updatedAccount);

    // Update localStorage by sending back the updated accounts
    res.json({
      success: true,
      message: 'Account deactivated successfully',
      data: updatedAccount,
      updatedUser: {
        accounts: updatedUser.accounts
      }
    });
  } catch (error) {
    console.error('Account deactivation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating account',
      error: error.message
    });
  }
},

 reactivateAccount: async (req, res) => {
  try {
    const accountId = req.params.id;
    console.log('Reactivating account:', accountId);

    // ===== CRITICAL FIX: Update account in User's embedded accounts array =====
    const User = require('../models/User');
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'accounts._id': accountId,
        'accounts.status': 'inactive'
      },
      {
        $set: { 'accounts.$.status': 'active' }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or already active'
      });
    }

    // Find the updated account to return
    const updatedAccount = updatedUser.accounts.find(
      acc => acc._id.toString() === accountId
    );

    console.log('Account reactivated successfully:', updatedAccount);

    res.json({
      success: true,
      message: 'Account reactivated successfully',
      data: updatedAccount,
      updatedUser: {
        accounts: updatedUser.accounts
      }
    });
  } catch (error) {
    console.error('Account reactivation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating account',
      error: error.message
    });
  }
},

  deleteAccount: async (req, res) => {
  try {
    const accountId = req.params.id;
    console.log('Attempting to delete account:', accountId);

    // ===== CRITICAL FIX: Find and delete account from User's embedded accounts array =====
    const User = require('../models/User');
    
    // First, find the user and the account to check balance
    const user = await User.findOne({
      _id: req.user._id,
      'accounts._id': accountId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Find the specific account
    const accountToDelete = user.accounts.find(
      acc => acc._id.toString() === accountId
    );

    if (!accountToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if account has balance
    if (accountToDelete.balance > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with positive balance. Please transfer or withdraw funds first.'
      });
    }

    console.log('Account balance is 0, proceeding with deletion...');

    // Remove the account from the user's accounts array
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id },
      { 
        $pull: { accounts: { _id: accountId } }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }

    console.log('Account deleted successfully. Remaining accounts:', updatedUser.accounts.length);

    res.json({
      success: true,
      message: 'Account permanently deleted',
      updatedUser: {
        accounts: updatedUser.accounts
      }
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
},

billPayment: async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('=== BILL PAYMENT REQUEST START ===');
    console.log('Request body:', req.body);
    
    const { 
      accountNumber, 
      sourceAccountNumber,
      sourceAccountHolderName,
      amount, 
      payeeName, 
      billType, 
      dueDate, 
      memo 
    } = req.body;

    if (!req.user || !req.user._id) {
      throw new Error('User not authenticated');
    }

    // Get user with accounts
    const user = await User.findById(req.user._id).session(session);
    if (!user || !user.accounts || user.accounts.length === 0) {
      throw new Error('No accounts found');
    }

    console.log('User accounts:', user.accounts.map(a => ({
      accountNumber: a.accountNumber,
      accountType: a.accountType,
      status: a.status,
      balance: a.balance
    })));

    // Use the provided accountNumber, fallback to sourceAccountNumber, or use first active account
    const searchAccountNumber = accountNumber || sourceAccountNumber;
    
    console.log('Searching for account number:', searchAccountNumber);

    // Find the account - try multiple matching strategies
    let account = null;
    
    if (searchAccountNumber) {
      // Try exact match first
      account = user.accounts.find(acc => 
        acc.accountNumber === searchAccountNumber.toString().trim()
      );
      
      // If not found, try finding any active account
      if (!account) {
        console.log('Exact match not found, looking for active accounts');
        account = user.accounts.find(acc => acc.status === 'active');
      }
    } else {
      // No account number provided, use first active account
      account = user.accounts.find(acc => acc.status === 'active');
    }
    
    if (!account) {
      console.error('No suitable account found for bill payment');
      throw new Error('No active account available for bill payment');
    }

    console.log('✅ Found account:', {
      accountId: account._id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
      status: account.status
    });

    const billAmount = parseFloat(amount);
    const newBalance = account.balance - billAmount;

    if (newBalance < 0 && !account.overdraftProtection) {
      throw new Error('Insufficient funds');
    }

    // Update the account balance
    const accountIndex = user.accounts.findIndex(acc => 
      acc._id.toString() === account._id.toString()
    );
    
    console.log('Updating account at index:', accountIndex);
    
    user.accounts[accountIndex].balance = newBalance;
    await user.save({ session });

    console.log('✅ Account balance updated to:', newBalance);

    // Get actual user name
    const actualUserName = user.fullName || 
                          `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                          sourceAccountHolderName || 
                          'Account Holder';

    console.log('Account holder name:', actualUserName);

    // Create transaction with ALL required fields
    const transaction = new Transaction({
      userId: req.user._id,
      accountId: account._id,
      type: 'debit',
      amount: billAmount,
      description: `Bill Payment - ${payeeName} (${billType})`,
      balance: newBalance,
      category: 'Payment',
      status: 'completed',
      reference: `BILL-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      fee: 0,
      date: new Date(),
      
      // FROM (source) - Account holder paying the bill
      sourceAccountNumber: account.accountNumber,
      sourceAccountHolderName: actualUserName,
      sourceAccountType: account.accountType || 'Checking',
      sourceRoutingNumber: '256074974',
      
      // TO (destination) - The payee/biller
      destinationAccountNumber: null,
      destinationAccountHolderName: payeeName,
      destinationBank: null,
      destinationRoutingNumber: null,
      
      transactionMethod: 'online',
      initiatedFrom: 'web'
    });

    await transaction.save({ session });
    
    console.log('✅ Transaction created:', transaction._id);

    await session.commitTransaction();

    // Get updated user
    const updatedUser = await User.findById(req.user._id)
      .select('-password')
      .lean();

    console.log('=== BILL PAYMENT SUCCESS ===');
    console.log('Payee:', payeeName);
    console.log('Amount:', billAmount);
    console.log('New balance:', newBalance);

    res.status(200).json({
      success: true,
      message: 'Bill payment successful',
      transaction: transaction,
      newBalance: newBalance,
      updatedUser: updatedUser
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('=== BILL PAYMENT ERROR ===', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Error processing bill payment'
    });
  } finally {
    session.endSession();
  }
},

orderChecks: async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('=== CHECK ORDER REQUEST START ===');
    console.log('Request body:', req.body);
    
    const { 
      accountNumber, 
      quantity, 
      checkStyle, 
      startingNumber, 
      shippingAddress, 
      deliverySpeed 
    } = req.body;

    if (!req.user || !req.user._id) {
      throw new Error('User not authenticated');
    }

    // Get user with accounts
    const user = await User.findById(req.user._id).session(session);
    if (!user || !user.accounts || user.accounts.length === 0) {
      throw new Error('No accounts found');
    }

    console.log('User accounts:', user.accounts.map(a => ({
      accountNumber: a.accountNumber,
      accountType: a.accountType,
      status: a.status,
      balance: a.balance
    })));

    // Find the account - try multiple matching strategies
    let account = null;
    
    if (accountNumber) {
      // Try exact match first
      account = user.accounts.find(acc => 
        acc.accountNumber === accountNumber.toString().trim()
      );
      
      // If not found, try finding any active account
      if (!account) {
        console.log('Exact match not found, looking for active accounts');
        account = user.accounts.find(acc => acc.status === 'active');
      }
    } else {
      // No account number provided, use first active account
      account = user.accounts.find(acc => acc.status === 'active');
    }
    
    if (!account) {
      console.error('No suitable account found for check order');
      throw new Error('No active account available for check order');
    }

    console.log('✅ Found account:', {
      accountId: account._id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
      status: account.status
    });

    // Calculate fee based on quantity and options
    let fee = 0;
    if (quantity === 50) fee = 15;
    else if (quantity === 100) fee = 25;
    else if (quantity === 150) fee = 35;
    else if (quantity === 200) fee = 45;

    if (checkStyle === 'premium') fee += 10;
    if (checkStyle === 'designer') fee += 20;

    if (deliverySpeed === 'expedited') fee += 10;
    if (deliverySpeed === 'overnight') fee += 25;

    console.log('Calculated fee:', fee);

    const newBalance = account.balance - fee;

    if (newBalance < 0 && !account.overdraftProtection) {
      throw new Error('Insufficient funds for check order');
    }

    // Update the account balance
    const accountIndex = user.accounts.findIndex(acc => 
      acc._id.toString() === account._id.toString()
    );
    
    console.log('Updating account at index:', accountIndex);
    
    user.accounts[accountIndex].balance = newBalance;
    await user.save({ session });

    console.log('✅ Account balance updated to:', newBalance);

    // Get actual user name
    const actualUserName = user.fullName || 
                          `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                          'Account Holder';

    console.log('Account holder name:', actualUserName);

    // Create transaction with ALL required fields
    const transaction = new Transaction({
      userId: req.user._id,
      accountId: account._id,
      type: 'debit',
      amount: fee,
      description: `Check Order - ${quantity} checks (${checkStyle})`,
      balance: newBalance,
      category: 'Fee',
      status: 'completed',
      reference: `CHK-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      fee: fee,
      date: new Date(),
      
      // FROM (source) - Account holder ordering checks
      sourceAccountNumber: account.accountNumber,
      sourceAccountHolderName: actualUserName,
      sourceAccountType: account.accountType || 'Checking',
      sourceRoutingNumber: '256074974',
      
      // TO (destination) - Check printing service
      destinationAccountNumber: null,
      destinationAccountHolderName: 'Navy Federal Check Services',
      destinationBank: 'Navy Federal Credit Union',
      destinationRoutingNumber: null,
      
      transactionMethod: 'online',
      initiatedFrom: 'web'
    });

    await transaction.save({ session });
    
    console.log('✅ Transaction created:', transaction._id);

    await session.commitTransaction();

    // Get updated user
    const updatedUser = await User.findById(req.user._id)
      .select('-password')
      .lean();

    console.log('=== CHECK ORDER SUCCESS ===');
    console.log('Quantity:', quantity);
    console.log('Style:', checkStyle);
    console.log('Fee:', fee);
    console.log('New balance:', newBalance);

    res.status(200).json({
      success: true,
      message: 'Check order placed successfully',
      transaction: transaction,
      newBalance: newBalance,
      updatedUser: updatedUser,
      orderDetails: {
        quantity,
        checkStyle,
        startingNumber,
        deliverySpeed,
        fee,
        estimatedDelivery: deliverySpeed === 'overnight' ? '1 business day' :
                          deliverySpeed === 'expedited' ? '2-3 business days' :
                          '5-7 business days'
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('=== CHECK ORDER ERROR ===', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Error placing check order'
    });
  } finally {
    session.endSession();
  }
}

};

module.exports = accountController;