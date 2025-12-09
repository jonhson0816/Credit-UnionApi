const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    required: true
  },
  device: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  success: {
    type: Boolean,
    default: true
  },
  userAgent: String
});

const activeSessionSchema = new mongoose.Schema({
  device: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  token: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String
});

const trustedDeviceSchema = new mongoose.Schema({
  deviceName: {
    type: String,
    required: true
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  deviceFingerprint: String,
  ipAddress: String
});

const securityQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  }
});

const alertPreferencesSchema = new mongoose.Schema({
  loginAlerts: {
    type: Boolean,
    default: true
  },
  transactionAlerts: {
    type: Boolean,
    default: true
  },
  largeTransactionAmount: {
    type: Number,
    default: 1000
  },
  securityAlerts: {
    type: Boolean,
    default: true
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: false
  },
  pushNotifications: {
    type: Boolean,
    default: true
  }
});

const securitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorMethod: {
    type: String,
    enum: ['sms', 'email', 'app'],
    default: 'sms'
  },
  twoFactorSecret: String,
  phoneNumber: String,
  securityQuestions: [securityQuestionSchema],
  alertPreferences: {
    type: alertPreferencesSchema,
    default: () => ({})
  },
  loginHistory: [loginHistorySchema],
  activeSessions: [activeSessionSchema],
  trustedDevices: [trustedDeviceSchema],
  passwordLastChanged: {
    type: Date,
    default: Date.now
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  lastLoginDate: Date,
  lastLoginLocation: String,
  lastLoginDevice: String
}, {
  timestamps: true
});

// Index for faster queries
securitySchema.index({ 'activeSessions.token': 1 });

// Method to add login history
securitySchema.methods.addLoginHistory = function(loginData) {
  this.loginHistory.unshift(loginData);
  // Keep only last 50 login records
  if (this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(0, 50);
  }
  this.lastLoginDate = new Date();
  this.lastLoginLocation = loginData.location;
  this.lastLoginDevice = loginData.device;
  return this.save();
};

// Method to add or update session
securitySchema.methods.addSession = function(sessionData) {
  // Mark all other sessions as not current
  this.activeSessions.forEach(session => {
    session.isCurrent = false;
  });
  
  // Add new session
  this.activeSessions.push({
    ...sessionData,
    isCurrent: true
  });
  
  return this.save();
};

// Method to remove session
securitySchema.methods.removeSession = function(sessionId) {
  this.activeSessions = this.activeSessions.filter(
    session => session._id.toString() !== sessionId
  );
  return this.save();
};

// Method to add trusted device
securitySchema.methods.addTrustedDevice = function(deviceData) {
  // Check if device already exists
  const existingDevice = this.trustedDevices.find(
    d => d.deviceFingerprint === deviceData.deviceFingerprint
  );
  
  if (existingDevice) {
    existingDevice.lastUsed = new Date();
  } else {
    this.trustedDevices.push(deviceData);
  }
  
  return this.save();
};

// Method to remove trusted device
securitySchema.methods.removeTrustedDevice = function(deviceId) {
  this.trustedDevices = this.trustedDevices.filter(
    device => device._id.toString() !== deviceId
  );
  return this.save();
};

// Static method to create default security settings
securitySchema.statics.createDefaultSettings = async function(userId) {
  return await this.create({
    userId,
    alertPreferences: {
      loginAlerts: true,
      transactionAlerts: true,
      largeTransactionAmount: 1000,
      securityAlerts: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true
    }
  });
};

const Security = mongoose.model('Security', securitySchema);

module.exports = Security;