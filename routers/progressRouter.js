const express = require('express');
const { isAuthenticated } = require('../middlewares/identification');
const progressController = require('../controllers/progressController');

const router = express.Router();

// Progress routes
router.post('/progress/complete/:moduleId', isAuthenticated, progressController.markModuleComplete);
router.get('/progress/course/:courseId', isAuthenticated, progressController.getCourseProgress);

module.exports = router;