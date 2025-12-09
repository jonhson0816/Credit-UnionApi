const express = require('express');
const router = express.Router();
const helpCenterController = require('../controllers/helpCenterController');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES (No Auth Required) ====================

// Get all help categories
router.get('/categories', helpCenterController.getCategories);

// Get articles by category
router.get('/categories/:categoryId/articles', helpCenterController.getArticlesByCategory);

// Get single article by slug
router.get('/articles/:slug', helpCenterController.getArticleBySlug);

// Search articles
router.get('/search', helpCenterController.searchArticles);

// Get popular articles
router.get('/popular', helpCenterController.getPopularArticles);

// Get featured articles
router.get('/featured', helpCenterController.getFeaturedArticles);

// Get article feedback stats (public)
router.get('/articles/:articleId/feedback-stats', helpCenterController.getArticleFeedbackStats);

// ==================== PROTECTED ROUTES (Auth Required) ====================

// Submit article feedback (optional auth - can be anonymous)
router.post('/feedback', helpCenterController.submitFeedback);

// Support ticket routes (all require authentication)
router.post('/tickets', authMiddleware, helpCenterController.createSupportTicket);
router.get('/tickets', authMiddleware, helpCenterController.getUserTickets);
router.get('/tickets/:ticketId', authMiddleware, helpCenterController.getTicketById);
router.post('/tickets/:ticketId/messages', authMiddleware, helpCenterController.addTicketMessage);
router.patch('/tickets/:ticketId/close', authMiddleware, helpCenterController.closeTicket);

// Get help center statistics (requires authentication)
router.get('/stats', authMiddleware, helpCenterController.getHelpCenterStats);

module.exports = router;