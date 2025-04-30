const axios = require('axios');
const mongoose = require('mongoose');
const Payment = require('../models/paystackModel');
const User = require('../models/userModel');
const crypto = require('crypto');
const { completeEnrollmentAfterPayment } = require('./enrollmentController');

// Load environment variables
require('dotenv').config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';

// Initialize Payment with Paystack
const initializePayment = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Debug: Log req.user
    console.log('initializePayment - req.user:', req.user);

    // Ensure the user exists and is not soft-deleted
    const user = await User.findOne({ _id: req.user.userId, deletedAt: null });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found or has been deleted' });
    }

    const { amount, email, currency = 'NGN', metadata } = req.body;

    // Validate request body
    if (!amount || !email) {
      return res.status(400).json({ success: false, message: 'Amount and email are required' });
    }

    if (amount < 100) { // Paystack's minimum amount is 100 NGN
      return res.status(400).json({ success: false, message: 'Amount must be at least 100 NGN' });
    }

    // Prepare Paystack API request
    const paystackResponse = await axios.post(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      {
        email,
        amount: amount * 100, // Paystack expects amount in kobo (NGN)
        currency,
        callback_url: 'http://localhost:3000/api/auth/payments/callback',
        metadata, // Include metadata (e.g., courseId)
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.data.status) {
      return res.status(500).json({ success: false, message: 'Failed to initialize payment', error: paystackResponse.data.message });
    }

    const { authorization_url, reference } = paystackResponse.data.data;

    // Save the payment record as pending
    const payment = new Payment({
      userId: req.user.userId,
      reference,
      amount,
      currency,
      status: 'pending',
      rawPaystackResponse: paystackResponse.data,
      metadata, // Save metadata in the Payment model
    });

    await payment.save();

    // Debug: Log the saved payment
    console.log('Saved payment:', payment);

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorization_url,
        reference,
      },
    });
  } catch (error) {
    console.error('Error initializing payment:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Failed to initialize payment', error: error.message });
  }
};

// Verify Payment with Paystack
const verifyPayment = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    // Find the payment record and populate user details
    const payment = await Payment.findOne({ reference }).populate('userId', 'firstName lastName email phoneNumber');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Debug: Log userId values
    console.log('verifyPayment - payment.userId:', payment.userId._id.toString());
    console.log('verifyPayment - req.user.userId:', req.user.userId);
    console.log('verifyPayment - req.user:', req.user);
    console.log('User ID match:', payment.userId._id.toString() === req.user.userId.toString());

    // Ensure the payment belongs to the user or the user is an admin
    const userIdFromPayment = payment.userId._id.toString();
    const userIdFromRequest = req.user.userId.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (userIdFromPayment !== userIdFromRequest && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to verify this payment' });
    }

    // Verify payment with Paystack
    const paystackResponse = await axios.get(
      `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.data.status) {
      return res.status(500).json({ success: false, message: 'Failed to verify payment', error: paystackResponse.data.message });
    }

    const paystackData = paystackResponse.data.data;

    // Update payment record based on Paystack response
    payment.status = paystackData.status === 'success' ? 'success' : 'failed';
    payment.paymentMethod = paystackData.channel;
    payment.paidAt = paystackData.paid_at ? new Date(paystackData.paid_at) : null;
    payment.rawPaystackResponse = paystackResponse.data;
    payment.metadata = paystackData.metadata; // Update metadata from Paystack response

    await payment.save();

    // If payment is successful, complete the enrollment
    if (payment.status === 'success') {
      await completeEnrollmentAfterPayment(req, res);
      return; // Response is handled by completeEnrollmentAfterPayment
    }

    // If payment failed, return the verification response
    res.status(200).json({
      success: true,
      message: `Payment verification completed. Status: ${payment.status}`,
      data: {
        ...payment.toObject(),
        user: {
          firstName: payment.userId.firstName,
          lastName: payment.userId.lastName,
          email: payment.userId.email,
          phoneNumber: payment.userId.phoneNumber,
        },
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment', error: error.message });
  }
};

// Get all payments for the authenticated user
const getUserPayments = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find payments for the user
    const payments = await Payment.find({ userId: req.user.userId })
      .populate('userId', 'firstName lastName phoneNumber email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'User payments retrieved successfully',
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user payments', error: error.message });
  }
};

// Handle Paystack Webhook
const handleWebhook = async (req, res) => {
  try {
    // Validate Paystack webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;

    // Handle successful payment event
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const payment = await Payment.findOne({ reference });

      if (payment) {
        payment.status = 'success';
        payment.paidAt = new Date(event.data.paid_at);
        payment.paymentMethod = event.data.channel;
        payment.rawPaystackResponse = event;
        payment.metadata = event.data.metadata; // Update metadata from webhook
        await payment.save();

        console.log(`Payment ${reference} confirmed via webhook`);

        // Complete enrollment after webhook confirmation
        const reqForEnrollment = {
          user: { userId: payment.userId.toString() },
          params: { reference },
        };
        const resForEnrollment = {
          status: (code) => ({
            json: (data) => console.log(`Enrollment after webhook: ${JSON.stringify(data)}`),
          }),
        };
        await completeEnrollmentAfterPayment(reqForEnrollment, resForEnrollment);
      }
    }

    // Respond to Paystack
    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ success: false, message: 'Failed to process webhook', error: error.message });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getUserPayments,
  handleWebhook,
};