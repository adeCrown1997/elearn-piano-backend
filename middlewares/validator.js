const Joi = require('joi');

// Validation schemas for user signup, signin, and password change

// Validation schema for user signup
exports.signupSchema = Joi.object({
    firstName: Joi.string()
        .min(2)
        .max(20)
        .required(),

    lastName: Joi.string()
        .min(2)
        .max(20)
        .required(),

    email: Joi.string().min(5).max(60).email({
        tlds: { allow: ["com", "net"] }}) // Allow any TLD (Top Level Domain)
        .required(),

    phoneNumber: Joi.string()
        .pattern(/^\d{11}$/)
        .required()
        .messages({
        'string.pattern.base': 'Phone number must be exactly 11 digits'
    }),
    registrantType: Joi.string()
        .valid('self', 'parent')
        .default('self')
        .required(),

    password: Joi.string()
        .min(8)
        .max(30)
        .required()
        .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)), // Alphanumeric characters only,

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .min(8)
        .max(30)
        .required()
        .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)) // Alphanumeric characters only,
        .messages({
        'any.only': 'Passwords do not match'
    }),    
});

// Validation schema for user signin
exports.signinSchema = Joi.object({
        email: Joi.string().min(5).max(60).email({
            tlds: { allow: ["com", "net"] }}) 
            .required(),
        password: Joi.string()
            .min(8)
            .max(30)
            .required()
            .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)) // Alphanumeric characters only,
    }
)    

// Validation schema for sending verification code
exports.acceptCodeSchema = Joi.object({
	email: Joi.string()
		.min(5)
		.max(30)
		.required()
		.email({
			tlds: { allow: ['com', 'net'] },
		}),
	providedCode: Joi.number().required(),
});

// Validation schema for changing password
exports.changePasswordSchema = Joi.object({
	newPassword: Joi.string()
        .min(8)
        .max(60)
		.required()
		.pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)),
	oldPassword: Joi.string()
        .min(8)
        .max(60)
        .required()
        .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)),
});

// Validation schema for sending forgot password code
exports.acceptFPCodeSchema = Joi.object({
	email: Joi.string()
		.min(8)
		.max(60)
		.required()
		.email({
			tlds: { allow: ['com', 'net'] },
		}),
	providedCode: Joi.number().required(),
	newPassword: Joi.string()
		.required()
		.pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)),
});