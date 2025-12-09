const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

exports.getTransactions = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    res.set('Cache-Control', 'private, max-age=300');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ userId: req.user._id })
      .select('type amount description createdAt balance accountId category status reference fee')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('accountId', 'accountNumber accountType')
      .lean()
      .exec();

    const total = await Transaction.countDocuments({ userId: req.user._id });

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Transaction fetch error:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountNumber, amount, type, description, category = 'Payment' } = req.body;

    if (!req.user || !req.user._id) {
      throw new Error('User not authenticated');
    }

    const normalizedType = type.toLowerCase();
    if (!['credit', 'debit'].includes(normalizedType)) {
      throw new Error('Invalid transaction type');
    }

    const account = await Account.findOne({
      accountNumber,
      userId: req.user._id
    }).session(session);

    if (!account) {
      throw new Error('Account not found');
    }

    const newBalance = normalizedType === 'credit' 
      ? account.balance + amount 
      : account.balance - amount;

    if (normalizedType === 'debit' && newBalance < 0 && !account.overdraftProtection) {
      throw new Error('Insufficient funds');
    }

    const updatedAccount = await Account.findByIdAndUpdate(
      account._id,
      { $set: { balance: newBalance } },
      { 
        session,
        new: true,
        runValidators: true
      }
    );

    if (!updatedAccount) {
      throw new Error('Failed to update account balance');
    }

    const transaction = new Transaction({
      userId: req.user._id,
      accountId: account._id,
      type: normalizedType,
      amount,
      description,
      balance: newBalance,
      category,
      status: 'completed',
      reference: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      fee: 0
    });

    await transaction.save({ session });
    await session.commitTransaction();
    await transaction.populate('accountId');

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Transaction creation error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(400).json({ 
      success: false,
      message: error.message || 'Error creating transaction'
    });
  } finally {
    session.endSession();
  }
};

exports.transferFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { sourceAccount, destinationAccount, amount, description, recipientDetails } = req.body;

    if (!req.user || !req.user._id) {
      throw new Error('User not authenticated');
    }

    const sourceAcc = await Account.findOne({
      accountNumber: sourceAccount,
      userId: req.user._id
    }).session(session);

    if (!sourceAcc) {
      throw new Error('Source account not found');
    }

    const destAcc = await Account.findOne({
      accountNumber: destinationAccount
    }).session(session);

    if (!destAcc) {
      throw new Error('Destination account not found');
    }

    if (sourceAcc.balance < amount && !sourceAcc.overdraftProtection) {
      throw new Error('Insufficient funds');
    }

    const [updatedSourceAcc, updatedDestAcc] = await Promise.all([
      Account.findByIdAndUpdate(
        sourceAcc._id,
        { $inc: { balance: -amount } },
        { 
          session,
          new: true,
          runValidators: true
        }
      ),
      Account.findByIdAndUpdate(
        destAcc._id,
        { $inc: { balance: amount } },
        { 
          session,
          new: true,
          runValidators: true
        }
      )
    ]);

    const reference = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    const debitTransaction = new Transaction({
      userId: req.user._id,
      accountId: sourceAcc._id,
      type: 'debit',
      amount,
      description: description || `Transfer to ${destinationAccount}`,
      balance: updatedSourceAcc.balance,
      category: 'Transfer',
      status: 'completed',
      reference,
      fee: 0
    });
    
    await debitTransaction.save({ session });
    
    const creditTransaction = new Transaction({
      userId: destAcc.userId,
      accountId: destAcc._id,
      type: 'credit',
      amount,
      description: `Transfer from ${sourceAccount}`,
      balance: updatedDestAcc.balance,
      category: 'Transfer',
      status: 'completed',
      reference,
      relatedTransactionId: debitTransaction._id,
      fee: 0
    });
    
    await creditTransaction.save({ session });
    
    debitTransaction.relatedTransactionId = creditTransaction._id;
    await debitTransaction.save({ session });

    await session.commitTransaction();
    await debitTransaction.populate('accountId');

    res.status(200).json({
      success: true,
      message: 'Transfer successful',
      data: debitTransaction
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Transfer error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(400).json({ 
      success: false,
      message: error.message || 'Error processing transfer'
    });
  } finally {
    session.endSession();
  }
};

exports.billPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountNumber, amount, payeeName, billType, dueDate, memo } = req.body;

    if (!req.user || !req.user._id) {
      throw new Error('User not authenticated');
    }

    const account = await Account.findOne({
      accountNumber,
      userId: req.user._id
    }).session(session);

    if (!account) {
      throw new Error('Account not found');
    }

    const newBalance = account.balance - amount;

    if (newBalance < 0 && !account.overdraftProtection) {
      throw new Error('Insufficient funds');
    }

    await Account.findByIdAndUpdate(
      account._id,
      { $set: { balance: newBalance } },
      { session, new: true }
    );

    const transaction = new Transaction({
      userId: req.user._id,
      accountId: account._id,
      type: 'debit',
      amount,
      description: `Bill Payment - ${payeeName} (${billType})`,
      balance: newBalance,
      category: 'Payment',
      status: 'completed',
      reference: `BILL-${Date.now()}`,
      fee: 0
    });

    await transaction.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Bill payment successful',
      data: transaction
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Bill payment error:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Error processing bill payment'
    });
  } finally {
    session.endSession();
  }
};

exports.orderChecks = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountNumber, quantity, checkStyle, startingNumber, shippingAddress, deliverySpeed } = req.body;

    if (!req.user || !req.user._id) {
      throw new Error('User not authenticated');
    }

    const account = await Account.findOne({
      accountNumber,
      userId: req.user._id
    }).session(session);

    if (!account) {
      throw new Error('Account not found');
    }

    // Calculate fee
    let fee = 0;
    if (quantity === 50) fee = 15;
    else if (quantity === 100) fee = 25;
    else if (quantity === 150) fee = 35;
    else if (quantity === 200) fee = 45;

    if (checkStyle === 'premium') fee += 10;
    if (checkStyle === 'designer') fee += 20;

    if (deliverySpeed === 'expedited') fee += 10;
    if (deliverySpeed === 'overnight') fee += 25;

    const newBalance = account.balance - fee;

    if (newBalance < 0 && !account.overdraftProtection) {
      throw new Error('Insufficient funds');
    }

    await Account.findByIdAndUpdate(
      account._id,
      { $set: { balance: newBalance } },
      { session, new: true }
    );

    const transaction = new Transaction({
      userId: req.user._id,
      accountId: account._id,
      type: 'debit',
      amount: fee,
      description: `Check Order - ${quantity} checks (${checkStyle})`,
      balance: newBalance,
      category: 'Fee',
      status: 'completed',
      reference: `CHK-${Date.now()}`,
      fee: fee
    });

    await transaction.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Check order placed successfully',
      data: transaction
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Check order error:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Error placing check order'
    });
  } finally {
    session.endSession();
  }
};

exports.confirmTransaction = async (req, res) => {
  try {
    const { transactionId } = req.body;
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user._id
    }).populate('accountId');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    if (!transaction.reference) {
      transaction.reference = `REF-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }
    
    transaction.status = 'completed';
    await transaction.save();
    
    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction confirmed successfully'
    });
  } catch (error) {
    console.error('Transaction confirmation error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Error confirming transaction'
    });
  }
};

// Get single transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user._id
    })
      .populate('accountId', 'accountNumber accountType')
      .lean()
      .exec();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction by ID error:', {
      message: error.message,
      stack: error.stack,
      transactionId: req.params.transactionId
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error fetching transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};