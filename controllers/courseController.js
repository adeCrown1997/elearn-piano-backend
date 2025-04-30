const Course = require("../models/courseModel");
const Module = require("../models/moduleModel");
const Content = require("../models/contentModel");
const Enrollment = require("../models/enrollmentModel");
const mongoose = require('mongoose');
const {
    courseCreationSchema,
    moduleCreationSchema,
    contentCreationSchema 
} = require("../middlewares/courseValidator");

// Create course
exports.createCourse = async (req, res) => {
  const { error } = courseCreationSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const newCourse = new Course({
      ...req.body,
      createdBy: adminId
    });

    await newCourse.save();
    res.status(201).json({ success: true, message: "Course created successfully", data: newCourse });
  } catch (err) {
    console.error("Error creating course:", err);
    res.status(500).json({ success: false, message: "Failed to create course", error: err.message });
  }
};

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate('createdBy', 'name email');
    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch courses', error: error.message });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('createdBy');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch course', error: error.message });
  }
};

// Update course by ID
exports.updateCourseById = async (req, res) => {
  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const course = await Course.findOne({ _id: req.params.id, createdBy: adminId });
    if (!course) {
      return res.status(403).json({ success: false, message: 'Course not found or unauthorized' });
    }

    const { title, description, price, level, duration, category } = req.body;
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { title, description, price, level, duration, category },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Course updated successfully', data: updatedCourse });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ success: false, message: 'Failed to update course', error: error.message });
  }
};

// Delete course by ID
exports.deleteCourseById = async (req, res) => {
  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const course = await Course.findOne({ _id: req.params.id, createdBy: adminId });
    if (!course) {
      return res.status(403).json({ success: false, message: 'Course not found or unauthorized' });
    }

    // Delete all enrollments associated with the course
    await Enrollment.deleteMany({ course: req.params.id });

    // Find all modules associated with the course
    const modules = await Module.find({ courseId: req.params.id });

    // For each module, delete its associated content
    for (const module of modules) {
      await Content.deleteMany({ moduleId: module._id });
    }

    // Delete all modules associated with the course
    await Module.deleteMany({ courseId: req.params.id });

    // Delete the course
    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Course and associated enrollments, modules, and content deleted successfully' });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ success: false, message: 'Failed to delete course', error: error.message });
  }
};

