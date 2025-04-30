const Joi = require('joi');

// Course Creation Validator
exports.courseCreationSchema = Joi.object({
	title: Joi.string()
		.min(3)
		.max(100)
		.required()
		.messages({
			'string.empty': 'Course title is required!',
			'string.min': 'Course title must be at least 3 characters!',
		}),

	description: Joi.string()
		.min(10)
		.required()
		.messages({
			'string.empty': 'Course description is required!',
			'string.min': 'Description must be at least 10 characters!',
		}),

	category: Joi.string().optional(),

	price: Joi.number().min(0).optional(),

	duration: Joi.string().min(1).optional(),

	level: Joi.string()
		.valid('beginner', 'intermediate', 'advanced')
		.required()
		.messages({
			'any.only': 'Level must be one of: beginner, intermediate, advanced',
			'any.required': 'Course level is required!',
		}),
});

// Module Creation Validator
exports.moduleCreationSchema = Joi.object({
	courseId: Joi.string()
	  .length(24)
	  .required()
	  .messages({
		'string.length': 'Invalid course ID format!',
		'any.required': 'Course ID is required!',
	  }),
	title: Joi.string()
	  .min(3)
	  .required()
	  .messages({
		'string.empty': 'Module title is required!',
		'string.min': 'Module title must be at least 3 characters!',
	  }),
	description: Joi.string()
	  .min(10)
	  .required()
	  .messages({
		'string.empty': 'Module description is required!',
		'string.min': 'Module description must be at least 10 characters!',
	  }),
	order: Joi.number()
	  .min(1)
	  .required()
	  .messages({
		'number.min': 'Order must be at least 1!',
		'any.required': 'Order is required!',
	  }),
  });
  
// Content Creation Validator
exports.contentCreationSchema = Joi.object({
	title: Joi.string()
	  .min(3)
	  .required()
	  .messages({
		'string.empty': 'Content title is required!',
		'string.min': 'Content title must be at least 3 characters!',
	  }),
	moduleId: Joi.string()
	  .length(24)
	  .required()
	  .messages({
		'string.length': 'Invalid module ID format!',
		'any.required': 'Module ID is required!',
	  }),
	type: Joi.string()
	  .valid('text', 'image')
	  .required()
	  .messages({
		'any.only': 'Type must be either "text" or "image"',
		'any.required': 'Content type is required!',
	  }),
	richText: Joi.string()
	  .allow('')
	  .optional(),
	imageUrl: Joi.string()
	  .uri()
	  .allow('')
	  .optional()
	  .messages({
		'string.uri': 'Image URL must be a valid URL!',
	  }),
	youtubeEmbedUrl: Joi.string()
	  .uri()
	  .allow('')
	  .optional()
	  .messages({
		'string.uri': 'YouTube embed link must be a valid URL!',
	  }),
	order: Joi.number()
	  .min(1)
	  .required()
	  .messages({
		'number.min': 'Order must be at least 1!',
		'any.required': 'Order is required!',
	  }),
  });