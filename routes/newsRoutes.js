const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
// If you want to protect admin routes, uncomment this:
// const authMiddleware = require('../middleware/authMiddleware');

// Public routes - Anyone can view news
router.get('/', newsController.getAllNews);
router.get('/featured', newsController.getFeaturedNews);
router.get('/recent', newsController.getRecentNews);
router.get('/categories', newsController.getCategories);
router.get('/:id', newsController.getNewsById);

// Admin routes - Uncomment and add authMiddleware when you want to protect these
// router.post('/', authMiddleware, newsController.createNews);
// router.put('/:id', authMiddleware, newsController.updateNews);
// router.delete('/:id', authMiddleware, newsController.deleteNews);

// For now, these are open (you can secure them later)
router.post('/', newsController.createNews);
router.put('/:id', newsController.updateNews);
router.delete('/:id', newsController.deleteNews);

module.exports = router;