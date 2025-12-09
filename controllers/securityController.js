const Security = require('../models/Security');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Helper function to get device info from user agent
const getDeviceInfo = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('Linux')) return 'Linux';
  
  return 'Unknown Device';
};

// Helper function to get browser info
const getBrowserInfo = (userAgent) => {
  if (!userAgent) return 'Unknown Browser';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  
  return 'Unknown Browser';
};

// Get security settings
exports.getSecuritySettings = async (req, res) => {
  try {
    let security = await Security.findOne({ userId: req.user._id });
    
    // Create default security settings if none exist
    if (!security) {
      security = await Security.createDefaultSettings(req.user._id);
    }
    
    // Remove sensitive data
    const securityData = security.toObject();
    delete securityData.twoFactorSecret;
    
    // Hash security question answers for privacy
    if (securityData.securityQuestions) {
      securityData.securityQuestions = securityData.securityQuestions.map(q => ({
        question: q.question,
        answer: q.answer ? '********' : '',
        _id: q._id
      }));
    }
    
    res.json({
      success: true,
      data: securityData
    });
  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching security settings'
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }
    
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    // Update security record
    let security = await Security.findOne({ userId: req.user._id });
    if (!security) {
      security = await Security.createDefaultSettings(req.user._id);
    }
    
    security.passwordLastChanged = new Date();
    await security.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

// Enable 2FA
exports.enable2FA = async (req, res) => {
  try {
    const { method, phoneNumber } = req.body;
    
    if (!method || !['sms', 'email', 'app'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA method'
      });
    }
    
    if (method === 'sms' && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for SMS verification'
      });
    }
    
    let security = await Security.findOne({ userId: req.user._id });
    
    if (!security) {
      security = await Security.createDefaultSettings(req.user._id);
    }
    
    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    
    // In production, send actual SMS/Email
    // For now, we'll just log it
    console.log(`2FA Verification Code for ${req.user.email}: ${verificationCode}`);
    
    // Store verification code temporarily (in production, use Redis)
    security.twoFactorSecret = await bcrypt.hash(verificationCode, 10);
    security.twoFactorMethod = method;
    
    if (method === 'sms') {
      security.phoneNumber = phoneNumber;
    }
    
    await security.save();
    
    res.json({
      success: true,
      message: 'Verification code sent successfully',
      // Only for development - remove in production
      devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enabling 2FA'
    });
  }
};

// Verify 2FA
exports.verify2FA = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || code.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    const security = await Security.findOne({ userId: req.user._id });
    
    if (!security || !security.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'No pending 2FA setup found'
      });
    }
    
    // Verify code
    const isValidCode = await bcrypt.compare(code, security.twoFactorSecret);
    
    if (!isValidCode) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    // Enable 2FA
    security.twoFactorEnabled = true;
    security.twoFactorSecret = crypto.randomBytes(32).toString('hex'); // Generate permanent secret
    await security.save();
    
    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA code'
    });
  }
};

// Disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const security = await Security.findOne({ userId: req.user._id });
    
    if (!security) {
      return res.status(404).json({
        success: false,
        message: 'Security settings not found'
      });
    }
    
    security.twoFactorEnabled = false;
    security.twoFactorSecret = undefined;
    await security.save();
    
    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling 2FA'
    });
  }
};

