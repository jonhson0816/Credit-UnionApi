const express = require('express');
const router = express.Router();
const financialAccountController = require('../controllers/financialAccountController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware);

// Account routes
router.get('/stats', financialAccountController.getAccountStats);
router.get('/', financialAccountController.getAllAccounts);
router.post('/', financialAccountController.createAccount);
router.get('/:id', financialAccountController.getAccount);
router.put('/:id', financialAccountController.updateAccount);
router.delete('/:id', financialAccountController.deleteAccount);

module.exports = router;