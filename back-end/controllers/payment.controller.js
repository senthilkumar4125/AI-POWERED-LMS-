const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order.model');
const Course = require('../models/Course.model');
const StudentCourses = require('../models/StudentCourses.model');
const User = require('../models/User.model');
const logger = require('../utils/logger');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * @desc    Create Razorpay order
 * @route   POST /api/payments/razorpay/create-order
 * @access  Private
 */
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    // Validate course ID
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is published
    if (!course.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Course is not published'
      });
    }

    // Check if user already enrolled in the course
    const studentCourses = await StudentCourses.findOne({ userId: req.user.id });
    if (studentCourses) {
      const isEnrolled = studentCourses.courses.some(c => c.courseId.toString() === courseId);
      if (isEnrolled) {
        return res.status(400).json({
          success: false,
          message: 'You are already enrolled in this course'
        });
      }
    }

    // Get course price
    const amount = course.salePrice && new Date() < new Date(course.saleEndDate) 
      ? course.salePrice * 100 // Razorpay amount in paise (INR)
      : course.pricing * 100;

    // Create Razorpay order
    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_order_${courseId}`,
      notes: {
        courseId,
        userId: req.user.id
      }
    };

    const order = await razorpay.orders.create(options);

    // Return success response with order details
    res.status(200).json({
      success: true,
      data: {
        order_id: order.id,
        currency: order.currency,
        amount: order.amount,
        course: {
          id: course._id,
          title: course.title,
          image: course.image
        }
      }
    });
  } catch (error) {
    logger.error('Create Razorpay order error:', error);
    next(error);
  }
};

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/payments/razorpay/verify
 * @access  Private
 */
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Get payment details
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Create order record
    const order = await Order.create({
      userId: req.user.id,
      userName: req.user.userName,
      userEmail: req.user.userEmail,
      orderStatus: 'completed',
      paymentMethod: 'razorpay',
      paymentStatus: payment.status === 'captured' ? 'completed' : 'pending',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      instructorId: course.instructorId,
      instructorName: course.instructorName,
      courseImage: course.image,
      courseTitle: course.title,
      courseId: course._id,
      coursePricing: payment.amount / 100, // Convert from paise to INR
      finalAmount: payment.amount / 100
    });

    // Add course to student's enrolled courses
    let studentCourses = await StudentCourses.findOne({ userId: req.user.id });
    
    if (!studentCourses) {
      studentCourses = new StudentCourses({
        userId: req.user.id,
        courses: []
      });
    }

    // Add course to student's list
    studentCourses.courses.push({
      courseId: course._id,
      title: course.title,
      instructorId: course.instructorId,
      instructorName: course.instructorName,
      dateOfPurchase: Date.now(),
      courseImage: course.image
    });

    await studentCourses.save();

    // Increment course enrollment count
    await Course.findByIdAndUpdate(
      courseId,
      { $inc: { enrollmentCount: 1 } }
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Payment verified and enrollment successful',
      data: {
        order,
        enrollment: studentCourses.courses[studentCourses.courses.length - 1]
      }
    });
  } catch (error) {
    logger.error('Verify Razorpay payment error:', error);
    next(error);
  }
};

/**
 * @desc    Get Razorpay key
 * @route   GET /api/payments/razorpay/key
 * @access  Public
 */
exports.getRazorpayKey = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      key: process.env.RAZORPAY_KEY_ID
    }
  });
};

/**
 * @desc    Get order history
 * @route   GET /api/payments/orders
 * @access  Private
 */
exports.getOrderHistory = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get user's orders
    const orders = await Order.find({ userId: req.user.id })
      .sort('-orderDate')
      .skip(startIndex)
      .limit(limit);

    // Get total count
    const total = await Order.countDocuments({ userId: req.user.id });

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
    logger.error('Get order history error:', error);
    next(error);
  }
};

/**
 * @desc    Get instructor earnings
 * @route   GET /api/payments/earnings
 * @access  Private/Instructor
 */
exports.getInstructorEarnings = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get instructor's orders
    const orders = await Order.find({ 
      instructorId: req.user.id,
      paymentStatus: 'completed' 
    })
      .sort('-orderDate')
      .skip(startIndex)
      .limit(limit);

    // Get total count
    const total = await Order.countDocuments({ 
      instructorId: req.user.id,
      paymentStatus: 'completed'
    });

    // Calculate total earnings
    const totalEarnings = await Order.aggregate([
      { 
        $match: { 
          instructorId: req.user.id, 
          paymentStatus: 'completed' 
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' }
        }
      }
    ]);

    // Pagination result
    const pagination = {
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    };

    res.status(200).json({
      success: true,
      totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
      count: orders.length,
      pagination,
      data: orders
    });
  } catch (error) {
    logger.error('Get instructor earnings error:', error);
    next(error);
  }
};