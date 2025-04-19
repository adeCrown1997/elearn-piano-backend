
const Course = require("../models/courseModel");
const Module = require("../models/moduleModel");
const Content = require("../models/contentModel");
const {
    courseCreationSchema,
    moduleCreationSchema,
    contentCreationSchema 
} = require("../middlewares/courseValidator");


// Create course
exports.createCourse = async (req, res) => {
    const { error } = courseCreationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const newCourse = new Course({
            ...req.body,
            createdBy: req.user._id 
        });

        await newCourse.save();
        res.status(201).json({ message: "Course created successfully", course: newCourse });
    } catch (err) {
        console.log("Error creating course:", err); 
        res.status(500).json({ error: err.message || "Server error" }); 
    }
};
exports.getAllCourses = async (req, res) => {
    try {
      const courses = await Course.find().populate('createdBy', 'name email');
      res.status(200).json({ success: true, courses });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error });
    }
  };
  
  // Get course by ID
  exports.getCourseById = async (req, res) => {
    try {
      const course = await Course.findById(req.params.id).populate('createdBy');
      if (!course)
        return res.status(404).json({ success: false, message: 'Course not found' });
      res.status(200).json({ success: true, course });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error });
    }
  };
  
  // UPDATE course by ID
exports.updateCourseById = async (req, res) => {
	try {
		const { title, description, price, level, duration, category } = req.body;

		const updatedCourse = await Course.findByIdAndUpdate(
			req.params.id,
			{ title, description, price, level, duration, category },
			{ new: true, runValidators: true }
		);

		if (!updatedCourse) {
			return res.status(404).json({ success: false, message: 'Course not found!' });
		}

		res.status(200).json({ success: true, message: 'Course updated!', course: updatedCourse });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
//  DELETE course by ID
exports.deleteCourseById = async (req, res) => {
	try {
		const deletedCourse = await Course.findByIdAndDelete(req.params.id);
		if (!deletedCourse) {
			return res.status(404).json({ success: false, message: 'Course not found!' });
		}
		res.status(200).json({ success: true, message: 'Course deleted!' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error' });
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
					category: "$category",
					courses: 1,
					_id: 0
				}
			}
		]);

		res.status(200).json({ success: true, groupedCourses });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: "Server error!" });
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
					level: "$level",
					courses: 1,
					_id: 0
				}
			}
		]);

		res.status(200).json({ success: true, groupedCourses });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: "Server error!" });
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
					priceCategory: "$price",
					courses: 1,
					_id: 0
				}
			}
		]);

		res.status(200).json({ success: true, groupedCourses });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: "Server error!" });
	}
};

// Create module
exports.createModule = async (req, res) => {
    const { error } = moduleCreationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const newModule = new Module({
            ...req.body,
            createdBy: req.user._id
        });

        await newModule.save();
        res.status(201).json({ message: "Module created successfully", module: newModule });
    } catch (err) {
        res.status(500).json({ error: err.message || "Server error" }); 
    }
};

// GET all modules by courseId
exports.getAllModulesByCourseId = async (req, res) => {
	try {
		const { courseId } = req.params;
		const modules = await Module.find({ courseId });
		res.status(200).json({ success: true, modules });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error!' });
	}
};
  
// GET module by ID
exports.getModuleById = async (req, res) => {
	try {
		const module = await Module.findById(req.params.id).populate('courseId');
		if (!module) {
			return res.status(404).json({ success: false, message: 'Module not found!' });
		}
		res.status(200).json({ success: true, module });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error!' });
	}
};

 // UPDATE module by ID
exports.updateModuleById = async (req, res) => {
	try {
		const { courseId, title, description } = req.body;

		const updatedModule = await Module.findByIdAndUpdate(
			req.params.id,
			{ courseId, title, description },
			{ new: true, runValidators: true }
		);

		if (!updatedModule) {
			return res.status(404).json({ success: false, message: 'Module not found!' });
		}

		res.status(200).json({ success: true, message: 'Module updated!', module: updatedModule });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error!' });
	}
};

// DELETE module by ID
exports.deleteModuleById = async (req, res) => {
	try {
		const deletedModule = await Module.findByIdAndDelete(req.params.id);
		if (!deletedModule) {
			return res.status(404).json({ success: false, message: 'Module not found!' });
		}
		res.status(200).json({ success: true, message: 'Module deleted!' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error!' });
	}
};  

// CREATE course content
exports.createContent = async (req, res) => {
    const { error } = contentCreationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const newContent = new Content({ 
            ...req.body,
            createdBy: req.user._id
        });

        await newContent.save();
        res.status(201).json({ message: "Content created successfully", content: newContent });
    } catch (err) {
        res.status(500).json({ error: err.message || "Server error" }); 
    }
};

// GET all contents by moduleId
exports.getAllContentsByModuleId = async (req, res) => {
	try {
		const { moduleId } = req.params;
		const contents = await Content.find({ moduleId });
		res.status(200).json({ success: true, contents });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error!' });
	}
};

// GET content by ID
exports.getContentById = async (req, res) => {
	try {
		const content = await Content.findById(req.params.id).populate('moduleId');
		if (!content) {
			return res.status(404).json({ success: false, message: 'Content not found!' });
		}
		res.status(200).json({ success: true, content });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error!' });
	}
};

// UPDATE content by ID
exports.updateContentById = async (req, res) => {
	try {
		const { moduleId, type, richText, imageUrl, youtubeEmbedUrl } = req.body;

		const updatedContent = await Content.findByIdAndUpdate(
			req.params.id,
			{ module: moduleId, type, richText, imageUrl, youtubeEmbedUrl },
			{ new: true, runValidators: true }
		);

		if (!updatedContent) {
			return res.status(404).json({ success: false, message: 'Content not found!' });
		}

		res.status(200).json({ success: true, message: 'Content updated!', content: updatedContent });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error!' });
	}
};

// DELETE content by ID
exports.deleteContentById = async (req, res) => {
	try {
		const deletedContent = await Content.findByIdAndDelete(req.params.id);
		if (!deletedContent) {
			return res.status(404).json({ success: false, message: 'Content not found!' });
		}
		res.status(200).json({ success: true, message: 'Content deleted!' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Server error!' });
	}
};

