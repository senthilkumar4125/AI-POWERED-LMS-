const StudentCourses = require('../models/StudentCourses.model');
const Course = require('../models/Course.model');
const logger = require('../utils/logger');

/**
 * @desc    Get student enrolled courses
 * @route   GET /api/enrollments
 * @access  Private
 */
exports.getEnrolledCourses = async (req, res, next) => {
  try {
    // Find student's courses
    const studentCourses = await StudentCourses.findOne({ userId: req.user.id });

    if (!studentCourses) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    res.status(200).json({
      success: true,
      count: studentCourses.courses.length,
      data: studentCourses.courses
    });
  } catch (error) {
    logger.error('Get enrolled courses error:', error);
    next(error);
  }
};

/**
 * @desc    Get enrolled course details
 * @route   GET /api/enrollments/:courseId
 * @access  Private
 */
exports.getEnrolledCourseDetails = async (req, res, next) => {
  try {
    // Find student's courses
    const studentCourses = await StudentCourses.findOne({ 
      userId: req.user.id,
      'courses.courseId': req.params.courseId
    });

    if (!studentCourses) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Find the enrolled course
    const enrolledCourse = studentCourses.courses.find(
      course => course.courseId.toString() === req.params.courseId
    );

    if (!enrolledCourse) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Get full course details
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        course,
        progress: enrolledCourse.progress,
        completedLectures: enrolledCourse.completedLectures,
        lastAccessed: enrolledCourse.lastAccessed,
        quizScores: enrolledCourse.quizScores
      }
    });
  } catch (error) {
    logger.error('Get enrolled course details error:', error);
    next(error);
  }
};

/**
 * @desc    Mark lecture as completed
 * @route   POST /api/enrollments/:courseId/lectures/:lectureId/complete
 * @access  Private
 */
exports.markLectureCompleted = async (req, res, next) => {
  try {
    // Find student's courses
    const studentCourses = await StudentCourses.findOne({ userId: req.user.id });

    if (!studentCourses) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in any courses'
      });
    }

    // Find course index
    const courseIndex = studentCourses.courses.findIndex(
      course => course.courseId.toString() === req.params.courseId
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Get the course
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if lectureId is valid
    const lectureExists = course.curriculum.some(
      lecture => lecture._id.toString() === req.params.lectureId
    );

    if (!lectureExists) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Add to completed lectures if not already completed
    const completedLectures = studentCourses.courses[courseIndex].completedLectures || [];
    
    if (!completedLectures.includes(req.params.lectureId)) {
      completedLectures.push(req.params.lectureId);
    }

    // Calculate progress
    const progress = Math.floor(
      (completedLectures.length / course.curriculum.length) * 100
    );

    // Update student courses
    studentCourses.courses[courseIndex].completedLectures = completedLectures;
    studentCourses.courses[courseIndex].progress = progress;
    studentCourses.courses[courseIndex].lastAccessed = Date.now();

    await studentCourses.save();

    res.status(200).json({
      success: true,
      message: 'Lecture marked as completed',
      data: {
        progress,
        completedLectures
      }
    });
  } catch (error) {
    logger.error('Mark lecture completed error:', error);
    next(error);
  }
};

/**
 * @desc    Submit quiz answers
 * @route   POST /api/enrollments/:courseId/quizzes/:lectureId
 * @access  Private
 */
exports.submitQuizAnswers = async (req, res, next) => {
  try {
    const { answers } = req.body;

    // Validate answers
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide answers as an array'
      });
    }

    // Find student's courses
    const studentCourses = await StudentCourses.findOne({ userId: req.user.id });

    if (!studentCourses) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in any courses'
      });
    }

    // Find course index
    const courseIndex = studentCourses.courses.findIndex(
      course => course.courseId.toString() === req.params.courseId
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Get the course
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
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

    // Check if lecture has quiz
    if (!lecture.questions || lecture.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This lecture does not have a quiz'
      });
    }

    // Score the quiz
    let score = 0;
    const totalQuestions = lecture.questions.length;

    answers.forEach(answer => {
      const question = lecture.questions.find(q => q._id.toString() === answer.questionId);
      if (question && question.correctAnswer === answer.selectedAnswer) {
        score++;
      }
    });

    // Add to quiz scores
    const quizScores = studentCourses.courses[courseIndex].quizScores || [];
    
    // Check if quiz already attempted
    const quizIndex = quizScores.findIndex(q => q.quizId.toString() === req.params.lectureId);
    
    if (quizIndex !== -1) {
      // Update existing score if better
      if (score > quizScores[quizIndex].score) {
        quizScores[quizIndex].score = score;
        quizScores[quizIndex].dateTaken = Date.now();
      }
    } else {
      // Add new score
      quizScores.push({
        quizId: req.params.lectureId,
        score,
        totalQuestions,
        dateTaken: Date.now()
      });
    }

    // Update student courses
    studentCourses.courses[courseIndex].quizScores = quizScores;
    studentCourses.courses[courseIndex].lastAccessed = Date.now();

    await studentCourses.save();

    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        score,
        totalQuestions,
        percentage: Math.floor((score / totalQuestions) * 100)
      }
    });
  } catch (error) {
    logger.error('Submit quiz answers error:', error);
    next(error);
  }
};

/**
 * @desc    Get instructor's students
 * @route   GET /api/enrollments/instructor/students
 * @access  Private/Instructor
 */
exports.getInstructorStudents = async (req, res, next) => {
  try {
    // Find instructor's courses
    const courses = await Course.find({ instructorId: req.user.id })
      .select('_id title');
    
    if (courses.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get course IDs
    const courseIds = courses.map(course => course._id);

    // Find students enrolled in instructor's courses
    const enrollments = await StudentCourses.aggregate([
      {
        $match: {
          'courses.courseId': { $in: courseIds }
        }
      },
      {
        $project: {
          userId: 1,
          courses: {
            $filter: {
              input: '$courses',
              as: 'course',
              cond: { $in: ['$$course.courseId', courseIds] }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 0,
          userId: 1,
          userName: '$userDetails.userName',
          userEmail: '$userDetails.userEmail',
          courses: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    logger.error('Get instructor students error:', error);
    next(error);
  }
};