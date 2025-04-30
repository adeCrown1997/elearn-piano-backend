const Enrollment = require('../models/enrollmentModel');
const Module = require('../models/moduleModel');

exports.markModuleComplete = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { moduleId } = req.params;

    const module = await Module.findById(moduleId).populate('course');
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: module.course._id,
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    if (enrollment.completedModules.includes(moduleId)) {
      return res.status(400).json({ success: false, message: 'Module already completed' });
    }

    enrollment.completedModules.push(moduleId);
    await enrollment.save();

    res.status(200).json({ success: true, message: 'Module marked as complete' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
    const totalModules = await Module.countDocuments({ course: courseId });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    const completed = enrollment.completedModules.length;
    const progress = totalModules === 0 ? 0 : Math.round((completed / totalModules) * 100);

    res.status(200).json({
      success: true,
      progress: `${progress}%`,
      completedModules: completed,
      totalModules,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
