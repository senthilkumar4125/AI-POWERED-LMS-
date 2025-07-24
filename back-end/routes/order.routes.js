const express = require('express');
const Order = require('../models/Order.model');
const logger = require('../utils/logger');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @desc    Get all orders (admin only)
 * @route   GET /api/orders
 * @access  Private/Admin
 */
router.get('/', protect, async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    if (req.query.status) {
      filter.orderStatus = req.query.status;
    }
    
    if (req.query.payment) {
      filter.paymentStatus = req.query.payment;
    }
    
    // Execute query
    const orders = await Order.find(filter)
      .skip(startIndex)
      .limit(limit)
      .sort('-orderDate');

    // Get total count
    const total = await Order.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    };

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination,
      data: orders
    });
  } catch (error) {
    logger.error('Get all orders error:', error);
    next(error);
  }
});

/**
 * @desc    Get instructor orders
 * @route   GET /api/orders/instructor
 * @access  Private/Instructor
 */
router.get('/instructor', protect, async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Build filter
    const filter = { instructorId: req.user.id };
    
    if (req.query.status) {
      filter.orderStatus = req.query.status;
    }
    
    if (req.query.payment) {
      filter.paymentStatus = req.query.payment;
    }
    
    // Execute query
    const orders = await Order.find(filter)
      .skip(startIndex)
      .limit(limit)
      .sort('-orderDate');

    // Get total count
    const total = await Order.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    };

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination,
      data: orders
    });
  } catch (error) {
    logger.error('Get instructor orders error:', error);
    next(error);
  }
});

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    if (
      order.userId.toString() !== req.user.id && 
      order.instructorId.toString() !== req.user.id && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Get order error:', error);
    next(error);
  }
});

/**
 * @desc    Update order status (admin only)
 * @route   PUT /api/orders/:id
 * @access  Private/Admin
 */
router.put('/:id', protect,async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    // Find order
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update fields
    if (orderStatus) {
      order.orderStatus = orderStatus;
    }
    
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    // Save order
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    next(error);
  }
});

module.exports = router;