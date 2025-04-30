const express = require('express');
const { isAuthenticated } = require('../middlewares/identification');
const userDashboardController = require('../controllers/userDashboardController');

const router = express.Router();

// User Dashboard routes
router.get('/dashboard', isAuthenticated, userDashboardController.getDashboard);
router.put('/user', isAuthenticated, userDashboardController.updateProfile);
router.get('/analytics', isAuthenticated, userDashboardController.getAnalytics);

module.exports = router;