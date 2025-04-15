const express = require('express');
const authController = require('../controllers/authController');
const  requireRole  = require('../middlewares/authorizeRole');
const { isAuthenticated } = require('../middlewares/identification');
const courseController = require('../controllers/courseController');

const router = express.Router();

// Routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/signout', isAuthenticated, authController.signout);

router.patch('/send-verification-code', isAuthenticated, authController.sendVerificationCode);
router.patch('/verify-verification-code', isAuthenticated, authController.verifyVerificationCode);
router.patch('/change-password', isAuthenticated, authController.changePassword);
router.patch('/send-forgot-password-code', authController.sendForgotPasswordCode);
router.patch('/verify-forgot-password-code', authController.verifyForgotPasswordCode);

router.post('/create-course', isAuthenticated, requireRole("admin"), courseController.createCourse);
router.post('/create-module', isAuthenticated, requireRole("admin"), courseController.createModule);
router.post('/create-content', isAuthenticated, requireRole("admin"), courseController.createContent);

module.exports = router;
