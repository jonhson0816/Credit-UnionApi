const rateLimit = require('express-rate-limit');

const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

module.exports = transactionLimiter;