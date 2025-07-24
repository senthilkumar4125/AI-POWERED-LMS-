const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true
  },
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: String
});

const LectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  videoUrl: String,
  public_id: String,
  duration: Number,
  freePreview: {
    type: Boolean,
    default: false
  },
  resources: [{
    title: String,
    fileUrl: String,
    public_id: String,
    fileType: String
  }],
  questions: [QuestionSchema]
});

const CourseSchema = new mongoose.Schema({
  instructorId: {
    type: String,
    required: true
  },
  instructorName: {
    type: String,
    required: true
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  category: {
    type: String,
    required: false
  },
  subcategory: String,
  level: {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "all-levels"],
    required: false
  },
  primaryLanguage: {
    type: String,
    required: false
  },
  subtitle: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  image: String,
  public_id: String,
  welcomeMessage: String,
  pricing: {
    type: Number,
    required: true
  },
  salePrice: Number,
  saleEndDate: Date,
  objectives: [String],
  prerequisites: [String],
  targetAudience: [String],
  tags: [String],
  curriculum: [LectureSchema],
  questions: [QuestionSchema],
  totalLectures: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    userName: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  enrollmentCount: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedDate: Date,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Generate slug from title
CourseSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
    
    // Append timestamp for uniqueness if needed
    if (this.isNew) {
      this.slug = `${this.slug}-${Date.now().toString().slice(-6)}`;
    }
  }
  
  // Update totalLectures count
  if (this.isModified('curriculum')) {
    this.totalLectures = this.curriculum.length;
    
    // Calculate total duration
    this.totalDuration = this.curriculum.reduce((total, lecture) => {
      return total + (lecture.duration || 0);
    }, 0);
  }
  
  next();
});

// Indexes for faster lookups
CourseSchema.index({ title: 'text', description: 'text', tags: 'text' });
CourseSchema.index({ slug: 1 });
CourseSchema.index({ instructorId: 1 });
CourseSchema.index({ category: 1 });
CourseSchema.index({ isPublished: 1 });
CourseSchema.index({ level: 1 });
CourseSchema.index({ 'ratings.average': -1 });
CourseSchema.index({ enrollmentCount: -1 });
CourseSchema.index({ pricing: 1 });

module.exports = mongoose.model("Course", CourseSchema);