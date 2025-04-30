const express = require('express');
const { isAuthenticated } = require('../middlewares/identification');
const enrollmentController = require('../controllers/enrollmentController');

const router = express.Router();

// Enrollment routes for authenticated users
router.post('/enroll/:courseId', isAuthenticated, enrollmentController.enrollInCourse);
router.get('/my-enrollments', isAuthenticated, enrollmentController.getUserEnrollments);
router.delete('/unenroll/:courseId', isAuthenticated, enrollmentController.unenrollFromCourse);

// Paystack callback route
router.get('/payments/callback', isAuthenticated, (req, res) => {
  const { reference } = req.query;
  if (!reference) {
    return res.status(400).json({ success: false, message: 'Reference is required' });
  }
  // Redirect to the frontend verification page with the reference
  res.redirect(`http://localhost:8080/verify-payment?reference=${reference}`); // Adjust to your frontend URL
});

module.exports = router;