const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId Validation');

// Validator for creating comments
exports.commentValidator = (req, res, next) => {
  const schema = Joi.object({
    text: Joi.string().min(1).required(),
    contentId: objectId.required(),
    parentComment: objectId.allow(null, ''), // Allow empty or null for root comments
  });

  const data = {
    ...req.body,
    contentId: req.params.contentId || req.body.contentId,
    parentComment: req.body.parentComment,
  };

  const { error } = schema.validate(data);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};

// Validator for editing comments
exports.editCommentValidator = (req, res, next) => {
  const schema = Joi.object({
    text: Joi.string().min(1).required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};