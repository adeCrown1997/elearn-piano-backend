const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
      maxlength: [100, 'Module title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: [true, 'Module order is required'],
      min: [1, 'Order must be at least 1'],
    },
  },
  { timestamps: true }
);

moduleSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model('Module', moduleSchema);