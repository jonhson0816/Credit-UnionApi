require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');

// Import routes
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const financialGoalRoutes = require('./routes/financialGoalRoutes');
const loanRoutes = require('./routes/loanRoutes');
const financialAccountRoutes = require('./routes/financialAccountRoutes');
const financialTransferRoutes = require('./routes/financialTransferRoutes');
const transferRoutes = require('./routes/transferRoutes');
const profileRoutes = require('./routes/profileRoutes');
const budgetRoutes = require('./routes/budget');
const accountSettingsRoutes = require('./routes/accountSettingsRoute');
const accountDetailsRoutes = require('./routes/accountDetailsRoutes');
const securityRoutes = require('./routes/securityRoutes');
const transactionConfirmationRoutes = require('./routes/transactionConfirmationRoutes');
const helpCenterRoutes = require('./routes/helpCenterRoutes');
const atmLocatorRoutes = require('./routes/atmLocatorRoutes');
const branchLocatorRoutes = require('./routes/branchLocatorRoutes');
const mobileBankingRoutes = require('./routes/mobileBankingRoutes');
const financialEducationRoutes = require('./routes/financialEducationRoutes');
const careerRoutes = require('./routes/careerRoutes');
const newsRoutes = require('./routes/newsRoutes');
const contactRoutes = require('./routes/contactRoutes');

// Initialize express
const app = express();

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'NODE_ENV',
  'FRONTEND_URL'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is required`);
    process.exit(1);
  }
});

// Database connection with DNS override
const dns = require('dns');
const { Resolver } = require('dns').promises;

// Use Google's DNS servers to bypass local ISP DNS issues
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  retryReads: true,
};

// Test DNS resolution before connecting
const testDNS = async () => {
  try {
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);
    const addresses = await resolver.resolveSrv('_mongodb._tcp.clustermytech.sms2h.mongodb.net');
    console.log('✓ DNS resolution successful:', addresses.length, 'records found');
    return true;
  } catch (err) {
    console.error('✗ DNS resolution failed:', err.message);
    return false;
  }
};

// Connect with DNS test
(async () => {
  const dnsWorking = await testDNS();
  
  if (!dnsWorking) {
    console.log('⚠ DNS issues detected. This may cause connection problems.');
  }

  mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
    .then(() => console.log('✓ Connected to MongoDB'))
    .catch(err => {
      console.error('✗ MongoDB connection error:', err.message);
      console.error('Connection string (hidden password):', process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    });
})();

// Add connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✓ Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('✗ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠ Mongoose disconnected from MongoDB');
});

// Trust proxy if in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// CORS configuration - FIXED
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://credito-app.com',
      'http://127.0.0.1:5173',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // For development, allow all origins
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(cors(corsOptions));

// Middleware
app.use(compression());
app.use(process.env.NODE_ENV === 'production' ? morgan('combined') : morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files with CORS headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(5000, () => {
    res.status(408).json({ 
      status: 'error',
      message: 'Request timeout',
      code: 'REQUEST_TIMEOUT'
    });
  });
  next();
});

// Auth middleware
const authMiddleware = require('./middleware/authMiddleware');

// Rate limiter for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { 
    message: 'Too many login attempts. Please try again in 15 minutes.',
    error: 'Rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Authentication routes (no auth middleware needed)
app.use('/api/auth', loginLimiter, authRoutes);

// Help Center routes (mixed public/protected)
app.use('/api/help', helpCenterRoutes);

// ATM & Branch Locator routes (mixed public/protected)
app.use('/api/atm-locator', atmLocatorRoutes);
app.use('/api/branch-locator', branchLocatorRoutes);

// Financial Education routes (mixed public/protected)
app.use('/api/financial-education', financialEducationRoutes);

// Career routes (PUBLIC - no authentication required)
app.use('/api/careers', careerRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/contact', contactRoutes);

// Protected routes (require authentication)
app.use('/api/account-settings', authMiddleware, accountSettingsRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/transfers', authMiddleware, transferRoutes);
app.use('/api/financial-goals', authMiddleware, financialGoalRoutes);
app.use('/api/loans', authMiddleware, loanRoutes);
app.use('/api/financial-accounts', authMiddleware, financialAccountRoutes);
app.use('/api/financial-transfers', authMiddleware, financialTransferRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/budget', authMiddleware, budgetRoutes);
app.use('/api/account-details', authMiddleware, accountDetailsRoutes);
app.use('/api/security', authMiddleware, securityRoutes);
app.use('/api/transaction-confirmations', authMiddleware, transactionConfirmationRoutes);
app.use('/api/mobile-banking', authMiddleware, mobileBankingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message),
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      status: 'error',
      message: 'Duplicate record found',
      code: 'DUPLICATE_ERROR'
    });
  }
  
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found',
    code: 'NOT_FOUND'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;