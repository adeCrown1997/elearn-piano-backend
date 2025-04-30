// const mongoose = require('mongoose');

// const notificationSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     course: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Course',
//       required: false, 
//     },
//     title: {
//       type: String,
//       required: true,
//     },
//     message: {
//       type: String,
//       required: true,
//     },
//     link: {
//       type: String,
//       default: '',
//     },
//     type: {
//       type: String,
//       enum: ['email', 'in-app', 'both'],
//       default: 'in-app',
//     },
//     isRead: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('Notification', notificationSchema);
