const express = require('express');
const { check } = require('express-validator');
const { 
  register, 
  login, 
  getMe, 
  changePassword,
  oauth
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Register user
router.post(
  '/register',
  [
    check('userName', 'Name is required').not().isEmpty(),
    check('userEmail', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('role').optional().isIn(['student', 'instructor'])
  ],
  register
);

// Login user
router.post(
  '/login',
  [
    check('userEmail', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  login
);

router.post('/oauth', oauth);

// Get current user
router.get('/me', protect, getMe);

// Change password
router.put(
  '/change-password',
  [
    protect,
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  changePassword
);

module.exports = router;