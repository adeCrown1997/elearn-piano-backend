const Enrollment = require('../models/enrollmentModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const sendMail = require('../middlewares/sendMail');
const axios = require('axios');

// Enroll in a course
exports.enrollInCourse = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    // Check if user exists and is verified
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log("User verification status:", user.verified);
    if (!user.verified) {
      return res.status(403).json({ success: false, message: 'Please verify your account before enrolling' });
    }

    const { courseId } = req.params;

    // Check if the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if the user is already enrolled in the course
    const existingEnrollment = await Enrollment.findOne({ user: user._id, course: courseId });
    if (existingEnrollment) {
      return res.status(409).json({ success: false, message: 'You are already enrolled in this course' });
    }

    // Check if the course is paid (price > 0)
    if (course.price > 0) {
      // Prepare payment request for Paystack
      const paymentData = {
        email: user.email,
        amount: course.price,
        currency: 'NGN',
        metadata: { courseId: courseId.toString() }, // Include courseId in metadata
      };

      // Call Paystack to initialize payment
      const paystackResponse = await axios.post(
        'http://localhost:8000/api/paystack/initialize-payment',
        paymentData,
        {
          headers: {
            Authorization: req.headers.authorization, // Pass the user's JWT token
            'Content-Type': 'application/json',
          },
        }
      );

      if (!paystackResponse.data.success) {
        return res.status(500).json({ success: false, message: 'Failed to initialize payment', error: paystackResponse.data.message });
      }

      const { authorization_url, reference } = paystackResponse.data.data;

      // Create a pending enrollment with payment reference
      const enrollment = await Enrollment.create({
        user: user._id,
        course: courseId,
        paymentStatus: 'pending',
        paymentReference: reference,
      });

      res.status(200).json({
        success: true,
        message: 'Payment initiated. Please complete the payment to enroll.',
        data: {
          enrollment,
          authorization_url,
          reference,
        },
      });
    } else {
      // For free courses, enroll directly
      const enrollment = await Enrollment.create({
        user: user._id,
        course: courseId,
        paymentStatus: 'completed',
      });

      res.status(201).json({ success: true, message: 'Enrollment successful', data: enrollment });
    }
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Complete enrollment after successful payment
exports.completeEnrollmentAfterPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required' });
    }

    // Find the enrollment with the payment reference
    const enrollment = await Enrollment.findOne({ paymentReference: reference, user: userId });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found for this payment' });
    }

    // Verify payment with Paystack (this will already be done in paystackController.js, but we confirm here)
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.data.status || paystackResponse.data.data.status !== 'success') {
      enrollment.paymentStatus = 'failed';
      await enrollment.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Update enrollment status to completed
    enrollment.paymentStatus = 'completed';
    enrollment.enrolledAt = new Date();
    await enrollment.save();

    res.status(200).json({
      success: true,
      message: 'Enrollment completed successfully after payment',
      data: enrollment,
    });
  } catch (error) {
    console.error('Error completing enrollment after payment:', error);
    res.status(500).json({ success: false, message: 'Failed to complete enrollment', error: error.message });
  }
};

// Get all enrollments of the logged-in user
exports.getUserEnrollments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      Enrollment.find({ user: userId, paymentStatus : 'completed' })
        .populate('course')
        .skip(skip)
        .limit(limit),
      Enrollment.countDocuments({ user: userId })
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};


// Unenroll from a course
exports.unenrollFromCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const deleted = await Enrollment.findOneAndDelete({
      user: req.user.userId,
      course: courseId,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    res.status(200).json({ success: true, message: 'Unenrolled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// Admin: Get all users enrolled in courses created by the admin
exports.getEnrolledUsersForAdmin = async (req, res) => {
  try {
    const adminId = new mongoose.Types.ObjectId(req.user.userId);

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find courses created by the admin
    const courses = await Course.find({ createdBy: adminId }).select('_id');
    const courseIds = courses.map(course => course._id);

    const [enrollments, total] = await Promise.all([
      Enrollment.find({ course: { $in: courseIds }, paymentStatus: 'completed' })
        .populate('user', 'firstName lastName email')
        .populate('course', 'title')
        .skip(skip)
        .limit(limit),
      Enrollment.countDocuments({ course: { $in: courseIds }, paymentStatus: 'completed' })
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollments',
      error: error.message,
    });
  }
};

// Admin: Get enrollments for a specific course they created
exports.getEnrollmentsByCourseId = async (req, res) => {
  try {
    const adminId = new mongoose.Types.ObjectId(req.user.userId);
    const { courseId } = req.params;

    // Fetch the course without filtering by creator
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Explicitly check if the logged-in admin created this course
    if (course.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view enrollments for this course',
      });
    }

    // If authorized, get enrollments
    const enrollments = await Enrollment.find({ course: courseId })
      .populate('user', 'firstName lastName email')
      .populate('course', 'title');

    res.status(200).json({
      success: true,
      totalEnrolled: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get enrollments by user ID
exports.getEnrollmentsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Fetch enrollments for the given user
    const enrollments = await Enrollment.find({ user: userId }).populate('course', 'title');
    res.status(200).json({
      success: true,
      totalEnrolled: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Notify enrolled users
exports.notifyEnrolledUsers = async (req, res) => {
  try {
    const adminId = new mongoose.Types.ObjectId(req.user.userId);
    const { courseId } = req.params;
    const { subject, message, link } = req.body;

    const course = await Course.findOne({ _id: courseId, 'createdBy': adminId });
    if (!course) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to notify students for this course',
      });
    }

    const enrollments = await Enrollment.find({ course: courseId }).populate('user', 'firstName lastName email');

    if (!enrollments.length) {
      return res.status(404).json({
        success: false,
        message: 'No enrolled users found for this course',
      });
    }

    await Promise.all(
      enrollments.map(({ user }) => {
        const emailContent = `
          <p>Hello <strong>${user.firstName}</strong>,</p>
          <p>${message}</p>
          <p><a href="${link}" target="_blank">Click here to join the live session</a></p>
          <br>
          <p>Regards,<br>Admin, E-Learn Piano</p>
        `;
        return sendMail({
          to: user.email,
          subject: subject || `Live Session for ${course.title}`,
          html: emailContent,
        });
      })
    );

    res.status(200).json({
      success: true,
      message: 'Notifications sent successfully to all enrolled users.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Admin: Unenroll a user
exports.unenrollAdmin = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.enrollmentId);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    res.json({ success: true, message: 'User unenrolled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unenroll user', error: error.message });
  }
};

// Export enrollments to CSV
exports.exportEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('user', 'firstName lastName email')
      .populate('course', 'title');
    const csv = ['Name,Email,Course,Enrolled At,Progress', ...enrollments.map(e =>
      `${e.user.firstName} ${e.user.lastName},${e.user.email},${e.course.title},${e.enrolledAt},${e.progress || '0%'}`
    )].join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('enrollments.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export enrollments', error: error.message });
  }
};