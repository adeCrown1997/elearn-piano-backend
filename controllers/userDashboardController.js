const User = require('../models/userModel');
const Enrollment = require('../models/enrollmentModel');
const Comment = require('../models/commentModel');
const mongoose = require('mongoose');

// Get User Dashboard Data
exports.getDashboard = async (req, res) => {
  try {
    // Fetch user profile
    const user = await User.findById(req.user.userId).select('firstName lastName email phoneNumber registrantType verified role createdAt');

    // Fetch enrollments with course details
    const enrollments = await Enrollment.find({ user: req.user.userId })
      .populate('course', 'title description category level price duration slug')
      .select('enrolledAt progress');

      // Fetch learning analytics
    const commentsPosted = await Comment.countDocuments({ user: req.user.userId });
    const likesReceived = await Comment.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.userId) } },
      {
        $project: {
          likes: { $ifNull: ['$likes', []] }, // Default missing likes to an empty array
        }
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: '$likes' } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        profile: user,
        enrollments,
        analytics: {
          coursesEnrolled: enrollments.length,
          commentsPosted,
          likesReceived: likesReceived[0]?.totalLikes || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: error.message });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, registrantType } = req.body;
    const updateData = { firstName, lastName, email, phoneNumber, registrantType };

    const user = await User.findByIdAndUpdate(req.user.userId, updateData, { new: true, runValidators: true })
      .select('firstName lastName email phoneNumber registrantType verified role createdAt');

    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
};

// Get Learning Analytics
exports.getAnalytics = async (req, res) => {
  try {
    // Fetch enrollments with course details
    const enrollments = await Enrollment.find({ user: req.user.userId })
      .populate('course', 'title')
      .select('progress enrolledAt');
    
    // Count comments posted
    const commentsPosted = await Comment.countDocuments({ user: req.user.userId });

    // Aggregate likes received
    const likesReceived = await Comment.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.userId) } },
      {
        $project: {
          likes: { $ifNull: ['$likes', []] }, // Default missing likes to an empty array
        }
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: '$likes' } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        progress: enrollments.map(e => ({ course: e.course.title, progress: e.progress || '0%' })),
        commentsPosted,
        likesReceived: likesReceived[0]?.totalLikes || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
};