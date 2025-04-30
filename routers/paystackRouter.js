const express = require('express');
const router = express.Router();
const { initializePayment, verifyPayment, getUserPayments, handleWebhook } = require('../controllers/paystackController');
const { isAuthenticated } = require('../middlewares/identification');

// Initialize payment
router.post('/initialize-payment', isAuthenticated, initializePayment);

// Verify payment
router.get('/verify/:reference', isAuthenticated, verifyPayment);

// Get user payments
router.get('/user-payments', isAuthenticated, getUserPayments);

// Handle Paystack webhook (no as it's called by Paystack)
router.post('/webhook', handleWebhook);

module.exports = router;