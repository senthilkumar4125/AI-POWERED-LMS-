const User = require('../models/User.model');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Filtering
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.search) {
      filter.$or = [
        { userName: { $regex: req.query.search, $options: 'i' } },
        { userEmail: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Execute query
    const users = await User.find(filter)
      .select('-password')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count
    const total = await User.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    };

    res.status(200).json({
      success: true,
      count: users.length,
      pagination,
      data: users
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    next(error);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUserByEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({ userEmail: req.params.email }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
// exports.updateProfile = async (req, res, next) => { 
//   const body = req.body;
//   const userEmail = req.user.userEmail || body.userEmail;
//   const user = await User.findOne({ userEmail });
//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: 'User not found'
//     });
//   }
//   try {
//     const user = await User.findOne({ userEmail });
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     // Handle resume upload if exists
//     if (req.file) {
//       const result = await cloudinary.uploader.upload(req.file.path, {
//         resource_type: 'raw', // for non-image files like PDF
//         folder: 'resumes'
//       });
//       body.resumeUrl = result.secure_url;
//     }
//     const updatedUser = await User.findOneAndUpdate({ userEmail }, body, { new: true, runValidators: true }).select('-password');
//     res.status(200).json({
//       success: true,
//       message: 'Profile updated successfully',
//       data: updatedUser
//     });
//   } catch (error) {
//     logger.error('Update profile error:', error);
//     next(error);
//   }

// };

exports.updateProfile = async (req, res, next) => {
  try {
    const body = req.body;
    const userEmail = req.user.userEmail || body.userEmail;

    const user = await User.findOne({ userEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Save resume file path if file was uploaded
    if (req.file) {
      body.resumeUrl = `/uploads/resumes/${req.file.filename}`; // store relative path
    }

    const updatedUser = await User.findOneAndUpdate(
      { userEmail },
      body,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
};



/**
 * @desc    Update user role (Admin only)
 * @route   PUT /api/users/:id/role
 * @access  Private/Admin
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    // Validate role
    if (!role || !['student', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required (student, instructor, or admin)'
      });
    }

    // Update user role
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user
    });
  } catch (error) {
    logger.error('Update user role error:', error);
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Do not allow deleting own account
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

/**
 * @desc    Get instructor public profile
 * @route   GET /api/users/instructors/:id
 * @access  Public
 */
exports.getInstructorProfile = async (req, res, next) => {
  try {
    const instructor = await User.findOne({
      _id: req.params.id,
      role: 'instructor'
    }).select('userName userEmail role qualification skills socialLinks');

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: instructor
    });
  } catch (error) {
    logger.error('Get instructor profile error:', error);
    next(error);
  }
};