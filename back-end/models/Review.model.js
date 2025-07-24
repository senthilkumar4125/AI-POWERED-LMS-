const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    required: true
  },
  reply: {
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    instructorName: String,
    content: String,
    date: {
      type: Date,
      default: Date.now
    }
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure one review per user per course
ReviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema);