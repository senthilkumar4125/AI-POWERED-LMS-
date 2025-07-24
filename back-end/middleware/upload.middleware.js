const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const cloudinary = require('cloudinary').v2;

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure local storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to allow specific file types
const fileFilter = (req, file, cb) => {const multer = require('multer');
  const path = require('path');
  
  const storage = multer.diskStorage({
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}${ext}`);
    }
  });
  
  const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  };
  
  const upload = multer({ storage, fileFilter });
  
  module.exports = upload;
  
  // Allowed file types
  const allowedFileTypes = /jpeg|jpg|png|gif|pdf|mp4|webm|mov/;
  
  // Check extension
  const extname = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  
  // Check mime type
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image, PDF, and video files are allowed!'));
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (filePath, folder = 'lms') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto'
    });
    
    // Delete local file after upload to cloudinary
    fs.unlinkSync(filePath);
    
    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return { success: true };
    
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: result.result === 'ok' };
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary
};