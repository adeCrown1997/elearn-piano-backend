// const express = require('express');
// const { isAuthenticated } = require('../middlewares/identification');
// const requireRole = require('../middlewares/authorizeRole'); // Updated import
// const notificationController = require('../controllers/notificationController');

// const router = express.Router();

// // Notification routes
// router.get('/notifications', isAuthenticated, notificationController.getNotifications);
// router.patch('/notifications/:id/read', isAuthenticated, notificationController.markAsRead);
// router.post('/notifications', isAuthenticated, requireRole('admin'), notificationController.createNotification);
// router.get('/notifications/admin', isAuthenticated, requireRole('admin'), notificationController.getAdminNotifications);

// module.exports = router;