const express = require('express');
const router = express.Router();
const {
  submitContactInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry
} = require('../controllers/contactController');

const authMiddleware = require('../middleware/authMiddleware');

// Public route - Anyone can submit
router.post('/submit', submitContactInquiry);

// Protected routes - Admin only
router.get('/inquiries', authMiddleware, getAllInquiries);
router.get('/inquiries/:id', authMiddleware, getInquiryById);
router.patch('/inquiries/:id', authMiddleware, updateInquiryStatus);
router.delete('/inquiries/:id', authMiddleware, deleteInquiry);

module.exports = router;