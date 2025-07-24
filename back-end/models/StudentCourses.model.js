const mongoose = require("mongoose");

const StudentCoursesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  courses: [
    {
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
      },
      title: {
        type: String,
        required: true
      },
      instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      instructorName: {
        type: String,
        required: true
      },
      dateOfPurchase: {
        type: Date,
        default: Date.now
      },
      courseImage: String,
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      completedLectures: [{
        type: mongoose.Schema.Types.ObjectId
      }],
      lastAccessed: {
        type: Date,
        default: Date.now
      },
      quizScores: [{
        quizId: mongoose.Schema.Types.ObjectId,
        score: Number,
        totalQuestions: Number,
        dateTaken: {
          type: Date,
          default: Date.now
        }
      }]
    },
  ],
}, { timestamps: true });

// Index for faster lookups
StudentCoursesSchema.index({ userId: 1 });
StudentCoursesSchema.index({ "courses.courseId": 1 });

module.exports = mongoose.model("StudentCourses", StudentCoursesSchema);