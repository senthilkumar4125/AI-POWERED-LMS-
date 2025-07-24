# Learning Management System (LMS) Backend

A comprehensive backend for a Learning Management System with features for course management, user authentication, payments, and more.

## Features

- **User Management:** Registration, authentication, and user profiles
- **Course Management:** Create, update, and delete courses with lectures and quizzes
- **Enrollment System:** Students can enroll in courses and track progress
- **Payment Integration:** Secure payments with Razorpay
- **File Upload:** Support for local storage and Cloudinary
- **Role-Based Access Control:** Different permissions for students, instructors, and admins

## Tech Stack

- Node.js & Express.js
- MongoDB & Mongoose
- JWT Authentication
- Razorpay Payment Gateway
- Multer for file uploads
- Cloudinary for cloud storage (optional)
- Winston for logging

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Razorpay account (for payments)
- Cloudinary account (optional, for production)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Start the development server:
   ```
   npm run dev
   ```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (admin only)
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/:id/role` - Update user role (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/instructors/:id` - Get instructor profile (public)

### Courses

- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID or slug
- `POST /api/courses` - Create course (instructor only)
- `PUT /api/courses/:id` - Update course (instructor only)
- `DELETE /api/courses/:id` - Delete course (instructor only)
- `POST /api/courses/:id/image` - Upload course image (instructor only)
- `POST /api/courses/:id/lectures` - Add lecture (instructor only)
- `PUT /api/courses/:id/lectures/:lectureId` - Update lecture (instructor only)
- `DELETE /api/courses/:id/lectures/:lectureId` - Delete lecture (instructor only)
- `POST /api/courses/:id/lectures/:lectureId/video` - Upload lecture video (instructor only)
- `GET /api/courses/instructor/courses` - Get instructor courses (instructor only)
- `PUT /api/courses/:id/publish` - Publish/unpublish course (instructor only)

### Payments

- `GET /api/payments/razorpay/key` - Get Razorpay key
- `POST /api/payments/razorpay/create-order` - Create Razorpay order
- `POST /api/payments/razorpay/verify` - Verify Razorpay payment
- `GET /api/payments/orders` - Get order history
- `GET /api/payments/earnings` - Get instructor earnings (instructor only)

### Orders

- `GET /api/orders` - Get all orders (admin only)
- `GET /api/orders/instructor` - Get instructor orders (instructor only)
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order status (admin only)

### Enrollments

- `GET /api/enrollments` - Get enrolled courses
- `GET /api/enrollments/:courseId` - Get enrolled course details
- `POST /api/enrollments/:courseId/lectures/:lectureId/complete` - Mark lecture as completed
- `POST /api/enrollments/:courseId/quizzes/:lectureId` - Submit quiz answers
- `GET /api/enrollments/instructor/students` - Get instructor's students (instructor only)

## Deployment

The backend can be deployed to any Node.js hosting service.

### Production Setup

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Configure MongoDB connection string
3. Set up Cloudinary credentials for file storage
4. Configure Razorpay API keys

## License

This project is licensed under the MIT License.