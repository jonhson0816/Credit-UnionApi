const cors = require('cors');

// Always allow these origins regardless of environment
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:10000',
  'http://127.0.0.1:5173',
  'https://credito-app.com',
  'https://www.credito-app.com'
];

const corsConfig = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, same-origin)
    if (!origin) {
      console.log('✅ Request with no origin allowed');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS allowed for:', origin);
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked for:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
});

module.exports = corsConfig;