const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
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
    },
    imageUrl: {
      type: String,
    },
    youtubeEmbedUrl: {
      type: String, 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Content', contentSchema);
