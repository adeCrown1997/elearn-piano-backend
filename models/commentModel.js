const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    replies: { type: [mongoose.Schema.Types.ObjectId], ref: 'Comment', default: [] }, // Ensure default is an empty array
    likes: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },     // Ensure default is an empty array
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
