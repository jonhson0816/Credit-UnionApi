const AccountSettings = require('../models/AccountSettings');
const User = require('../models/User');
const geoip = require('geoip-lite');

// Helper to get default settings for a new user
const getDefaultSettings = (userId, email) => {
  return {
    userId,
    notifications: {
      email: {
        enabled: false,
        frequency: 'daily',
        categories: {
          accountActivity: true,
          securityAlerts: true,
          promotions: false,
          newFeatures: true
        }
      },
      sms: {
        enabled: false,
        verifiedPhone: '',
        categories: {
          accountActivity: true,
          securityAlerts: true,
          promotions: false
        }
      },
      pushNotifications: {
        enabled: false,
        categories: {
          accountActivity: true,
          securityAlerts: true,
          promotions: false,
          newFeatures: true,
          balanceAlerts: true
        }
      }
    },
    securitySettings: {
      twoFactorAuthentication: {
        enabled: false,
        method: 'sms',
        lastVerified: null
      },
      biometricLogin: {
        enabled: false,
        supportedMethods: ['fingerprint', 'faceId'],
        lastConfigured: null
      },
      sessionManagement: {
        autoLogout: true,
        logoutAfterMinutes: 15
      },
      passwordManagement: {
        lastChanged: new Date()
      },
      activityAlerts: {
        loginAlerts: true,
        passwordChangeAlerts: true,
        profileUpdateAlerts: false
      },
      loginAlerts: {
        enabled: false,
        alertMethods: ['email'],
        sensitivityLevel: 'medium'
      },
      sessionTimeout: {
        enabled: true,
        timeoutMinutes: 15
      },
      recentLogins: []
    },
    displayPreferences: {
      theme: {
        mode: 'system',
        colorScheme: 'blue'
      },
      font: {
        size: 'medium',
        family: 'system'
      },
      layout: {
        compactMode: false,
        showAccountSummary: true,
        defaultDashboardView: 'overview'
      },
      accessibility: {
        highContrast: false,
        reduceMotion: false,
        screenReaderOptimized: false
      }
    },
    paperlessSettings: {
      paperlessStatements: false,
      emailForStatements: email,
      statementFormat: 'pdf',
      statementFrequency: 'monthly',
      includeInserts: true,
      archiveAccess: 24,
      documentDelivery: {
        taxDocuments: 'electronic',
        accountNotices: 'electronic',
        marketingMaterials: 'electronic'
      },
      statementHistory: {
        retentionPeriod: '7years'
      }
    },
    accountActivity: {
      lastLogin: new Date(),
      deviceCount: 1,
      pendingActions: [],
      accountStatus: 'active'
    }
  };
};

// Record a login event
const recordLoginActivity = async (userId, req) => {
  try {
    // Get IP address with fallbacks
    const ip = 
      req.headers['x-forwarded-for']?.split(',')[0].trim() || 
      req.headers['x-real-ip'] || 
      req.connection.remoteAddress || 
      '127.0.0.1';
    
    // Handle IPv6 localhost format
    const cleanIp = ip === '::1' ? '127.0.0.1' : ip;
    
    // Get location based on IP
    const geo = geoip.lookup(cleanIp) || { city: 'Unknown', region: 'Unknown', country: 'Unknown' };
    const location = `${geo.city || 'Unknown'}, ${geo.region || 'Unknown'}, ${geo.country || 'Unknown'}`;
    
    // Get device info from user agent
    const userAgent = req.headers['user-agent'] || 'Unknown';
    let device = 'Unknown Device';
    
    if (userAgent) {
      if (userAgent.includes('iPhone')) {
        device = 'iPhone';
      } else if (userAgent.includes('iPad')) {
        device = 'iPad';
      } else if (userAgent.includes('Android') && userAgent.includes('Mobile')) {
        device = 'Android Phone';
      } else if (userAgent.includes('Android')) {
        device = 'Android Tablet';
      } else if (userAgent.includes('Windows')) {
        device = userAgent.includes('Chrome') ? 'Chrome/Windows' : 
                userAgent.includes('Firefox') ? 'Firefox/Windows' : 
                userAgent.includes('Edge') ? 'Edge/Windows' : 'Windows';
      } else if (userAgent.includes('Mac')) {
        device = userAgent.includes('Safari') ? 'Safari/MacOS' : 
                userAgent.includes('Chrome') ? 'Chrome/MacOS' : 
                userAgent.includes('Firefox') ? 'Firefox/MacOS' : 'MacOS';
      } else if (userAgent.includes('Linux')) {
        device = 'Linux Device';
      }
    }
    
    // Create login record
    const loginRecord = {
      date: new Date(),
      device,
      location,
      ip: cleanIp
    };
    
    // Update the user's account settings
    const settings = await AccountSettings.findOneAndUpdate(
      { userId },
      { 
        $push: { 'securitySettings.recentLogins': { $each: [loginRecord], $slice: -10 } },
        $set: { 'accountActivity.lastLogin': new Date() },
        $inc: { 'accountActivity.deviceCount': 1 }
      },
      { new: true, upsert: true }
    );
    
    return loginRecord;
  } catch (error) {
    console.error('Error recording login activity:', error);
    return null;
  }
};

