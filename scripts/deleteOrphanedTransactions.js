const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config();

const deleteOrphanedTransactions = async () => {
  try {
    console.log('🗑️  Starting orphaned transaction cleanup...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to database\n');
    
    // Get all valid user IDs
    const validUsers = await User.find().select('_id').lean();
    const validUserIds = validUsers.map(u => u._id.toString());
    
    console.log(`✅ Found ${validUserIds.length} valid users\n`);
    console.log('Valid user IDs:');
    validUserIds.forEach(id => console.log(`   - ${id}`));
    console.log('');
    
    // Get all transactions
    const allTransactions = await Transaction.find().lean();
    console.log(`📊 Total transactions: ${allTransactions.length}\n`);
    
    // Find orphaned transactions
    const orphanedTransactions = allTransactions.filter(t => 
      !validUserIds.includes(t.userId.toString())
    );
    
    console.log(`🔍 Found ${orphanedTransactions.length} orphaned transactions\n`);
    
    if (orphanedTransactions.length > 0) {
      console.log('Orphaned transactions belong to:');
      const orphanedUserIds = [...new Set(orphanedTransactions.map(t => t.userId.toString()))];
      orphanedUserIds.forEach(id => {
        const count = orphanedTransactions.filter(t => t.userId.toString() === id).length;
        console.log(`   - User ${id}: ${count} transaction(s)`);
      });
      console.log('');
      
      console.log('⚠️  These transactions will be DELETED!\n');
      console.log('Press Ctrl+C within 5 seconds to cancel...\n');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('🗑️  Deleting orphaned transactions...\n');
      
      // Delete orphaned transactions
      const result = await Transaction.deleteMany({
        userId: { $in: orphanedTransactions.map(t => t.userId) }
      });
      
      console.log(`✅ Deleted ${result.deletedCount} orphaned transactions\n`);
    } else {
      console.log('✅ No orphaned transactions found - database is clean!\n');
    }
    
    // Show remaining transactions
    const remainingTransactions = await Transaction.countDocuments();
    console.log('=== SUMMARY ===');
    console.log(`✅ Valid users: ${validUserIds.length}`);
    console.log(`🗑️  Deleted orphaned transactions: ${orphanedTransactions.length}`);
    console.log(`📊 Remaining transactions: ${remainingTransactions}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Cleanup complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

deleteOrphanedTransactions();