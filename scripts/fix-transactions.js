const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config(); // ADDED: Load .env file

async function fixTransactions() {
  try {
    // Use the same connection string as your main app
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoURI) {
      console.error('❌ No MongoDB URI found in .env file');
      console.log('Make sure you have MONGODB_URI or MONGO_URI in your .env file');
      process.exit(1);
    }
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    console.log('🔄 Fixing existing transactions...');
    
    // Find all transactions missing balance or date
    const transactions = await Transaction.find({
      $or: [
        { balance: { $exists: false } },
        { date: { $exists: false } }
      ]
    }).sort({ createdAt: 1 });
    
    console.log(`Found ${transactions.length} transactions to fix`);
    
    if (transactions.length === 0) {
      console.log('✅ No transactions need fixing!');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    for (const transaction of transactions) {
      // Add missing date field
      if (!transaction.date) {
        transaction.date = transaction.createdAt || new Date();
      }
      
      // Add missing balance field (try to calculate it)
      if (transaction.balance === undefined || transaction.balance === null) {
        // Find the user and account
        const user = await User.findById(transaction.userId);
        if (user && user.accounts) {
          const account = user.accounts.find(acc => 
            acc._id.toString() === transaction.accountId.toString()
          );
          if (account) {
            transaction.balance = account.balance;
          } else {
            transaction.balance = 0;
          }
        } else {
          transaction.balance = 0;
        }
      }
      
      await transaction.save();
      console.log(`✅ Fixed transaction ${transaction._id}`);
    }
    
    console.log('✅ All transactions fixed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing transactions:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixTransactions();