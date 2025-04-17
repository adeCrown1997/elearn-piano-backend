const Enrollment = require('../models/enrollmentModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');

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

    // Create enrollment
    const enrollment = await Enrollment.create({
      user: user._id,
      course: courseId,
    });

    res.status(201).json({ success: true, message: 'Enrollment successful', data: enrollment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// Get all enrollments of the logged-in user
exports.getUserEnrollments = async (req, res) => {
  try {
    const userId = req.user.userId; 
    const enrollments = await Enrollment.find({ user: userId }).populate('course'); // or 'courseId' if that's the field

    res.status(200).json({ success: true, data: enrollments });
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
    const adminId = req.user.userId; 

    // Find all courses created by this admin
    const courses = await Course.find({ createdBy: adminId }).select('userId');

    const courseIds = courses.map(course => course._id);

    // Find all enrollments for these courses
    const enrollments = await Enrollment.find({ course: { $in: courseIds } })
      .populate('user', 'name email')
      .populate('course', 'title');  

    res.status(200).json({
      success: true,
      totalEnrolled: enrollments.length,
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
    const adminId = req.user.userId;
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, createdBy: adminId });
    if (!course) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view enrollments for this course',
      });
    }

    const enrollments = await Enrollment.find({ course: courseId })
      .populate('user', 'name email')
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