// Save security questions
// Save security questions
exports.saveSecurityQuestions = async (req, res) => {
  try {
    let { questions } = req.body;
    
    // Log incoming data for debugging
    console.log('Received security questions:', JSON.stringify(req.body, null, 2));
    
    // Handle different payload formats
    if (!questions) {
      questions = [];
    }
    
    // Ensure questions is an array
    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: 'Questions must be provided as an array'
      });
    }
    
    // Filter out empty questions
    questions = questions.filter(q => q && q.question && q.answer);
    
    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one security question with an answer'
      });
    }
    
    if (questions.length < 3) {
      return res.status(400).json({
        success: false,
        message: `You have only filled ${questions.length} question(s). Please fill all 3 security questions.`
      });
    }
    
    if (questions.length > 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 3 security questions allowed'
      });
    }
    
    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.question || typeof q.question !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1}: Invalid question format`
        });
      }
      
      if (!q.answer || typeof q.answer !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1}: Invalid answer format`
        });
      }
      
      if (q.answer.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1}: Answer must be at least 2 characters`
        });
      }
    }
    
    // Check for duplicate questions
    const questionTexts = questions.map(q => q.question.toLowerCase().trim());
    const uniqueQuestions = new Set(questionTexts);
    if (uniqueQuestions.size !== questions.length) {
      return res.status(400).json({
        success: false,
        message: 'Please select different questions for each security question'
      });
    }
    
    let security = await Security.findOne({ userId: req.user._id });
    
    if (!security) {
      security = await Security.createDefaultSettings(req.user._id);
    }
    
    // Hash answers for security
    const hashedQuestions = await Promise.all(
      questions.map(async (q) => ({
        question: q.question.trim(),
        answer: await bcrypt.hash(q.answer.toLowerCase().trim(), 10)
      }))
    );
    
    security.securityQuestions = hashedQuestions;
    await security.save();
    
    console.log('Security questions saved successfully for user:', req.user._id);
    
    res.json({
      success: true,
      message: 'Security questions saved successfully!'
    });
  } catch (error) {
    console.error('Save security questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving security questions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Save alert preferences
exports.saveAlertPreferences = async (req, res) => {
  try {
    const alertPreferences = req.body;
    
    let security = await Security.findOne({ userId: req.user._id });
    
    if (!security) {
      security = await Security.createDefaultSettings(req.user._id);
    }
    
    security.alertPreferences = {
      ...security.alertPreferences,
      ...alertPreferences
    };
    
    await security.save();
    
    res.json({
      success: true,
      message: 'Alert preferences saved successfully'
    });
  } catch (error) {
    console.error('Save alert preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving alert preferences'
    });
  }
};

// Terminate session
exports.terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const security = await Security.findOne({ userId: req.user._id });
    
    if (!security) {
      return res.status(404).json({
        success: false,
        message: 'Security settings not found'
      });
    }
    
    const session = security.activeSessions.id(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (session.isCurrent) {
      return res.status(400).json({
        success: false,
        message: 'Cannot terminate current session'
      });
    }
    
    await security.removeSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error terminating session'
    });
  }
};

// Remove trusted device
exports.removeTrustedDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const security = await Security.findOne({ userId: req.user._id });
    
    if (!security) {
      return res.status(404).json({
        success: false,
        message: 'Security settings not found'
      });
    }
    
    await security.removeTrustedDevice(deviceId);
    
    res.json({
      success: true,
      message: 'Trusted device removed successfully'
    });
  } catch (error) {
    console.error('Remove trusted device error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing trusted device'
    });
  }
};

// Add login history (called by auth controller)
exports.addLoginHistory = async (userId, ipAddress, userAgent, success = true) => {
  try {
    let security = await Security.findOne({ userId });
    
    if (!security) {
      security = await Security.createDefaultSettings(userId);
    }
    
    const device = `${getBrowserInfo(userAgent)} on ${getDeviceInfo(userAgent)}`;
    
    await security.addLoginHistory({
      timestamp: new Date(),
      location: 'Toronto, ON, Canada', // In production, use IP geolocation service
      device,
      ipAddress,
      success,
      userAgent
    });
    
    return security;
  } catch (error) {
    console.error('Add login history error:', error);
    throw error;
  }
};

// Add session (called by auth controller)
exports.addSession = async (userId, token, ipAddress, userAgent) => {
  try {
    let security = await Security.findOne({ userId });
    
    if (!security) {
      security = await Security.createDefaultSettings(userId);
    }
    
    const device = `${getBrowserInfo(userAgent)} on ${getDeviceInfo(userAgent)}`;
    
    await security.addSession({
      device,
      location: 'Toronto, ON', // In production, use IP geolocation service
      token,
      ipAddress,
      userAgent,
      lastActive: new Date()
    });
    
    return security;
  } catch (error) {
    console.error('Add session error:', error);
    throw error;
  }
};

module.exports = exports;