const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');

// Budget endpoints
router.post('/', budgetController.createOrUpdateBudget);
router.get('/current', budgetController.getCurrentBudget);
router.get('/:year/:month', budgetController.getBudgetByMonth);
router.get('/insights', budgetController.getSpendingInsights);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;