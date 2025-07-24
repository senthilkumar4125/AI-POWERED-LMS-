const express = require('express');
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayKey,
  getOrderHistory,
  getInstructorEarnings
} = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/razorpay/key', getRazorpayKey);

// Student routes
router.post('/razorpay/create-order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
router.get('/orders', protect, getOrderHistory);

// Instructor routes
router.get('/earnings', protect, authorize('instructor', 'admin'), getInstructorEarnings);

module.exports = router;