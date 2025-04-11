const Joi = require('joi');

exports.signupSchema = Joi.object({
    email: Joi.string().min(5).max(60).email({
        tlds: { allow: ["com", "net"] }}) // Allow any TLD (Top Level Domain)
        .required(),
    password: Joi.string()
        .min(8)
        .max(30)
        .required()
        .pattern(new RegExp(/^[a-zA-Z0-9]+$/)) // Alphanumeric characters only,
    })

exports.signinSchema = Joi.object({
        email: Joi.string().min(5).max(60).email({
            tlds: { allow: ["com", "net"] }}) // Allow any TLD (Top Level Domain)
            .required(),
        password: Joi.string()
            .min(8)
            .max(30)
            .required()
            .pattern(new RegExp(/^[a-zA-Z0-9]+$/)) // Alphanumeric characters only,
    }
)    
