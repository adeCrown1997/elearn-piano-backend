const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup) // Sign up route
router.post('/signin', authController.signin) // Sign in route
router.post('/signout', authController.signout) // Sign out route

router.patch('/send-verification-email', authController.sendVerificationCode) // Send verification email route 
module.exports = router;