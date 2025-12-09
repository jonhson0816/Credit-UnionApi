const express = require('express');
const router = express.Router();
const financialTransferController = require('../controllers/financialTransferController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware);

// Transfer routes
router.get('/stats', financialTransferController.getTransferStats);
router.get('/', financialTransferController.getTransfers);
router.post('/', financialTransferController.createTransfer);
router.get('/:id', financialTransferController.getTransfer);

module.exports = router;