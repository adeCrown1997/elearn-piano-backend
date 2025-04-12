const mongoose = require('mongoose');

// User schema definition
const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minLength: [2, 'First name must be at least 2 characters'],
      maxLength: [20, 'First name cannot exceed 20 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minLength: [2, 'Last name must be at least 2 characters'],
      maxLength: [20, 'Last name cannot exceed 20 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      unique: true,
      minLength: [5, 'Email must be at least 5 characters'],
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: true,
      match: [/^\d{11}$/, 'Phone number must be 11 digits'],
    },
    registrantType: {
      type: String,
      enum: {
        values: ['self', 'parent'],
        message: 'Registrant type must be either "self" or "parent"',
      },
      default: 'self',
      required: [true, 'Registrant type is required'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      trim: true,
      select: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      select: false,
    },
    verificationCodeValidation: {
      type: Number,
      select: false,
    },
    forgotPasswordCode: {
      type: String,
      select: false,
    },
    forgotPasswordCodeValidation: {
      type: Number,
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model('User', userSchema);