// Group courses by category
exports.groupCoursesByCategory = async (req, res) => {
  try {
    const groupedCourses = await Course.aggregate([
      {
        $group: {
          _id: "$category",
          courses: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          category: "$_id",
          courses: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({ success: true, data: groupedCourses });
  } catch (error) {
    console.error("Error grouping courses by category:", error);
    res.status(500).json({ success: false, message: "Failed to group courses", error: error.message });
  }
};

// Group courses by level
exports.groupCoursesByLevel = async (req, res) => {
  try {
    const groupedCourses = await Course.aggregate([
      {
        $group: {
          _id: "$level",
          courses: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          level: "$_id",
          courses: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({ success: true, data: groupedCourses });
  } catch (error) {
    console.error("Error grouping courses by level:", error);
    res.status(500).json({ success: false, message: "Failed to group courses", error: error.message });
  }
};

// Group courses by price (free or paid)
exports.groupCoursesByPrice = async (req, res) => {
  try {
    const groupedCourses = await Course.aggregate([
      {
        $group: {
          _id: {
            $cond: { if: { $eq: ["$price", 0] }, then: "Free", else: "Paid" }
          },
          courses: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          priceCategory: "$_id",
          courses: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({ success: true, data: groupedCourses });
  } catch (error) {
    console.error("Error grouping courses by price:", error);
    res.status(500).json({ success: false, message: "Failed to group courses", error: error.message });
  }
};

// Create module
exports.createModule = async (req, res) => {
  const { error } = moduleCreationSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const { courseId, title, description, order } = req.body;
    const course = await Course.findOne({ _id: courseId, createdBy: adminId });
    if (!course) {
      return res.status(403).json({ success: false, message: 'Course not found or unauthorized' });
    }

    const newModule = new Module({
      courseId,
      title,
      description,
      order
    });

    await newModule.save();
    res.status(201).json({ success: true, message: "Module created successfully", data: newModule });
  } catch (err) {
    console.error("Error creating module:", err);
    res.status(500).json({ success: false, message: "Failed to create module", error: err.message });
  }
};

// Get all modules by courseId
exports.getAllModulesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    const modules = await Module.find({ courseId });
    res.status(200).json({ success: true, data: modules });
  } catch (error) {
    console.error("Error fetching modules:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch modules', error: error.message });
  }
};

// Get module by ID
exports.getModuleById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id).populate('courseId');
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }
    res.status(200).json({ success: true, data: module });
  } catch (error) {
    console.error("Error fetching module:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch module', error: error.message });
  }
};

// Update module by ID
exports.updateModuleById = async (req, res) => {
  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const module = await Module.findById(req.params.id).populate('courseId');
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    if (!module.courseId || module.courseId.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this module' });
    }

    const { courseId, title, description, order } = req.body;
    const updatedModule = await Module.findByIdAndUpdate(
      req.params.id,
      { courseId, title, description, order },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Module updated successfully', data: updatedModule });
  } catch (error) {
    console.error("Error updating module:", error);
    res.status(500).json({ success: false, message: 'Failed to update module', error: error.message });
  }
};

// Delete module by ID
exports.deleteModuleById = async (req, res) => {
  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const module = await Module.findById(req.params.id).populate('courseId');
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    if (!module.courseId || module.courseId.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this module' });
    }

    // Delete associated content
    await Content.deleteMany({ moduleId: req.params.id });

    // Remove the module from all enrollments' completedModules
    await Enrollment.updateMany(
      { completedModules: req.params.id },
      { $pull: { completedModules: req.params.id } }
    );

    // Delete the module
    await Module.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Module and associated content deleted successfully' });
  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).json({ success: false, message: 'Failed to delete module', error: error.message });
  }
};

// Create course content
exports.createContent = async (req, res) => {
  const { error } = contentCreationSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const { moduleId, title, type, richText, imageUrl, youtubeEmbedUrl, order } = req.body;
    const module = await Module.findById(moduleId).populate('courseId');
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    if (!module.courseId || module.courseId.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to create content for this module' });
    }

    const newContent = new Content({
      moduleId,
      title,
      type,
      richText,
      imageUrl,
      youtubeEmbedUrl,
      order
    });

    await newContent.save();
    res.status(201).json({ success: true, message: "Content created successfully", data: newContent });
  } catch (err) {
    console.error("Error creating content:", err);
    res.status(500).json({ success: false, message: "Failed to create content", error: err.message });
  }
};

// Get all contents by moduleId
exports.getAllContentsByModuleId = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const contents = await Content.find({ moduleId });
    res.status(200).json({ success: true, data: contents });
  } catch (error) {
    console.error("Error fetching contents:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch contents', error: error.message });
  }
};

// Get content by ID
exports.getContentById = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id).populate('moduleId');
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    console.error("Error fetching content:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch content', error: error.message });
  }
};

// Update content by ID
exports.updateContentById = async (req, res) => {
  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const content = await Content.findById(req.params.id)
      .populate({
        path: 'moduleId',
        populate: { path: 'courseId' }
      });

    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    if (!content.moduleId || !content.moduleId.courseId || content.moduleId.courseId.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this content' });
    }

    const { moduleId, title, type, richText, imageUrl, youtubeEmbedUrl, order } = req.body;
    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      { moduleId, title, type, richText, imageUrl, youtubeEmbedUrl, order },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Content updated successfully', data: updatedContent });
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).json({ success: false, message: 'Failed to update content', error: error.message });
  }
};

// Delete content by ID
exports.deleteContentById = async (req, res) => {
  try {
    let adminId;
    try {
      adminId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Invalid userId format:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const content = await Content.findById(req.params.id)
      .populate({
        path: 'moduleId',
        populate: { path: 'courseId' }
      });

    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    if (!content.moduleId || !content.moduleId.courseId || content.moduleId.courseId.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this content' });
    }

    await Content.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error("Error deleting content:", error);
    res.status(500).json({ success: false, message: 'Failed to delete content', error: error.message });
  }
};