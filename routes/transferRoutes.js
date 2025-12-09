const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/history', transferController.getTransferHistory);
router.get('/calculate-fee', transferController.calculateTransferFee);

// Keep your existing route
router.post('/transfer', transferController.transferFunds);

// Add this NEW route for the frontend (this matches /api/transfers POST)
router.post('/', transferController.executeTransfer);

module.exports = router;