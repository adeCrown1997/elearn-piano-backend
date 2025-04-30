const mongoose = require('mongoose');
const User = require('../models/userModel');
const Enrollment = require('../models/enrollmentModel');
const Course = require('../models/courseModel');
const Comment = require('../models/commentModel');

// Get Admin Dashboard Data
exports.getDashboard = async (req, res) => {
  try {
    // Log userId for debugging
    console.log('Admin Dashboard - userId:', req.user.userId);

    // Convert userId to ObjectId
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (error) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    console.log('Converted userId to ObjectId:', userId);

    // Fetch courses created by admin (handle both createdBy and createdBy.userId)
    const courses = await Course.find({
      $or: [
        { createdBy: userId },
        { 'createdBy.userId': userId }
      ]
    })
      .select('title description category level price duration slug createdAt')
      .lean();
    console.log('Courses found:', courses);

    // Fetch course IDs for enrollments
    const courseIds = courses.map(course => course._id);
    console.log('Course IDs:', courseIds);

    // Fetch recent enrollments for admin's courses
    const enrollments = await Enrollment.find({ course: { $in: courseIds } })
      .populate('user', 'firstName lastName email')
      .populate('course', 'title')
      .sort({ enrolledAt: -1 })
      .limit(10)
      .select('user course enrolledAt progress')
      .lean();
    console.log('Recent Enrollments:', enrollments);

    // Fetch user stats
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ verified: true });
    console.log('Total Users:', totalUsers, 'Verified Users:', verifiedUsers);

    // Fetch recent comments
    const comments = await Comment.find()
      .populate('user', 'firstName lastName')
      .populate('content', 'title')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('text user content createdAt')
      .lean();
    console.log('Comments found:', comments.length);

    // Fetch total enrollments
    const totalEnrollments = await Enrollment.countDocuments({ course: { $in: courseIds } });
    console.log('Total Enrollments:', totalEnrollments);

    // Fetch completion rates
    const completionRates = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: null, avgProgress: { $avg: { $toDouble: { $ifNull: ['$progress', '0'] } } } } }
    ]);

    res.json({
      success: true,
      data: {
        courses,
        enrollments,
        userStats: { totalUsers, verifiedUsers },
        comments,
        analytics: {
          totalEnrollments,
          averageCompletionRate: completionRates[0]?.avgProgress.toFixed(2) || '0.00'
        }
      }
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: error.message });
  }
};

// Get All Users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('firstName lastName email phoneNumber registrantType role verified createdAt');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};
// getUserById
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('firstName lastName email phoneNumber registrantType role verified createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
}

// Verify User
exports.verifyUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { verified: true }, { new: true })
      .select('firstName lastName email phoneNumber registrantType role verified createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User verified successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify user', error: error.message });
  }
};

// Delete a user by ID
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId and role from req.user
    if (!req.user || !req.user.userId || !req.user.role) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Only allow admins or the user themselves to delete their account
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this user' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete all enrollments associated with the user
    await Enrollment.deleteMany({ user: userId });

    // Delete all comments made by the user
    await Comment.deleteMany({ user: userId });

    // If the user is an admin, delete their created courses (and associated modules, content, enrollments)
    if (user.role === 'admin') {
      const courses = await Course.find({ createdBy: userId });
      for (const course of courses) {
        // Delete enrollments for the course
        await Enrollment.deleteMany({ course: course._id });

        // Delete modules and their content
        const modules = await Module.find({ courseId: course._id });
        for (const module of modules) {
          await Content.deleteMany({ moduleId: module._id });
        }
        await Module.deleteMany({ courseId: course._id });

        // Delete the course
        await Course.findByIdAndDelete(course._id);
      }
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ success: true, message: 'User and associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
};

// Get Admin Analytics
exports.getAnalytics = async (req, res) => {
  try {
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (error) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    console.log('Analytics - userId:', userId);

    const courseIds = await Course.find({
      $or: [
        { createdBy: userId },
        { 'createdBy.userId': userId }
      ]
    }).distinct('_id');
    console.log('Analytics - Course IDs:', courseIds);

    const totalEnrollments = await Enrollment.countDocuments({ course: { $in: courseIds } });
    console.log('Analytics - Total Enrollments:', totalEnrollments);

    const completionRates = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: null, avgProgress: { $avg: { $toDouble: { $ifNull: ['$progress', '0'] } } } } }
    ]);
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ verified: true });
    const totalComments = await Comment.countDocuments();

    res.json({
      success: true,
      data: {
        totalEnrollments,
        averageCompletionRate: completionRates[0]?.avgProgress.toFixed(2) || '0.00',
        totalUsers,
        verifiedUsers,
        totalComments
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
};