const express = require('express');
const authController = require('../controllers/authController');
const  requireRole  = require('../middlewares/authorizeRole');
const { isAuthenticated } = require('../middlewares/identification');
const courseController = require('../controllers/courseController');

const router = express.Router();

// Auth routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/signout', isAuthenticated, authController.signout);

// Course routes
router.post('/create-course', isAuthenticated, requireRole("admin"), courseController.createCourse);
router.get('/courses', courseController.getAllCourses);
router.get('/courses/:id', courseController.getCourseById);
router.put('/courses/:id', isAuthenticated, requireRole("admin"), courseController.updateCourseById);
router.delete('/courses/:id', isAuthenticated, requireRole("admin"), courseController.deleteCourseById);

// Module routes
router.post('/create-module', isAuthenticated, requireRole("admin"), courseController.createModule);
router.get('/modules/course/:courseId', courseController.getAllModulesByCourseId);
router.get('/modules/:id', courseController.getModuleById);
router.put('/modules/:id', isAuthenticated, requireRole("admin"), courseController.updateModuleById);
router.delete('/modules/:id', isAuthenticated, requireRole("admin"), courseController.deleteModuleById);

// Content routes
router.post('/create-content', isAuthenticated, requireRole("admin"), courseController.createContent);
router.get('/contents/module/:moduleId', courseController.getAllContentsByModuleId);
router.get('/contents/:id', courseController.getContentById);
router.put('/contents/:id', isAuthenticated, requireRole("admin"), courseController.updateContentById);
router.delete('/contents/:id', isAuthenticated, requireRole("admin"), courseController.deleteContentById);

module.exports = router;