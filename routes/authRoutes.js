const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage for profile images
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter
});

// Include multer middleware for register route
router.post('/register', upload.single('profileImage'), authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authMiddleware, authController.getProfile);
router.get('/verify', authController.verify);
router.post('/refresh-token', authController.refreshToken);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/accounts/create', authMiddleware, authController.createAccount);

router.post(
  '/admin/create',
  authMiddleware,
  roleMiddleware(['admin']),
  authController.createAdmin
);

router.post(
  '/moderator/create',
  authMiddleware,
  roleMiddleware(['admin']),
  authController.createModerator
);

// Post routes
router.post(
  '/posts/create',
  authMiddleware,
  roleMiddleware(['admin', 'moderator']),
  authController.createPost
);

router.put(
  '/posts/approve/:postId',
  authMiddleware,
  roleMiddleware(['admin']),
  authController.approvePost
);

// Comment routes
router.post(
  '/comments/create',
  authMiddleware,
  authController.createComment
);

router.delete(
  '/comments/:commentId',
  authMiddleware,
  roleMiddleware(['admin', 'moderator']),
  authController.deleteComment
);

router.post(
  '/profile/image/:userId',
  authMiddleware,
  roleMiddleware(['admin', 'moderator']),
  upload.single('profileImage'),
  authController.uploadProfileImage
);

module.exports = router;