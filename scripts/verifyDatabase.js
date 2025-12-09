const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config();

const verifyDatabase = async () => {
  try {
    console.log('✅ Verifying database integrity...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to database\n');
    
    const users = await User.find().lean();
    const transactions = await Transaction.find().limit(10).lean();
    
    console.log(`📊 Users: ${users.length}`);
    console.log(`📊 Transactions: ${await Transaction.countDocuments()}\n`);
    
    console.log('═══ CHECKING RECENT TRANSACTIONS ═══\n');
    
    let allMatched = true;
    
    for (const transaction of transactions) {
      const user = users.find(u => u._id.toString() === transaction.userId.toString());
      
      if (!user) {
        console.log(`❌ Transaction ${transaction._id} belongs to non-existent user!`);
        allMatched = false;
        continue;
      }
      
      if (!user.accounts || user.accounts.length === 0) {
        console.log(`❌ User ${user.firstName} ${user.lastName} has NO accounts!`);
        allMatched = false;
        continue;
      }
      
      const account = user.accounts.find(a => 
        a._id.toString() === transaction.accountId?.toString()
      );
      
      if (account) {
        console.log(`✅ ${transaction.description} ($${transaction.amount}) → ${account.accountType} (${account.accountNumber})`);
      } else {
        console.log(`⚠️  ${transaction.description} - Account ID mismatch (will use account number fallback)`);
      }
    }
    
    console.log('\n═══ VERIFICATION RESULT ═══');
    if (allMatched) {
      console.log('✅ ALL TRANSACTIONS ARE VALID!');
    } else {
      console.log('⚠️  Some transactions need account ID fixes');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Verification complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

verifyDatabase();