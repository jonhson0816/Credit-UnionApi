const express = require('express');
const router = express.Router();
const branchLocatorController = require('../controllers/branchLocatorController');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES (No Auth Required) ====================

// Search branches near coordinates
router.get('/search/nearby', branchLocatorController.searchBranchesNearby);

// Search branches by address/city/state
router.get('/search/address', branchLocatorController.searchBranchesByAddress);

// Get single branch details
router.get('/branches/:branchId', branchLocatorController.getBranchById);

// Get all states with branches
router.get('/states', branchLocatorController.getStatesWithBranches);

// Get cities with branches by state
router.get('/states/:state/cities', branchLocatorController.getCitiesWithBranches);

// Get branches by state
router.get('/states/:state/branches', branchLocatorController.getBranchesByState);

// Get branches by city
router.get('/states/:state/cities/:city/branches', branchLocatorController.getBranchesByCity);

// Get branches by specific service
router.get('/services/:service', branchLocatorController.getBranchesByService);

// Get military base branches
router.get('/military-bases', branchLocatorController.getMilitaryBaseBranches);

// Get branch statistics
router.get('/stats', branchLocatorController.getBranchStats);

// ==================== PROTECTED ROUTES (Auth Required) ====================

// Schedule appointment at branch
router.post('/appointments', authMiddleware, branchLocatorController.scheduleBranchAppointment);

module.exports = router;