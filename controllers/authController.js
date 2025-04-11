const jwt = require('jsonwebtoken');
const {signupSchema, signinSchema} = require('../middlewares/validator');
const User = require('../models/userModel');
const {doHash, doHashValidation, hmacProcess} = require('../utils/hashing');
const transport = require('../middlewares/sendMail');


exports.signup = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { error, value } = signupSchema.validate({ email, password }); // Ensure validation is correct
        if (error) {
            return res.status(401).json({ success: false, error: error.details[0].message });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(401).json({ success: false, error: 'Email already exists' });
        }

        const hashedPassword = await doHash(password, 12);
        const newUser = new User({
            email,
            password: hashedPassword,
        });

        const result = await newUser.save();
        result.password = undefined; // Remove password from the result
        return res.status(201).json({ success: true, message: 'User created successfully', result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

exports.signin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { error, value } = signinSchema.validate({ email, password } );
        if (error) {
            return res.status(401).json({ success: false, error: error.details[0].message });
        }
        const existingUser = await User.findOne({ email }).select('+password');
        if (!existingUser) {
            return res.status(401).json({ success: false, error: 'User does not exist' });
        }
        const result = await doHashValidation(password, existingUser.password);
        if (!result) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        const token = jwt.sign({ Userid: existingUser._id,
            email: existingUser.email, 
            verified: existingUser.verified, },
            process.env.JWT_SECRET, { expiresIn: '8h' });
        res.cookie("Authorization", 
            "bearer " + token, 
            { expires: new Date(Date.now() + 8 * 3600000), 
            httpOnly: process.env.NODE_ENV === "production", 
            secure: process.env.NODE_ENV === "production" }).json({ success: true, 
            message: 'User signed in successfully'});
    } catch (error) {
        console.log(error);
        
        
    }
}


exports.signout = async (req, res) => {
    res.clearCookie("Authorization") // Clear the cookie
    .status(200)
    .json({ success: true, message: 'User signed out successfully' });
    
}

exports.sendVerificationCode = async (req, res) => {
    const { email } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            return res
            .status(404)
            .json({ success: false, error: 'User does not exist' });
        }
        if (existingUser.verified) {
            return res
            .status(400)
            .json({ success: false, error: 'User already verified' });
        }
        const codeValue = Math.floor(Math.random() * 1000000); // Generate a random 6-digit code
        let info = await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: existingUser.email,
            subject: 'Verification Code',
            html: `<h3>Your verification code is: ${codeValue}</h3>`,
        });
        if (info.accepted[0] === existingUser.email) {
            const hashedCodeValue = hmacProcess(codeValue.toString(), process.env.HMAC_VERIFICATION_CODE_SERET);
            existingUser.verificationCode = hashedCodeValue;
            existingUser.verificationCodeValidation = Date.now();
            await existingUser.save();
            return res.status(200).json({ success: true, message: 'Verification code sent successfully' });
        }
        res.status(400).json({ success: false, error: 'Error sending verification code' });
    } catch (error) {
        console.log(error);
        
    }


}