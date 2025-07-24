const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
    unique: true,
    match: [/.+@.+\..+/, "Please enter a valid email address"],
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "instructor", "admin"],
    required: true,
  },
  phoneNumber: {
    type: String,
    required: false,
    default: '',
  },
  place: {
    type: String,
    required: false,
    default: '',
  },
  gender: {
    type: String,
    enum: ["male", "female", "other",""],
    required: false,
    default: '',
  },
  qualification: {
    type: String,
    required: false,
    default: '',
  },
  completionGraduation: {
    type: String, // Could be a year, or "completed"/"pursuing"
    required: false,
    default: '',
  },
  workingStatus: {
    type: String,
    enum: ["employed", "unemployed", "student", "freelancer", "other",""],
    required: false,
    default: '',
  },
  skills: [{
    // soft: [String],       // e.g., ["communication", "teamwork"]
    // technical: [String],  // e.g., ["JavaScript", "MongoDB"]
    // default: [],
    type: String,
    default: '',
  }],
  resumeUrl:{
    type: String,
    required: false,
    default: '',
  },
  badges: [{
    type: String,
    required: false,
    default: [],
  }],
  socialLinks: {
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    other: { type: String, default: '' },
  },
 
  subscriptions: [{
    type: String,
    default: [],
  }],
  desiredContents: [String], // Array of searched keywords
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to generate JWT token
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Method to compare entered password with stored hashed password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);