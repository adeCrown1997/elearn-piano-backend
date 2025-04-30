const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Content title is required'],
      trim: true,
      maxlength: [150, 'Content title cannot exceed 150 characters'],
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image'],
      required: true,
    },
    richText: {
      type: String,
      trim: true,
      required: [
        function () {
          return this.type === 'text';
        },
        'richText is required for text content',
      ],
      maxlength: [5000, 'Text content cannot exceed 5000 characters'],
    },
    imageUrl: {
      type: String,
      trim: true,
      required: [
        function () {
          return this.type === 'image';
        },
        'imageUrl is required for image content',
      ],
      match: [/^https?:\/\/.*\.(jpeg|jpg|png|gif)$/, 'Invalid image URL'],
    },
    youtubeEmbedUrl: {
      type: String,
      trim: true,
      match: [
        /^https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]+$/,
        'Invalid YouTube embed URL',
      ],
    },
    order: {
      type: Number,
      required: [true, 'Content order is required'],
      min: [1, 'Order must be at least 1'],
    },
  },
  { timestamps: true }
);

// Ensure at least one content field is provided
contentSchema.pre('validate', function (next) {
  if (!this.richText && !this.imageUrl && !this.youtubeEmbedUrl) {
    this.invalidate(
      'content',
      'At least one of richText, imageUrl, or youtubeEmbedUrl must be provided'
    );
  }
  next();
});

contentSchema.index({ moduleId: 1, order: 1 });

module.exports = mongoose.model('Content', contentSchema);