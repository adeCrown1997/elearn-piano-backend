const express = require('express');
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middlewares/identification');

const router = express.Router();

// Auth routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/signout', isAuthenticated, authController.signout);
router.get('/me', isAuthenticated, authController.getCurrentUser);

// Verification routes
router.get('/verify-email', authController.verifyEmail);
router.patch('/send-verification-code', isAuthenticated, authController.sendVerificationCode);
router.patch('/verify-verification-code', isAuthenticated, authController.verifyVerificationCode);
router.patch('/change-password', isAuthenticated, authController.changePassword);
router.patch('/send-forgot-password-code', authController.sendForgotPasswordCode);
router.patch('/verify-forgot-password-code', authController.verifyForgotPasswordCode);

module.exports = router;