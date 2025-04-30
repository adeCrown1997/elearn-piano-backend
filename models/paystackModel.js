const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    rawPaystackResponse: {
      type: Object,
    },
    metadata: {
      type: Object, 
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;