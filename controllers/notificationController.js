// const Notification = require('../models/notificationModel');
// const User = require('../models/userModel');
// const Enrollment = require('../models/enrollmentModel');
// const transport = require('../middlewares/sendMail');

// // Get User Notifications
// exports.getNotifications = async (req, res) => {
//   try {
//     const notifications = await Notification.find({ user: req.user.userId })
//       .populate('course', 'title')
//       .sort({ isRead: 1, createdAt: -1 })
//       .select('title message link type isRead createdAt');
//     res.json({ success: true, data: notifications });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
//   }
// };

// // Mark Notification as Read
// exports.markAsRead = async (req, res) => {
//   try {
//     const notification = await Notification.findByIdAndUpdate(
//       req.params.id,
//       { isRead: true },
//       { new: true }
//     );
//     if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
//     res.json({ success: true, message: 'Notification marked as read', data: notification });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Failed to mark notification as read', error: error.message });
//   }
// };

// // Create Notification (Admin)
// exports.createNotification = async (req, res) => {
//   try {
//     const { userId, courseId, title, message, link, type } = req.body;
    
//     if (!userId && !courseId) {
//       return res.status(400).json({ success: false, message: 'Either userId or courseId is required' });
//     }

//     let users = [];
//     if (userId) {
//       users = [await User.findById(userId)];
//     } else if (courseId) {
//       const enrollments = await Enrollment.find({ course: courseId }).populate('user');
//       users = enrollments.map(e => e.user);
//     }

//     if (!users.length) {
//       return res.status(400).json({ success: false, message: 'No users found for notification' });
//     }

//     const notifications = await Promise.all(
//       users.map(async (user) => {
//         const notification = new Notification({
//           user: user._id,
//           course: courseId || null,
//           title,
//           message,
//           link,
//           type
//         });
//         await notification.save();
//         return notification;
//       })
//     );

//     if (type === 'email' || type === 'both') {
//       await Promise.all(
//         users.map(async (user) => {
//           await transport({
//             to: user.email,
//             subject: title,
//             html: `<p>${message}</p>${link ? `<a href="${link}">${link}</a>` : ''}`
//           });
//         })
//       );
//     }

//     res.json({ success: true, message: 'Notifications created successfully', data: notifications });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Failed to create notification', error: error.message });
//   }
// };

// // Get Admin Notifications (Sent Notifications)
// exports.getAdminNotifications = async (req, res) => {
//   try {
//     const notifications = await Notification.find()
//       .populate('user', 'firstName lastName email')
//       .populate('course', 'title')
//       .sort({ createdAt: -1 })
//       .select('user course title message link type isRead createdAt');
//     res.json({ success: true, data: notifications });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
//   }
// };