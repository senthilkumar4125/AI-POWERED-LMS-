const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  orderStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending"
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending"
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  paymentId: String,
  payerId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  instructorName: {
    type: String,
    required: true
  },
  courseImage: String,
  courseTitle: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  coursePricing: {
    type: Number,
    required: true
  },
  couponApplied: {
    code: String,
    discountAmount: Number
  },
  finalAmount: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Index for faster lookups
OrderSchema.index({ userId: 1 });
OrderSchema.index({ courseId: 1 });
OrderSchema.index({ instructorId: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("Order", OrderSchema);