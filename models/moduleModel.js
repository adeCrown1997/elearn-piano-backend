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
      required: true,
    },
    description: {
        type: String,
        required: true,
    },
  
},
  { timestamps: true }
);

module.exports = mongoose.model('Module', moduleSchema);
