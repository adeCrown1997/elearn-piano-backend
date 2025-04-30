const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.isAuthenticated = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Unauthorized. No token provided.' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const user = await User.findById(decoded.userId);
		if (!user) {
			return res.status(401).json({ error: 'Unauthorized. User not found.' });
		}

		req.user = {
			userId: user._id,
			role: user.role,
			verified: user.verified,
			email: user.email,
		};

		next();
	} catch (err) {
		console.error(err);
		return res.status(401).json({ error: 'Unauthorized. Invalid token.' });
	}
};