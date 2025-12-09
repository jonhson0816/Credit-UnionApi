const express = require('express');
const router = express.Router();
const atmLocatorController = require('../controllers/atmLocatorController');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES (No Auth Required) ====================

// Search locations near coordinates
router.get('/search/nearby', atmLocatorController.searchNearby);

// Search by address/city/zip
router.get('/search/address', atmLocatorController.searchByAddress);

// Get single location details
router.get('/locations/:locationId', atmLocatorController.getLocationById);

// Get all available states
router.get('/states', atmLocatorController.getAvailableStates);

// Get cities by state
router.get('/states/:state/cities', atmLocatorController.getCitiesByState);

// Get reviews for a location
router.get('/locations/:locationId/reviews', atmLocatorController.getLocationReviews);

// Get location statistics
router.get('/stats', atmLocatorController.getLocationStats);

// ==================== PROTECTED ROUTES (Auth Required) ====================

// Favorites
router.post('/favorites', authMiddleware, atmLocatorController.addFavorite);
router.get('/favorites', authMiddleware, atmLocatorController.getFavorites);
router.delete('/favorites/:locationId', authMiddleware, atmLocatorController.removeFavorite);

// Reviews
router.post('/reviews', authMiddleware, atmLocatorController.submitReview);
router.patch('/reviews/:reviewId/helpful', authMiddleware, atmLocatorController.markReviewHelpful);

module.exports = router;