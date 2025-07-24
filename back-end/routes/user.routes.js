const express = require('express');
const { check } = require('express-validator');
const {
  getUsers,
  getUserByEmail,
  updateProfile,
  updateUserRole,
  deleteUser,
  getInstructorProfile
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/multer');
const router = express.Router();

// Admin routes
router.get('/', protect, getUsers);
router.get('/:email', protect, getUserByEmail);
router.delete('/:id', protect, deleteUser);
// User routes
  router.patch('/', protect,upload.single('resume'), updateProfile);
// Public routes
router.get('/instructors/:id', getInstructorProfile);

module.exports = router;