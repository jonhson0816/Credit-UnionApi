const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const transferController = {
  getTransferHistory: async (req, res) => {
    try {
      // Find all accounts for this user
      const accounts = await Account.find({
        userId: req.user._id,
        status: 'active'
      });
      
      const accountIds = accounts.map(account => account._id);
      
      // Get all transfers involving user's accounts
      const transfers = await Transaction.find({
        accountId: { $in: accountIds },
        category: 'Transfer'
      })
      .sort({ createdAt: -1 })
      .limit(10);
      
      // Enrich the transfer data with account information
      const enrichedTransfers = await Promise.all(transfers.map(async (transfer) => {
        const account = accounts.find(acc => acc._id.toString() === transfer.accountId.toString());
        
        let otherAccountInfo = null;
        
        // If this is a debit, find the related credit transaction 
        // (or vice versa) to show the other account
        if (transfer.type === 'debit') {
          const creditTransaction = await Transaction.findOne({
            category: 'Transfer',
            type: 'credit',
            amount: transfer.amount,
            createdAt: { $gte: new Date(transfer.createdAt.getTime() - 5000), $lte: new Date(transfer.createdAt.getTime() + 5000) }
          });
          
          if (creditTransaction) {
            const destAccount = await Account.findById(creditTransaction.accountId);
            if (destAccount) {
              otherAccountInfo = {
                name: destAccount.nickname || `${destAccount.accountType} Account`,
                accountNumber: destAccount.accountNumber
              };
            }
          }
        }
        
        return {
          id: transfer._id,
          date: transfer.createdAt.toISOString().split('T')[0],
          from: transfer.type === 'debit' ? 
                 account.nickname || `${account.accountType} Account` : 
                 otherAccountInfo?.name || 'External Account',
          to: transfer.type === 'credit' ? 
               account.nickname || `${account.accountType} Account` : 
               otherAccountInfo?.name || 'External Account',
          amount: transfer.amount,
          fee: transfer.fee || 0,
          note: transfer.description
        };
      }));
      
      res.json({
        success: true,
        data: enrichedTransfers
      });
    } catch (error) {
      console.error('Transfer history fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transfer history',
        error: error.message
      });
    }
  },
  
  calculateTransferFee: async (req, res) => {
    try {
      const { sourceAccountId, destinationAccountId, amount } = req.query;
      
      if (!sourceAccountId || !destinationAccountId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Verify accounts belong to user
      const sourceAccount = await Account.findOne({
        _id: sourceAccountId,
        userId: req.user._id,
        status: 'active'
      });
      
      if (!sourceAccount) {
        return res.status(404).json({
          success: false,
          message: 'Source account not found'
        });
      }
      
      const destinationAccount = await Account.findOne({
        _id: destinationAccountId,
        status: 'active'
      });
      
      if (!destinationAccount) {
        return res.status(404).json({
          success: false,
          message: 'Destination account not found'
        });
      }
      
      // Calculate fee based on account types
      let fee = 0;
      const parsedAmount = parseFloat(amount);
      
      if (sourceAccount.accountType === 'Investment' || destinationAccount.accountType === 'Investment') {
        fee = parsedAmount * 0.01; // 1% fee for investment accounts
      } else if (sourceAccount.accountType !== destinationAccount.accountType) {
        fee = Math.min(parsedAmount * 0.005, 25); // 0.5% fee up to $25 for cross-account-type transfers
      }
      
      res.json({
        success: true,
        data: {
          fee: fee,
          total: parsedAmount + fee
        }
      });
    } catch (error) {
      console.error('Fee calculation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating transfer fee',
        error: error.message
      });
    }
  },

   executeTransfer: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { sourceAccount, destinationAccount, amount, description } = req.body;
      const userId = req.user._id || req.user.userId;

      // Validate required fields
      if (!sourceAccount || !destinationAccount || !amount) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Source account, destination account, and amount are required'
        });
      }

      const transferAmount = parseFloat(amount);
      
      if (transferAmount <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Transfer amount must be greater than 0'
        });
      }

      // Find source account by account number
      const sourceAcc = await Account.findOne({
        userId,
        accountNumber: sourceAccount,
        status: 'active'
      }).session(session);

      if (!sourceAcc) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Source account not found'
        });
      }

      // Check sufficient balance
      if (sourceAcc.balance < transferAmount) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Insufficient funds'
        });
      }

      // Find destination account by account number (can be any user's account)
      const destAcc = await Account.findOne({
        accountNumber: destinationAccount,
        status: 'active'
      }).session(session);

      if (!destAcc) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Destination account not found'
        });
      }

      // Generate reference number
      const reference = `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Update source account balance
      sourceAcc.balance -= transferAmount;
      await sourceAcc.save({ session });

      // Update destination account balance
      destAcc.balance += transferAmount;
      await destAcc.save({ session });

      // Create debit transaction for source account
      const debitTransaction = new Transaction({
        userId: sourceAcc.userId,
        accountId: sourceAcc._id,
        accountNumber: sourceAcc.accountNumber,
        type: 'debit',
        amount: transferAmount,
        category: 'Transfer',
        description: description || `Transfer to ${destinationAccount}`,
        balance: sourceAcc.balance,
        status: 'completed',
        reference
      });

      // Create credit transaction for destination account
      const creditTransaction = new Transaction({
        userId: destAcc.userId,
        accountId: destAcc._id,
        accountNumber: destAcc.accountNumber,
        type: 'credit',
        amount: transferAmount,
        category: 'Transfer',
        description: description || `Transfer from ${sourceAccount}`,
        balance: destAcc.balance,
        status: 'completed',
        reference
      });

      // Save both transactions
      await debitTransaction.save({ session });
      await creditTransaction.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: 'Transfer completed successfully',
        newBalance: sourceAcc.balance,
        transaction: {
          reference,
          amount: transferAmount,
          from: sourceAccount,
          to: destinationAccount,
          _id: debitTransaction._id
        }
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Transfer error:', error);
      res.status(500).json({
        success: false,
        message: 'Transfer failed',
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
      const { sourceAccountId, destinationAccountId, amount, fee, note } = req.body;

      if (!sourceAccountId || !destinationAccountId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required transfer details'
        });
      }

      const sourceAccount = await Account.findOne({
        _id: sourceAccountId,
        userId: req.user._id,
        status: 'active'
      }).session(session);

      if (!sourceAccount) {
        throw new Error('Source account not found');
      }
      
      // Verify sufficient funds including fee
      const totalAmount = parseFloat(amount) + (fee || 0);
      if (sourceAccount.balance < totalAmount) {
        throw new Error('Insufficient funds');
      }

      const destinationAccount = await Account.findOne({
        _id: destinationAccountId,
        status: 'active'
      }).session(session);

      if (!destinationAccount) {
        throw new Error('Destination account not found');
      }

      // Perform transfer
      await Account.updateOne(
        { _id: sourceAccount._id },
        { $inc: { balance: -totalAmount } }
      ).session(session);

      await Account.updateOne(
        { _id: destinationAccount._id },
        { $inc: { balance: parseFloat(amount) } }
      ).session(session);

      // Create transactions
      const transferDescription = note || `Transfer from ${sourceAccount.accountNumber} to ${destinationAccount.accountNumber}`;
      
      const transactions = [
        {
          userId: req.user._id,
          accountId: sourceAccount._id,
          type: 'debit',
          amount: parseFloat(amount),
          fee: fee || 0,
          description: transferDescription,
          category: 'Transfer'
        }
      ];
      
      // Only create destination transaction if it belongs to our system
      transactions.push({
        userId: destinationAccount.userId,
        accountId: destinationAccount._id,
        type: 'credit',
        amount: parseFloat(amount),
        fee: 0,
        description: note || `Transfer from account ${sourceAccount.accountNumber}`,
        category: 'Transfer'
      });
      
      await Transaction.create(transactions, { session });

      await session.commitTransaction();
      
      res.json({
        success: true,
        message: 'Transfer successful',
        data: {
          transferAmount: amount,
          fee: fee || 0,
          total: totalAmount,
          sourceAccount: {
            id: sourceAccount._id,
            name: sourceAccount.nickname || `${sourceAccount.accountType} Account`,
            newBalance: sourceAccount.balance - totalAmount
          },
          destinationAccount: {
            id: destinationAccount._id,
            name: destinationAccount.nickname || `${destinationAccount.accountType} Account`,
            newBalance: destinationAccount.balance + parseFloat(amount)
          }
        }
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Transfer error:', error);
      res.status(500).json({
        success: false,
        message: 'Transfer failed',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }
};

module.exports = transferController;