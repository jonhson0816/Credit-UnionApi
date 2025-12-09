const mongoose = require('mongoose');

const accountSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  notifications: {
    email: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'daily' },
      categories: {
        accountActivity: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
        newFeatures: { type: Boolean, default: true }
      }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      verifiedPhone: { type: String, default: '' },
      categories: {
        accountActivity: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false }
      }
    },
    pushNotifications: {
      enabled: { type: Boolean, default: false },
      categories: {
        accountActivity: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
        newFeatures: { type: Boolean, default: true },
        balanceAlerts: { type: Boolean, default: true }
      }
    }
  },
  securitySettings: {
    twoFactorAuthentication: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['sms', 'email', 'authenticator'], default: 'sms' },
      lastVerified: { type: Date, default: null }
    },
    biometricLogin: {
      enabled: { type: Boolean, default: false },
      supportedMethods: [{ type: String, enum: ['fingerprint', 'faceId'] }],
      lastConfigured: { type: Date, default: null }
    },
    sessionManagement: {
      autoLogout: { type: Boolean, default: true },
      logoutAfterMinutes: { type: Number, default: 15, min: 5, max: 120 }
    },
    passwordManagement: {
      lastChanged: { type: Date, default: Date.now }
    },
    activityAlerts: {
      loginAlerts: { type: Boolean, default: true },
      passwordChangeAlerts: { type: Boolean, default: true },
      profileUpdateAlerts: { type: Boolean, default: false }
    },
    loginAlerts: {
      enabled: { type: Boolean, default: false },
      alertMethods: [{ type: String, enum: ['email', 'sms'], default: 'email' }],
      sensitivityLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
    },
    sessionTimeout: {
      enabled: { type: Boolean, default: true },
      timeoutMinutes: { type: Number, default: 15, min: 1, max: 120 }
    },
    recentLogins: [{
      date: { type: Date, default: Date.now },
      device: { type: String, default: 'Unknown Device' },
      location: { type: String, default: 'Unknown Location' },
      ip: { type: String }
    }]
  },
  displayPreferences: {
    theme: {
      mode: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      colorScheme: { type: String, enum: ['blue', 'green', 'purple', 'orange', 'red'], default: 'blue' }
    },
    font: {
      size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      family: { type: String, enum: ['system', 'sans-serif', 'serif', 'monospace'], default: 'system' }
    },
    layout: {
      compactMode: { type: Boolean, default: false },
      showAccountSummary: { type: Boolean, default: true },
      defaultDashboardView: { type: String, enum: ['overview', 'transactions', 'budgets', 'goals'], default: 'overview' }
    },
    accessibility: {
      highContrast: { type: Boolean, default: false },
      reduceMotion: { type: Boolean, default: false },
      screenReaderOptimized: { type: Boolean, default: false }
    }
  },
  paperlessSettings: {
    paperlessStatements: { type: Boolean, default: false },
    emailForStatements: { 
      type: String,
      validate: {
        validator: function(v) {
          return /\S+@\S+\.\S+/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`
      },
      required: [true, 'Email for statements is required']
    },
    statementFormat: { type: String, enum: ['pdf', 'csv', 'both'], default: 'pdf' },
    statementFrequency: { type: String, enum: ['monthly', 'quarterly'], default: 'monthly' },
    includeInserts: { type: Boolean, default: true },
    archiveAccess: { type: Number, default: 24, min: 1, max: 84 },
    documentDelivery: {
      taxDocuments: { type: String, enum: ['electronic', 'paper', 'both'], default: 'electronic' },
      accountNotices: { type: String, enum: ['electronic', 'paper', 'both'], default: 'electronic' },
      marketingMaterials: { type: String, enum: ['electronic', 'paper', 'both', 'none'], default: 'electronic' }
    },
    statementHistory: {
      retentionPeriod: { type: String, enum: ['7years', '10years', 'indefinite'], default: '7years' }
    }
  },
  accountActivity: {
    lastLogin: { type: Date, default: Date.now },
    deviceCount: { type: Number, default: 0, min: 0 },
    pendingActions: [{ type: String }],
    accountStatus: { type: String, enum: ['active', 'suspended', 'locked'], default: 'active' }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for account age in days
accountSettingsSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Add pre-save middleware to ensure emailForStatements is set
accountSettingsSchema.pre('save', async function(next) {
  if (!this.paperlessSettings.emailForStatements) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId);
      if (user && user.email) {
        this.paperlessSettings.emailForStatements = user.email;
      }
    } catch (error) {
      console.error('Error setting default email for statements:', error);
    }
  }
  next();
});

const AccountSettings = mongoose.model('AccountSettings', accountSettingsSchema);
module.exports = AccountSettings;