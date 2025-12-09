const express = require('express');
const router = express.Router();
const careerController = require('../controllers/careerController');

// Public routes - Job listings
router.get('/jobs', careerController.getAllJobs);
router.get('/jobs/:id', careerController.getJobById);
router.get('/filter-options', careerController.getFilterOptions);

// Public routes - Application submission
router.post('/jobs/:jobId/apply', careerController.submitApplication);
router.get('/applications/:id', careerController.getApplicationById);

// Admin routes - Job management (Add authentication middleware in production)
router.post('/jobs', careerController.createJob);
router.put('/jobs/:id', careerController.updateJob);
router.delete('/jobs/:id', careerController.deleteJob);

// Admin routes - Application management (Add authentication middleware in production)
router.get('/jobs/:jobId/applications', careerController.getJobApplications);
router.patch('/applications/:id/status', careerController.updateApplicationStatus);

module.exports = router;