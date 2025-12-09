// const express = require('express');
// const router = express.Router();
// const financialGoalController = require('../controllers/financialGoalController');
// const authController = require('../controllers/authController');
// const authMiddleware = require('../middleware/authMiddleware');
// const { validateFinancialGoal } = require('../middleware/validation');

// // Protect all routes after this middleware
// router.use(authMiddleware);

// // Regular routes
// router.get('/stats', financialGoalController.getGoalStats);

// // Goals CRUD routes
// router.get('/', financialGoalController.getAllGoals);
// router.post('/', validateFinancialGoal, financialGoalController.createGoal);

// router.get('/:id', financialGoalController.getGoal);
// router.put('/:id', validateFinancialGoal, financialGoalController.updateGoal);
// router.delete('/:id', financialGoalController.deleteGoal);

// router.patch('/:id/amount', financialGoalController.updateGoalAmount);

// module.exports = router;



const express = require('express');
const router = express.Router();
const financialGoalController = require('../controllers/financialGoalController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateFinancialGoal } = require('../middleware/validation');

// Protect all routes after this middleware
router.use(authMiddleware);

// Goal statistics
router.get('/stats', financialGoalController.getGoalStats);

// Goals CRUD routes
router.get('/', financialGoalController.getAllGoals);
router.post('/', validateFinancialGoal, financialGoalController.createGoal);

router.get('/:id', financialGoalController.getGoal);
router.put('/:id', validateFinancialGoal, financialGoalController.updateGoal);
router.delete('/:id', financialGoalController.deleteGoal);

// Special goal operations - new functionality
router.patch('/:id/amount', financialGoalController.updateGoalAmount);
router.patch('/:id/cancel', financialGoalController.cancelGoal);
router.patch('/:id/contribute', financialGoalController.contributeToGoal);

module.exports = router;