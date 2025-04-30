const express = require('express');
const { isAuthenticated } = require('../middlewares/identification');
const requireRole = require('../middlewares/authorizeRole'); 
const adminDashboardController = require('../controllers/adminDashboardController');
const enrollmentController = require('../controllers/enrollmentController');

const router = express.Router();

// Admin Dashboard routes
router.get('/dashboard', isAuthenticated, requireRole('admin'), adminDashboardController.getDashboard);
router.get('/users', isAuthenticated, requireRole('admin'), adminDashboardController.getUsers);
router.get('/users/:userId', isAuthenticated, requireRole('admin'), adminDashboardController.getUserById);
router.put('/users/:userId/verify', isAuthenticated, requireRole('admin'), adminDashboardController.verifyUser);
router.delete('/users/:userId', isAuthenticated, requireRole('admin'), adminDashboardController.deleteUser);
router.get('/analytics', isAuthenticated, requireRole('admin'), adminDashboardController.getAnalytics);

// Admin Enrollment routes
router.get('/enrollments/export', isAuthenticated, requireRole('admin'), enrollmentController.exportEnrollments);
router.get('/enrollments', isAuthenticated, requireRole('admin'), enrollmentController.getEnrolledUsersForAdmin);
router.get('/enrollments/:courseId', isAuthenticated, requireRole('admin'), enrollmentController.getEnrollmentsByCourseId);
router.get('/enrollments/user/:userId', isAuthenticated, requireRole('admin'), enrollmentController.getEnrollmentsByUserId);
router.delete('/enrollments/:enrollmentId', isAuthenticated, requireRole('admin'), enrollmentController.unenrollAdmin);


// Send live session notification to enrolled users
router.post('/courses/:courseId/notify', isAuthenticated, requireRole('admin'), enrollmentController.notifyEnrolledUsers);

module.exports = router;