const express = require('express');
const {
  getEnrolledCourses,
  getEnrolledCourseDetails,
  markLectureCompleted,
  submitQuizAnswers,
  getInstructorStudents
} = require('../controllers/enrollment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Student routes
router.get('/', protect, getEnrolledCourses);
router.get('/:courseId', protect, getEnrolledCourseDetails);
router.post('/:courseId/lectures/:lectureId/complete', protect, markLectureCompleted);
router.post('/:courseId/quizzes/:lectureId', protect, submitQuizAnswers);

// Instructor routes
router.get('/instructor/students', protect, authorize('instructor', 'admin'), getInstructorStudents);

module.exports = router;