
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

// Create course content
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
