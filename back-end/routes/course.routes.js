const express = require('express');
const { check } = require('express-validator');
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadCourseImage,
  addLecture,
  updateLecture,
  deleteLecture,
  uploadLectureVideo,
  getInstructorCourses,
  togglePublishCourse
} = require('../controllers/course.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

const router = express.Router();

// Public routes
router.get('/', getCourses);
router.get('/:id', getCourseById);

// Instructor routes
router.post(
  '/',
  [
    protect,
    authorize('instructor', 'admin'),
    check('title', 'Title is required').not().isEmpty(),
    check('category', 'Category is required').not().isEmpty(),
    check('level', 'Level is required').isIn(['beginner', 'intermediate', 'advanced', 'all-levels']),
    check('primaryLanguage', 'Primary language is required').not().isEmpty(),
    check('subtitle', 'Subtitle is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('pricing', 'Pricing is required').isNumeric()
  ],
  createCourse
);

router.get('/instructor/courses', protect,  getInstructorCourses);

router.put('/:id', protect,  updateCourse);
router.delete('/:id', protect,  deleteCourse);
router.put('/:id/publish', protect,  togglePublishCourse);

router.patch(
  '/:instructorId/image',
  protect,
  
  upload.single('image'),
  uploadCourseImage
);

router.patch(
  '/:id/lectures',
  [
    protect,
   
    check('title', 'Title is required').not().isEmpty()
  ],
  addLecture
);

router.put(
  '/:id/lectures/:lectureId',
  protect,

  updateLecture
);

router.delete(
  '/:id/lectures/:lectureId',
  protect,
  deleteLecture
);

router.post(
  '/:id/lectures/:lectureId/video',
  protect,
  upload.single('video'),
  uploadLectureVideo
);

module.exports = router;