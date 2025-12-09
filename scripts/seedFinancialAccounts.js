const mongoose = require('mongoose');
const FinancialAccount = require('../models/FinancialAccount');
const User = require('../models/User');
require('dotenv').config();

const seedAccounts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    
    // Find a test user - adjust this query as needed
    const user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('Test user not found. Please create a user first.');
      process.exit(1);
    }
    
    // Delete any existing accounts for this user
    await FinancialAccount.deleteMany({ user: user._id });
    console.log('Cleared existing financial accounts');
    
    // Define sample accounts
    const accounts = [
      {
        name: 'Checking Account',
        type: 'checking',
        balance: 4750.25,
        currency: 'USD',
        institution: 'Example Bank',
        accountNumber: 'XXXX-XXXX-1234',
        user: user._id
      },
      {
        name: 'Savings Account',
        type: 'savings',
        balance: 12500.00,
        currency: 'USD',
        institution: 'Example Bank',
        accountNumber: 'XXXX-XXXX-5678',
        user: user._id
      },
      {
        name: 'Credit Card',
        type: 'credit',
        balance: -1250.75, // Negative for debt
        currency: 'USD',
        institution: 'Example Credit Union',
        accountNumber: 'XXXX-XXXX-9012',
        creditLimit: 5000.00,
        user: user._id
      },
      {
        name: 'Investment Portfolio',
        type: 'investment',
        balance: 28750.50,
        currency: 'USD',
        institution: 'Example Investments',
        accountNumber: 'INV-XXXX-3456',
        user: user._id
      }
    ];
    
    // Insert the accounts
    const result = await FinancialAccount.insertMany(accounts);
    console.log(`${result.length} financial accounts seeded successfully`);
    
    // Log created accounts
    console.log('Created accounts:');
    result.forEach(account => {
      console.log(`- ${account.name}: $${account.balance} (${account.type})`);
    });
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    
  } catch (error) {
    console.error('Error seeding financial accounts:', error);
    process.exit(1);
  }
};

// Execute the seeding function
seedAccounts();