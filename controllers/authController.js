const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const winston = require('winston');
const { signupSchema, signinSchema, changePasswordSchema, acceptFPCodeSchema } = require('../middlewares/userValidator');
const User = require('../models/userModel');
const { doHash, doHashValidation } = require('../utils/hashing');
const transport = require('../middlewares/sendMail');

const logger = winston.createLogger({
  transports: [new winston.transports.File({ filename: 'error.log', level: 'error' })],
});

// Signup
exports.signup = async (req, res) => {
  try {
    const { error } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { firstName, lastName, email, phoneNumber, registrantType, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await doHash(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = await bcrypt.hash(verificationToken, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      phoneNumber,
      registrantType,
      password: hashedPassword,
      verificationCode: hashedVerificationToken,
      verificationCodeValidation: Date.now(),
    });

    await newUser.save();

    const verificationLink = `${process.env.APP_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    logger.info('Generated verification link:', verificationLink);

    const mailOptions = {
      from: 'no-reply@elearn.com',
      to: email,
      subject: 'Verify Your Email',
      html: `Please verify your email by clicking the link below:<br><a href="${verificationLink}">Verify Email</a><br>Alternatively, log in and click "Verify Account" to receive a verification code or request a new link.`,
    };

    await transport(mailOptions);    logger.info('Verification email sent to:', email);

    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      result: { firstName, lastName, email, registrantType },
    });
  } catch (error) {
    logger.error('Signup Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Signin
exports.signin = async (req, res) => {
  try {
    const { error } = signinSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET, { expiresIn: '24h' });
    res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email, verified: user.verified }
    });
  } catch (error) {
    logger.error('Signin Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Send Verification Code
exports.sendVerificationCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }
    if (user.verified) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 10);

    user.verificationCode = hashedCode;
    user.verificationCodeValidation = Date.now();
    await user.save();

    const mailOptions = {
      from: 'no-reply@elearn.com',
      to: user.email,
      subject: 'Your Verification Code',
      html: `Your verification code is: <b>${verificationCode}</b><br>This code expires in 24 hours.`,
    };

    await transport(mailOptions);    logger.info('Verification code sent to:', user.email);

    res.status(200).json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    logger.error('Send Verification Code Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Verify Verification Code
exports.verifyVerificationCode = async (req, res) => {
  try {
    const { providedCode } = req.body;
    if (!providedCode) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await User.findById(req.user.userId).select('+verificationCode +verificationCodeValidation');
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }
    if (user.verified) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }

    if (!user.verificationCode || !user.verificationCodeValidation) {
      return res.status(400).json({ success: false, message: 'No valid verification code found' });
    }

    if (Date.now() - user.verificationCodeValidation > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Verification code expired. Please request a new code or link.' });
    }

    const isValid = await bcrypt.compare(providedCode, user.verificationCode);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeValidation = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Verify Verification Code Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Resend Verification Link (New)
exports.resendVerificationLink = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }
    if (user.verified) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = await bcrypt.hash(verificationToken, 10);

    user.verificationCode = hashedVerificationToken;
    user.verificationCodeValidation = Date.now();
    await user.save();

    const verificationLink = `${process.env.APP_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    logger.info('Generated verification link:', verificationLink);

    const mailOptions = {
      from: 'no-reply@elearn.com',
      to: user.email,
      subject: 'Verify Your Email',
      html: `Please verify your email by clicking the link below:<br><a href="${verificationLink}">Verify Email</a><br>This link expires in 24 hours.`,
    };

    await transport(mailOptions);    logger.info('Verification link sent to:', user.email);

    res.status(200).json({ success: true, message: 'Verification link sent to your email' });
  } catch (error) {
    logger.error('Resend Verification Link Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Verify Email 
exports.verifyEmail = async (req, res) => {
  const { token, email } = req.query;
  try {
    if (!token || !email) {
      return res.status(400).json({ success: false, message: 'Invalid or missing verification token or email' });
    }

    const existingUser = await User.findOne({ email }).select('+verificationCode +verificationCodeValidation');
    if (!existingUser) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    if (existingUser.verified) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }

    if (!existingUser.verificationCode || !existingUser.verificationCodeValidation) {
      return res.status(400).json({ success: false, message: 'No valid verification token found' });
    }

    if (Date.now() - existingUser.verificationCodeValidation > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Verification token expired. Please log in and request a new code or link.' });
    }

    const isValid = await bcrypt.compare(token, existingUser.verificationCode);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid verification token' });
    }

    existingUser.verified = true;
    existingUser.verificationCode = undefined;
    existingUser.verificationCodeValidation = undefined;
    await existingUser.save();

    const redirectUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/verification-success`
      : 'http://localhost:3001/verification-success';
    
    logger.info('User verified. Suggested redirect to:', redirectUrl);

    // Always return JSON to avoid redirect issues in Postman/API clients
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      redirectUrl,
    });

  } catch (error) {
    logger.error('Verify Email Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('email verified');
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    logger.error('Get Current User Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// This function handles user signout
exports.signout = async (req, res) => {
	res
		.clearCookie('Authorization')
		.status(200)
		.json({ success: true, message: 'logged out successfully' });
};

// This function handles changing the user's password
exports.changePassword = async (req, res) => {
  const { userId, verified } = req.user;
  const { oldPassword, newPassword, confirmNewPassword } = req.body;
  try {
    const { error } = changePasswordSchema.validate({ oldPassword, newPassword, confirmNewPassword });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    if (!userId || !verified) {
      return res.status(401).json({ success: false, message: 'Unauthorized or unverified user' });
    }

    const existingUser = await User.findOne({ _id: userId }).select('+password +tokenVersion');
    if (!existingUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!(await doHashValidation(oldPassword, existingUser.password))) {
      return res.status(401).json({ success: false, message: 'Incorrect old password' });
    }

    // Update password and increment tokenVersion
    const hashedPassword = await doHash(newPassword, 12);
    existingUser.password = hashedPassword;
    existingUser.tokenVersion += 1;
    await existingUser.save();

    // Generate a new JWT with updated tokenVersion
    const newToken = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        role: existingUser.role,
        verified: existingUser.verified,
        tokenVersion: existingUser.tokenVersion,
      },
      process.env.TOKEN_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } // Default to 24 hours if not set
    );

    // Send new token to client
    return res.status(200).json({
      success: true,
      message: 'Password updated',
      token: newToken,
    });
  } catch (error) {
    logger.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Send Forgot Password Code
exports.sendForgotPasswordCode = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }

    const codeValue = crypto.randomBytes(3).toString('hex').toUpperCase();
    const hashedCodeValue = await bcrypt.hash(codeValue, 10);

    await transport({
      to: existingUser.email,
      subject: 'Reset Password Code',
      html: `<p>Your password reset code is: <strong>${codeValue}</strong></p>`,
    });

    existingUser.forgotPasswordCode = hashedCodeValue;
    existingUser.forgotPasswordCodeValidation = Date.now();
    await existingUser.save();

    return res.status(200).json({ success: true, message: 'Password reset code sent' });
  } catch (error) {
    logger.error('Send Forgot Password Code Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send code', error: error.message });
  }
};

// Verify Forgot Password Code
exports.verifyForgotPasswordCode = async (req, res) => {
  const { email, providedCode, newPassword } = req.body;
  try {
    const { error } = acceptFPCodeSchema.validate({ email, providedCode, newPassword });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const existingUser = await User.findOne({ email }).select('+forgotPasswordCode +forgotPasswordCodeValidation +tokenVersion');
    if (!existingUser) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }

    if (!existingUser.forgotPasswordCode || !existingUser.forgotPasswordCodeValidation) {
      return res.status(400).json({ success: false, message: 'No valid code found' });
    }

    if (Date.now() - existingUser.forgotPasswordCodeValidation > 5 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Code expired. Request a new one.' });
    }

    const isValid = await bcrypt.compare(providedCode.toString(), existingUser.forgotPasswordCode);
    if (isValid) {
      const hashedPassword = await doHash(newPassword, 12);
      existingUser.password = hashedPassword;
      existingUser.forgotPasswordCode = undefined;
      existingUser.forgotPasswordCodeValidation = undefined;
      existingUser.tokenVersion += 1;
      await existingUser.save();
      return res.status(200).json({ success: true, message: 'Password updated' });
    }

    return res.status(400).json({ success: false, message: 'Invalid code' });
  } catch (error) {
    logger.error('Verify Forgot Password Code Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};