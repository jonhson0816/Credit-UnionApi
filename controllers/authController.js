const jwt = require('jsonwebtoken');
const User = require('../models/User');
const FinancialGoal = require('../models/FinancialGoal');
const Transaction = require('../models/Transaction');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      refreshToken: newRefreshToken,
      user
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// Helper function to generate unique 10-digit account number
const generateAccountNumber = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// Helper function to get Navy Federal routing number
const getRoutingNumber = () => {
  return '256074974'; // Navy Federal's routing number
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Make sure uploads directory exists
const ensureUploadDirExists = () => {
  const uploadDir = path.join(__dirname, '../uploads/profiles');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const authController = {
  register: async (req, res) => {
    try {
      ensureUploadDirExists();
      
      const { 
        firstName, 
        lastName, 
        email,
        username,
        password, 
        militaryBranch, 
        rank,
        dateOfBirth,
        accountType,
        ssn,
        phoneNumber,
        street,
        city,
        state,
        zipCode,
        employmentStatus,
        employer,
        annualIncome,
        securityQuestion1,
        securityAnswer1,
        securityQuestion2,
        securityAnswer2,
        termsAccepted,
        termsAcceptedDate
      } = req.body;

      // Validation - all required fields
      if (!firstName || !lastName || !email || !username || !password || !dateOfBirth || !ssn || !phoneNumber || !street || !city || !state || !zipCode) {
        return res.status(400).json({
          message: 'All required fields must be filled',
          error: 'Missing required fields'
        });
      }

      // Validate SSN format
      const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
      if (!ssnRegex.test(ssn)) {
        return res.status(400).json({
          message: 'Invalid SSN format',
          error: 'SSN must be in format XXX-XX-XXXX'
        });
      }

      // Check if SSN already exists
      const existingSSN = await User.findOne({ ssn });
      if (existingSSN) {
        return res.status(400).json({
          message: 'An account with this SSN already exists',
          error: 'Duplicate SSN'
        });
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          message: 'Email already registered',
          error: 'Duplicate email'
        });
      }

      // Check if username already exists
      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return res.status(400).json({
          message: 'Username already taken',
          error: 'Duplicate username'
        });
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
          error: 'Invalid username format'
        });
      }

      // Validate terms acceptance
      if (termsAccepted !== 'true' && termsAccepted !== true) {
        return res.status(400).json({
          message: 'You must accept the Terms & Conditions',
          error: 'Terms not accepted'
        });
      }

      // Calculate age from date of birth
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear() - 
        (today.getMonth() < birthDate.getMonth() || 
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

      // Create accounts array
      const accounts = [];
      const routingNumber = getRoutingNumber();

      // Process account types - ensure no duplicates
      let accountTypesToCreate = [];
      if (accountType && Array.isArray(accountType)) {
        const uniqueTypes = [...new Set(accountType)];
        accountTypesToCreate = uniqueTypes.filter(type => type !== 'Checking');
        accountTypesToCreate.unshift('Checking'); // Always add Checking first
      } else {
        accountTypesToCreate = ['Checking']; // Default to just Checking
      }

      console.log('Creating accounts for types:', accountTypesToCreate);

      // Create accounts based on types
      for (const type of accountTypesToCreate) {
        let initialBalance = 0;
        let interestRate = 0.01;
        let overdraftProtection = true;
        
        switch(type) {
          case 'Checking':
            initialBalance = 60000.00;
            interestRate = 0.01;
            overdraftProtection = true;
            break;
          case 'Savings':
            initialBalance = 5000.00;
            interestRate = 0.025;
            overdraftProtection = true;
            break;
          case 'Credit':
            initialBalance = 0;
            interestRate = 0.12;
            overdraftProtection = false;
            break;
          case 'Investment':
            initialBalance = 0;
            interestRate = 0.08;
            overdraftProtection = false;
            break;
          default:
            console.warn(`Unknown account type: ${type}, skipping...`);
            continue;
        }
        
        accounts.push({
          accountType: type,
          accountNumber: generateAccountNumber(),
          routingNumber: routingNumber,
          balance: initialBalance,
          interestRate: interestRate,
          overdraftProtection: overdraftProtection,
          status: 'active',
          openedDate: new Date()
        });
      }

      console.log(`Created ${accounts.length} account(s)`);
      
      // Handle profile image upload
      let profileImagePath = null;
      if (req.file) {
        try {
          profileImagePath = `/uploads/profiles/${req.file.filename}`;
        } catch (fileError) {
          console.error('File processing error:', fileError);
          return res.status(500).json({
            message: 'Error processing profile image',
            error: fileError.message
          });
        }
      }

      // Create the user
      const user = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password,
        militaryBranch: militaryBranch || 'Navy',
        rank: rank || 'Junior Rank',
        dateOfBirth,
        age,
        ssn,
        phoneNumber,
        address: {
          street,
          city,
          state: state.toUpperCase(),
          zipCode
        },
        employment: {
          status: employmentStatus,
          employer: employer || null,
          annualIncome: annualIncome ? parseFloat(annualIncome) : null
        },
        securityQuestions: [
          {
            question: securityQuestion1,
            answer: securityAnswer1
          },
          {
            question: securityQuestion2,
            answer: securityAnswer2
          }
        ],
        termsAccepted: true,
        termsAcceptedDate: termsAcceptedDate || new Date(),
        profileImage: profileImagePath,
        accounts
      });

      await user.save();

      // Create default financial goals
      const defaultGoals = [
        {
          userId: user._id,
          name: 'Emergency Fund',
          targetAmount: 10000,
          currentAmount: 0,
          targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          category: 'Savings'
        },
        {
          userId: user._id,
          name: 'Retirement Savings',
          targetAmount: 50000,
          currentAmount: 0,
          targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
          category: 'Investment'
        }
      ];

      try {
        await FinancialGoal.insertMany(defaultGoals);
      } catch (goalError) {
        console.error('Failed to create financial goals:', goalError);
      }

      // Create initial transaction for the $60,000 deposit
      try {
        console.log('=== CREATING INITIAL TRANSACTION ===');
        console.log('User ID:', user._id);
        console.log('Account ID:', accounts[0]._id);  // ← This is the embedded account's _id
        console.log('Account Number:', accounts[0].accountNumber);
        
        // Get the actual user's full name
        const actualUserName = `${firstName} ${lastName}`.trim();
        
        const initialTransaction = await Transaction.create({
          userId: user._id,
          accountId: accounts[0]._id,  // ← CRITICAL: Use the embedded account's _id
          type: 'credit',
          amount: 60000.00,
          description: 'Welcome Bonus - Initial Deposit',
          category: 'Deposit',
          status: 'completed',
          balance: 60000.00,
          date: new Date(),
          reference: `INIT-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          fee: 0,
          
          // FROM (source) - The new account holder
          sourceAccountNumber: accounts[0].accountNumber,
          sourceAccountHolderName: actualUserName,
          sourceAccountType: accounts[0].accountType || 'Checking',
          sourceRoutingNumber: '256074974',
          
          // TO (destination) - SAME as source for initial deposit
          destinationAccountNumber: accounts[0].accountNumber,
          destinationAccountHolderName: actualUserName,
          destinationBank: 'Navy Federal Credit Union',
          destinationRoutingNumber: '256074974',
          
          transactionMethod: 'online',
          initiatedFrom: 'registration'
        });
        
        console.log('✅ Initial transaction created successfully!');
        console.log('Transaction ID:', initialTransaction._id);
        console.log('Account ID in transaction:', initialTransaction.accountId);
        console.log('User name saved:', actualUserName);
      } catch (transactionError) {
        console.error('❌ Failed to create initial transaction:', transactionError);
        console.error('Error details:', transactionError.message);
        console.error('Error stack:', transactionError.stack);
      }

      // Generate token
      const token = generateToken(user._id);
      
      // Prepare user response (remove sensitive data)
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.ssn; // Don't send SSN back
      delete userResponse.securityQuestions; // Don't send security questions back

      res.status(201).json({
        message: 'Registration successful',
        user: userResponse,
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          message: `${field === 'username' ? 'Username' : field === 'email' ? 'Email' : 'Field'} already exists`,
          error: 'Duplicate entry'
        });
      }

      res.status(500).json({
        message: 'Registration failed',
        error: error.message
      });
    }
  },

  createAccount: async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    const { accountType } = req.body;

    // Validate account type
    if (!['Checking', 'Savings', 'Credit', 'Investment'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account type'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has this account type
    const existingAccount = user.accounts.find(acc => acc.accountType === accountType);
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${accountType} account`
      });
    }

    // Set account defaults based on type
    let initialBalance = 0;
    let interestRate = 0.01;
    let overdraftProtection = false;
    
    switch(accountType) {
      case 'Savings':
        interestRate = 0.025;
        overdraftProtection = true;
        break;
      case 'Credit':
        interestRate = 0.12;
        overdraftProtection = false;
        break;
      case 'Investment':
        interestRate = 0.08;
        overdraftProtection = false;
        break;
      default: // Checking
        interestRate = 0.01;
        overdraftProtection = true;
    }

    // Generate unique account number
    const generateAccountNumber = () => {
      return Math.floor(1000000000 + Math.random() * 9000000000).toString();
    };

    // Create new account
    const newAccount = {
      accountType,
      accountNumber: generateAccountNumber(),
      routingNumber: '256074974',
      balance: initialBalance,
      interestRate,
      overdraftProtection,
      status: 'active',
      openedDate: new Date()
    };

    // Add account to user
    user.accounts.push(newAccount);
    await user.save();

    // Return the newly created account
    const createdAccount = user.accounts[user.accounts.length - 1];

    res.status(201).json({
      success: true,
      message: `${accountType} account created successfully`,
      account: createdAccount
    });

  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account',
      error: error.message
    });
  }
},

  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          message: 'Username and password are required',
          error: 'Missing credentials'
        });
      }

      // Find user by username
      const user = await User.findOne({ username: username.toLowerCase() });
      
      if (!user) {
        return res.status(401).json({
          message: 'Invalid username or password',
          error: 'Authentication failed'
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          message: 'Invalid username or password',
          error: 'Authentication failed'
        });
      }

      const token = generateToken(user._id);
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.ssn;
      delete userResponse.securityQuestions;

      res.status(200).json({
        message: 'Login successful',
        user: userResponse,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        message: 'Login failed',
        error: error.message
      });
    }
  },

  getFinancialAccounts: async (req, res) => {
    try {
      if (mongoose.models.FinancialAccount) {
        const accounts = await mongoose.models.FinancialAccount.find({ user: req.user._id });
        res.json({
          success: true,
          data: accounts
        });
      } else {
        // Fallback to user accounts if FinancialAccount model doesn't exist
        const user = await User.findById(req.user._id);
        if (!user) {
          return res.status(404).json({ 
            success: false,
            message: 'User not found' 
          });
        }
        
        res.json({
          success: true,
          data: user.accounts
        });
      }
    } catch (error) {
      console.error('Error fetching financial accounts:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  logout: async (req, res) => {
    try {
      res.clearCookie('token');
      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        message: 'Logout failed',
        error: error.message
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetToken = resetToken;
      user.resetTokenExpires = Date.now() + 3600000; // Token expires in 1 hour
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      
      try {
        await transporter.sendMail({
          to: email,
          subject: 'Password Reset Request',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Please click the link below to reset your password:</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `
        });

        res.json({ message: 'Password reset email sent' });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();
        
        return res.status(500).json({
          message: 'Failed to send password reset email',
          error: emailError.message
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        message: 'Password reset failed',
        error: error.message
      });
    }
  },

  verify: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ isValid: false, message: 'No token provided' });
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password -resetToken -resetTokenExpires -ssn -securityQuestions');
      
      if (!user) {
        return res.status(401).json({ isValid: false, message: 'User not found' });
      }
  
      res.json({
        isValid: true,
        user
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ isValid: false, message: 'Invalid token' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const userId = req.user._id;
      const updateData = req.body;
      
      // Remove sensitive fields that shouldn't be updated directly
      const { password, resetToken, resetTokenExpires, ssn, securityQuestions, ...safeUpdateData } = updateData;
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: safeUpdateData },
        { new: true, runValidators: true }
      ).select('-password -resetToken -resetTokenExpires -ssn -securityQuestions');
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        message: 'Failed to update profile',
        error: error.message
      });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
        .select('-password -resetToken -resetTokenExpires -ssn -securityQuestions')
        .lean();
        
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        message: 'Failed to get profile',
        error: error.message
      });
    }
  },

  createAdmin: async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          message: 'Email already registered',
          error: 'Duplicate email'
        });
      }

      const admin = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        username: email.toLowerCase().split('@')[0],
        password,
        role: 'admin',
        dateOfBirth: new Date(),
        age: 0,
        ssn: '000-00-0000',
        phoneNumber: '000-000-0000',
        address: {
          street: 'Admin Address',
          city: 'Admin City',
          state: 'AA',
          zipCode: '00000'
        },
        employment: {
          status: 'employed'
        },
        securityQuestions: [
          { question: 'default', answer: 'default' },
          { question: 'default', answer: 'default' }
        ],
        termsAccepted: true
      });

      await admin.save();

      res.status(201).json({
        message: 'Admin user created successfully'
      });
    } catch (error) {
      console.error('Admin creation error:', error);
      res.status(500).json({
        message: 'Failed to create admin user',
        error: error.message
      });
    }
  },

  createModerator: async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          message: 'Email already registered',
          error: 'Duplicate email'
        });
      }

      const moderator = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        username: email.toLowerCase().split('@')[0],
        password,
        role: 'moderator',
        dateOfBirth: new Date(),
        age: 0,
        ssn: '000-00-0000',
        phoneNumber: '000-000-0000',
        address: {
          street: 'Moderator Address',
          city: 'Moderator City',
          state: 'MM',
          zipCode: '00000'
        },
        employment: {
          status: 'employed'
        },
        securityQuestions: [
          { question: 'default', answer: 'default' },
          { question: 'default', answer: 'default' }
        ],
        termsAccepted: true
      });

      await moderator.save();

      res.status(201).json({
        message: 'Moderator user created successfully'
      });
    } catch (error) {
      console.error('Moderator creation error:', error);
      res.status(500).json({
        message: 'Failed to create moderator user',
        error: error.message
      });
    }
  },

  uploadProfileImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No image file provided',
          error: 'Missing file'
        });
      }

      const userId = req.params.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          message: 'User not found',
          error: 'Invalid user ID'
        });
      }

      // If user already has an image in Cloudinary, delete it
      if (user.cloudinaryImageId) {
        await cloudinary.uploader.destroy(user.cloudinaryImageId);
      }

      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'navy-federal/profiles'
      });

      // Update user with new image details
      user.profileImage = result.secure_url;
      user.cloudinaryImageId = result.public_id;
      await user.save();

      // Delete temporary file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });

      res.json({
        message: 'Profile image updated successfully',
        profileImage: result.secure_url
      });
    } catch (error) {
      // Try to delete temporary file if it exists
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }

      console.error('Profile image upload error:', error);
      res.status(500).json({
        message: 'Failed to upload profile image',
        error: error.message
      });
    }
  },

  createPost: async (req, res) => {
    try {
      const { title, content } = req.body;
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const post = {
        title,
        content,
        author: user._id,
        isModeratorPost: user.role === 'moderator',
        status: user.role === 'admin' ? 'approved' : 'pending'
      };

      user.posts.push(post);
      await user.save();

      res.status(201).json({
        message: user.role === 'admin' ? 'Post created successfully' : 'Post submitted for approval',
        post
      });
    } catch (error) {
      console.error('Post creation error:', error);
      res.status(500).json({
        message: 'Failed to create post',
        error: error.message
      });
    }
  },

  approvePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const user = await User.findOne({ 'posts._id': postId });

      if (!user) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const post = user.posts.id(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (post.status === 'approved') {
        return res.status(400).json({ message: 'Post is already approved' });
      }

      post.status = 'approved';
      await user.save();

      res.json({
        message: 'Post approved successfully',
        post
      });
    } catch (error) {
      console.error('Post approval error:', error);
      res.status(500).json({
        message: 'Failed to approve post',
        error: error.message
      });
    }
  },

  createComment: async (req, res) => {
    try {
      const { content, postId } = req.body;
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const postAuthor = await User.findOne({ 'posts._id': postId });
      if (!postAuthor) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const comment = {
        content,
        post: postId,
        author: user._id
      };

      user.comments.push(comment);
      await user.save();

      res.status(201).json({
        message: 'Comment created successfully',
        comment
      });
    } catch (error) {
      console.error('Comment creation error:', error);
      res.status(500).json({
        message: 'Failed to create comment',
        error: error.message
      });
    }
  },

  deleteComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const user = await User.findOne({ 'comments._id': commentId });

      if (!user) {
        return res.status(404).json({ message: 'Comment not found' });
      }

      user.comments.id(commentId).remove();
      await user.save();

      res.json({
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Comment deletion error:', error);
      res.status(500).json({
        message: 'Failed to delete comment',
        error: error.message
      });
    }
  },
};

module.exports = {
  ...authController,
  refreshToken,
  createAccount: authController.createAccount
};