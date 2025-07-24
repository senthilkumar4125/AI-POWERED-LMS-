const Course = require('../models/Course.model');
const User = require('../models/User.model');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload.middleware');

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Public
 */
exports.getCourses = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Build filter object
    const filter = { isPublished: true };
    
    // Search by title, description, or tags
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }
    
    // Filter by category
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Filter by level
    if (req.query.level) {
      filter.level = req.query.level;
    }
    
    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.pricing = {};
      if (req.query.minPrice) filter.pricing.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.pricing.$lte = parseFloat(req.query.maxPrice);
    }
    
    // Filter by instructor
    if (req.query.instructor) {
      filter.instructorId = req.query.instructor;
    }

    // Execute query with select to limit fields
    const courses = await Course.find(filter)
      .select('title subtitle category level pricing image ratings enrollmentCount instructorName')
      .skip(startIndex)
      .limit(limit)
      .sort(req.query.sort || '-createdAt');

    // Get total count
    const total = await Course.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    };

    res.status(200).json({
      success: true,
      count: courses.length,
      pagination,
      data: courses
    });
  } catch (error) {
    logger.error('Get all courses error:', error);
    next(error);
  }
};

/**
 * @desc    Get single course by ID or slug
 * @route   GET /api/courses/:id
 * @access  Public
 */
exports.getCourseById = async (req, res, next) => {
  try {
    // Check if param is ObjectId or slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    
    // Query by ID or slug
    const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id };
    
    // Find course
    const course = await Course.findOne(query);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('Get course by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Create new course
 * @route   POST /api/courses
 * @access  Private/Instructor
 */
exports.createCourse = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Get instructor details
    const instructor = await User.findById(req.user.id);
    
    // Create course
    const course = await Course.create({
      ...req.body,
      instructorId: req.user.id,
      instructorName: instructor.userName,
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    logger.error('Create course error:', error);
    next(error);
  }
};

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Private/Instructor
 */
exports.updateCourse = async (req, res, next) => {
  try {
    // Find course
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check course ownership
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this course'
      });
    }

    // Update last updated timestamp
    req.body.lastUpdated = Date.now();

    // Update course
    course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    logger.error('Update course error:', error);
    next(error);
  }
};

/**
 * @desc    Delete course
 * @route   DELETE /api/courses/:id
 * @access  Private/Instructor
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    // Find course
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check course ownership
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this course'
      });
    }

    // Delete course image from Cloudinary if exists
    if (course.public_id) {
      await deleteFromCloudinary(course.public_id);
    }

    // Delete course
    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    logger.error('Delete course error:', error);
    next(error);
  }
};

/**
 * @desc    Upload course image
 * @route   POST /api/courses/:instructorId/image
 * @access  Private/Instructor
 */
exports.uploadCourseImage = async (req, res, next) => {
  try {
    // Find course
    let course = await Course.findById(req.params.instructorId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check course ownership
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this course'
      });
    }

    // Delete old image if exists
    if (course.public_id) {
      await deleteFromCloudinary(course.public_id);
    }

    // Check if file exists in request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    // Use env variable to determine storage (local vs cloudinary)
    let imageUrl, public_id;

    if (process.env.NODE_ENV === 'production' && process.env.CLOUDINARY_CLOUD_NAME) {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.path, 'courses');
      imageUrl = result.url;
      public_id = result.public_id;
    } else {
      // Use local path
      imageUrl = `/uploads/${req.file.filename}`;
      public_id = null;
    }

    // Update course
    course = await Course.findByIdAndUpdate(
      req.params.id,
      { 
        image: imageUrl, 
        public_id,
        lastUpdated: Date.now()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Course image uploaded successfully',
      data: course
    });
  } catch (error) {
    logger.error('Upload course image error:', error);
    next(error);
  }
};

/**
 * @desc    Add lecture to course
 * @route   POST /api/courses/:id/lectures
 * @access  Private/Instructor
 */
exports.addLecture = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Find course
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check course ownership
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this course'
      });
    }

    // Add lecture
    course.curriculum.push(req.body);
    course.lastUpdated = Date.now();
    
    // Save course
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Lecture added successfully',
      data: course
    });
  } catch (error) {
    logger.error('Add lecture error:', error);
    next(error);
  }
};