// Controller methods
const accountSettingsController = {
  // Get user's account settings
  getSettings: async (req, res) => {
    try {
      console.log('=== GET SETTINGS DEBUG ===');
      console.log('req.user:', req.user);
      
      // Your auth middleware sets req.user as the full user object with _id
      const userId = req.user._id || req.user.id;
      
      console.log('Extracted userId:', userId);
      
      if (!userId) {
        console.log('ERROR: No userId found');
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      let settings = await AccountSettings.findOne({ userId });
      console.log('Settings found:', settings ? 'Yes' : 'No');
      
      if (!settings) {
        console.log('Creating default settings...');
        const user = await User.findById(userId);
        if (!user) {
          console.log('ERROR: User not found in database');
          return res.status(404).json({ message: 'User not found' });
        }
        
        const defaultSettings = getDefaultSettings(userId, user.email);
        settings = await AccountSettings.findOneAndUpdate(
          { userId },
          { $setOnInsert: defaultSettings },
          { 
            new: true, 
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
          }
        );
        console.log('Default settings created');
      }
      
      console.log('Sending settings response');
      res.status(200).json(settings);
    } catch (error) {
      console.error('Error getting account settings:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Update user's account settings
  updateSettings: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const updates = req.body;
      
      // Prevent direct update of userId for security
      if (updates.userId) {
        delete updates.userId;
      }
      
      // Find and update settings
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { $set: updates },
        { new: true, runValidators: true, upsert: true }
      );
      
      res.status(200).json(settings);
    } catch (error) {
      console.error('Error updating account settings:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Update specific section of settings
  updateSettingsSection: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { section } = req.params;
      const updates = req.body;
      
      // Validate section name
      const validSections = ['notifications', 'securitySettings', 'displayPreferences', 'paperlessSettings', 'accountActivity'];
      if (!validSections.includes(section)) {
        return res.status(400).json({ message: 'Invalid settings section' });
      }
      
      // Create the update object with section as key
      const updateObj = { [section]: updates };
      
      // Find and update settings
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { $set: updateObj },
        { new: true, runValidators: true, upsert: true }
      );
      
      res.status(200).json({ 
        message: `${section} settings updated successfully`,
        [section]: settings[section]
      });
    } catch (error) {
      console.error(`Error updating ${req.params.section} settings:`, error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Update email for statements
  updateStatementEmail: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Validate email format
      const emailRegex = /\S+@\S+\.\S+/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      // Update email for statements
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { $set: { 'paperlessSettings.emailForStatements': email } },
        { new: true, runValidators: true, upsert: true }
      );
      
      res.status(200).json({ 
        message: 'Email updated successfully',
        email: settings.paperlessSettings.emailForStatements
      });
    } catch (error) {
      console.error('Error updating statement email:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Setup/update phone number
  updatePhone: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
      }
      
      // Simple phone validation (would be more complex in a real app)
      if (phoneNumber.length < 10) {
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
      
      // Update the phone number and enable SMS if not already enabled
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            'notifications.sms.verifiedPhone': phoneNumber,
            'notifications.sms.enabled': true
          } 
        },
        { new: true, runValidators: true, upsert: true }
      );
      
      res.status(200).json({ 
        message: 'Phone number updated successfully',
        phone: settings.notifications.sms.verifiedPhone,
        smsEnabled: settings.notifications.sms.enabled
      });
    } catch (error) {
      console.error('Error updating phone number:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Set up two-factor authentication
  setupTwoFactor: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { method } = req.body;
      
      if (!method || !['sms', 'email', 'authenticator'].includes(method)) {
        return res.status(400).json({ message: 'Valid 2FA method required' });
      }
      
      // If method is SMS, verify that user has a phone number
      if (method === 'sms') {
        const settings = await AccountSettings.findOne({ userId });
        if (!settings || !settings.notifications.sms.verifiedPhone) {
          return res.status(400).json({ 
            message: 'Phone number must be verified before enabling SMS 2FA' 
          });
        }
      }
      
      // Update the 2FA settings
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            'securitySettings.twoFactorAuthentication.enabled': true,
            'securitySettings.twoFactorAuthentication.method': method,
            'securitySettings.twoFactorAuthentication.lastVerified': new Date()
          } 
        },
        { new: true, runValidators: true, upsert: true }
      );
      
      res.status(200).json({ 
        message: '2FA set up successfully',
        twoFactor: settings.securitySettings.twoFactorAuthentication
      });
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Configure biometric login
  setupBiometric: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { methods } = req.body;
      
      if (!methods || !Array.isArray(methods) || methods.length === 0) {
        return res.status(400).json({ message: 'Valid biometric methods required' });
      }
      
      // Validate all methods are supported
      const validMethods = methods.every(method => 
        ['fingerprint', 'faceId'].includes(method)
      );
      
      if (!validMethods) {
        return res.status(400).json({ message: 'Invalid biometric method' });
      }
      
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            'securitySettings.biometricLogin.enabled': true,
            'securitySettings.biometricLogin.supportedMethods': methods,
            'securitySettings.biometricLogin.lastConfigured': new Date()
          } 
        },
        { new: true, runValidators: true, upsert: true }
      );
      
      res.status(200).json({ 
        message: 'Biometric login configured successfully',
        biometric: settings.securitySettings.biometricLogin
      });
    } catch (error) {
      console.error('Error configuring biometric login:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Record login activity
  recordLogin: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const loginRecord = await recordLoginActivity(userId, req);
      
      if (!loginRecord) {
        return res.status(500).json({ message: 'Failed to record login activity' });
      }
      
      res.status(200).json({ 
        message: 'Login activity recorded',
        loginRecord
      });
    } catch (error) {
      console.error('Error recording login:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Get all login activity
  getLoginActivity: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const settings = await AccountSettings.findOne({ userId });
      
      if (!settings) {
        return res.status(404).json({ message: 'Settings not found' });
      }
      
      res.status(200).json({
        recentLogins: settings.securitySettings.recentLogins,
        lastLogin: settings.accountActivity.lastLogin,
        deviceCount: settings.accountActivity.deviceCount
      });
    } catch (error) {
      console.error('Error getting login activity:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Toggle paperless statements
  togglePaperless: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'Enabled status must be a boolean' });
      }
      
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { $set: { 'paperlessSettings.paperlessStatements': enabled } },
        { new: true, runValidators: true, upsert: true }
      );
      
      res.status(200).json({ 
        message: `Paperless statements ${enabled ? 'enabled' : 'disabled'} successfully`,
        paperlessSettings: settings.paperlessSettings
      });
    } catch (error) {
      console.error('Error toggling paperless status:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Set notification preferences
  updateNotificationPreferences: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { channel, settings } = req.body;
      
      if (!channel || !['email', 'sms', 'pushNotifications'].includes(channel)) {
        return res.status(400).json({ message: 'Valid notification channel required' });
      }
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ message: 'Valid settings object required' });
      }
      
      // Create update object for the specific channel
      const updateObj = { [`notifications.${channel}`]: settings };
      
      const updatedSettings = await AccountSettings.findOneAndUpdate(
        { userId },
        { $set: updateObj },
        { new: true, runValidators: true, upsert: true }
      );
      
      res.status(200).json({ 
        message: `${channel} notification preferences updated successfully`,
        notifications: updatedSettings.notifications
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Clear pending actions
  clearPendingAction: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { action } = req.body;
      
      if (!action) {
        return res.status(400).json({ message: 'Action to clear is required' });
      }
      
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { $pull: { 'accountActivity.pendingActions': action } },
        { new: true }
      );
      
      if (!settings) {
        return res.status(404).json({ message: 'Settings not found' });
      }
      
      res.status(200).json({ 
        message: 'Pending action cleared successfully',
        pendingActions: settings.accountActivity.pendingActions
      });
    } catch (error) {
      console.error('Error clearing pending action:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Change password
  changePassword: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new passwords are required' });
      }
      
      // Validate new password meets requirements
      const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ 
          message: 'Password must be at least 8 characters long and include uppercase, number, and special character' 
        });
      }
      
      // Get the user
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password (assuming you have a comparePassword method on User model)
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      // Update password management in settings
      await AccountSettings.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            'securitySettings.passwordManagement.lastChanged': new Date()
          } 
        },
        { upsert: true }
      );
      
      res.status(200).json({ 
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Logout all other sessions
  logoutAllSessions: async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      
      // Clear all recent logins except keep deviceCount at 1 for current session
      const settings = await AccountSettings.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            'securitySettings.recentLogins': [],
            'accountActivity.deviceCount': 1
          } 
        },
        { new: true }
      );
      
      if (!settings) {
        return res.status(404).json({ message: 'Settings not found' });
      }
      
      res.status(200).json({ 
        message: 'All other sessions have been logged out successfully'
      });
    } catch (error) {
      console.error('Error logging out sessions:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

module.exports = accountSettingsController;