const express = require('express');
const router = express.Router();
const financialEducationController = require('../controllers/financialEducationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public routes (no authentication required)
router.get('/articles', financialEducationController.getAllArticles);
router.get('/articles/:id', financialEducationController.getArticleById);
router.get('/quizzes', financialEducationController.getAllQuizzes);
router.get('/quizzes/:id', financialEducationController.getQuizById);
router.get('/categories', financialEducationController.getCategories);

// Protected routes (authentication required)
router.post('/articles/:id/like', authMiddleware, financialEducationController.toggleLikeArticle);
router.post('/articles/:id/save', authMiddleware, financialEducationController.toggleSaveArticle);
router.post('/articles/:id/complete', authMiddleware, financialEducationController.markArticleCompleted);
router.post('/quizzes/:id/submit', authMiddleware, financialEducationController.submitQuiz);
router.get('/progress', authMiddleware, financialEducationController.getUserProgress);

// Admin routes (admin only)
router.post('/articles', authMiddleware, roleMiddleware(['admin']), financialEducationController.createArticle);

module.exports = router;