/**
 * @desc    Update lecture
 * @route   PUT /api/courses/:id/lectures/:lectureId
 * @access  Private/Instructor
 */
exports.updateLecture = async (req, res, next) => {
  try {
    // Find course
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check course ownership
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this course'
      });
    }

    // Find lecture index
    const lectureIndex = course.curriculum.findIndex(
      lecture => lecture._id.toString() === req.params.lectureId
    );

    if (lectureIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Update lecture
    course.curriculum[lectureIndex] = {
      ...course.curriculum[lectureIndex].toObject(),
      ...req.body
    };
    course.lastUpdated = Date.now();

    // Save course
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Lecture updated successfully',
      data: course
    });
  } catch (error) {
    logger.error('Update lecture error:', error);
    next(error);
  }
};

/**
 * @desc    Delete lecture
 * @route   DELETE /api/courses/:id/lectures/:lectureId
 * @access  Private/Instructor
 */
exports.deleteLecture = async (req, res, next) => {
  try {
    // Find course
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check course ownership
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this course'
      });
    }

    // Find lecture
    const lecture = course.curriculum.id(req.params.lectureId);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Delete lecture video from storage if exists
    if (lecture.public_id) {
      await deleteFromCloudinary(lecture.public_id);
    }

    // Remove lecture
    lecture.deleteOne();
    course.lastUpdated = Date.now();
    
    // Save course
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Lecture deleted successfully',
      data: course
    });
  } catch (error) {
    logger.error('Delete lecture error:', error);
    next(error);
  }
};

/**
 * @desc    Upload lecture video
 * @route   POST /api/courses/:id/lectures/:lectureId/video
 * @access  Private/Instructor
 */
exports.uploadLectureVideo = async (req, res, next) => {
  try {
    // Find course
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check course ownership
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this course'
      });
    }

    // Find lecture index
    const lectureIndex = course.curriculum.findIndex(
      lecture => lecture._id.toString() === req.params.lectureId
    );

    if (lectureIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if file exists in request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a video'
      });
    }

    // Delete old video if exists
    if (course.curriculum[lectureIndex].public_id) {
      await deleteFromCloudinary(course.curriculum[lectureIndex].public_id);
    }

    // Use env variable to determine storage (local vs cloudinary)
    let videoUrl, public_id;

    if (process.env.NODE_ENV === 'production' && process.env.CLOUDINARY_CLOUD_NAME) {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.path, 'course-videos');
      videoUrl = result.url;
      public_id = result.public_id;
    } else {
      // Use local path
      videoUrl = `/uploads/${req.file.filename}`;
      public_id = null;
    }

    // Update lecture
    course.curriculum[lectureIndex].videoUrl = videoUrl;
    course.curriculum[lectureIndex].public_id = public_id;
    course.lastUpdated = Date.now();

    // Save course
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Lecture video uploaded successfully',
      data: course
    });
  } catch (error) {
    logger.error('Upload lecture video error:', error);
    next(error);
  }
};

/**
 * @desc    Get instructor courses
 * @route   GET /api/courses/instructor
 * @access  Private/Instructor
 */
exports.getInstructorCourses = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Find instructor courses
    const courses = await Course.find({ instructorId: req.user.id })
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');

    // Get total count
    const total = await Course.countDocuments({ instructorId: req.user.id });

    // Pagination result
    const pagination = {
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    };

    res.status(200).json({
      success: true,
      count: courses.length,
      pagination,
      data: courses
    });
  } catch (error) {
    logger.error('Get instructor courses error:', error);
    next(error);
  }
};

/**
 * @desc    Publish/Unpublish course
 * @route   PUT /api/courses/:id/publish
 * @access  Private/Instructor
 */
exports.togglePublishCourse = async (req, res, next) => {
  try {
    // Find course
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check course ownership
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this course'
      });
    }

    // Toggle published status
    const isPublished = !course.isPublished;
    
    // Update course
    course = await Course.findByIdAndUpdate(
      req.params.id,
      { 
        isPublished,
        publishedDate: isPublished ? Date.now() : undefined,
        lastUpdated: Date.now()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Course ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: course
    });
  } catch (error) {
    logger.error('Toggle publish course error:', error);
    next(error);
  }
};