const Comment = require('../models/commentModel');
const Content = require('../models/contentModel');
const mongoose = require('mongoose');

const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { contentId } = req.params;
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const comment = new Comment({
      text,
      user: req.user.userId,
      content: contentId
    });
    await comment.save();

    res.status(201).json({ success: true, message: 'Comment added successfully', data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add comment', error: error.message });
  }
};

// Reply to a comment
const replyToComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { commentId } = req.params;

    // Find the parent comment
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ success: false, message: 'Parent comment not found' });
    }

    // Create the reply
    const reply = new Comment({
      text,
      user: req.user.userId,
      content: parentComment.content,
      parentComment: commentId,
    });
    await reply.save();

    // Ensure replies is initialized as an array
    if (!Array.isArray(parentComment.replies)) {
      parentComment.replies = [];
    }

    // Add the reply to the parent comment’s replies array
    parentComment.replies.push(reply._id);
    await parentComment.save();

    res.status(201).json({ success: true, message: 'Reply added successfully', data: reply });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add reply', error: error.message });
  }
};

const getCommentsByContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10

    // Validate contentId
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    // Fetch comments with counts for replies and likes
    const comments = await Comment.aggregate([
      { $match: { content: new mongoose.Types.ObjectId(contentId), parentComment: null } },
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'parentComment',
          as: 'replies',
        },
      },
      {
        $addFields: {
          replyCount: { $size: { $ifNull: ['$replies', []] } }, // Ensure replies is treated as an array
          likeCount: { $size: { $ifNull: ['$likes', []] } },   // Ensure likes is treated as an array
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          text: 1,
          content: 1,
          parentComment: 1,
          createdAt: 1,
          updatedAt: 1,
          replyCount: 1,
          likeCount: 1,
          'user._id': 1,
          'user.firstName': 1,
          'user.lastName': 1,
          replies: 1, // Include the replies array if needed
        },
      },
      {
        $skip: (page - 1) * limit,  // Skip comments based on current page
      },
      {
        $limit: Number(limit),  // Limit the number of comments returned
      },
    ]);

    // Get total number of comments for pagination
    const totalComments = await Comment.countDocuments({ content: contentId, parentComment: null });

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalComments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch comments', error: error.message });
  }
};


// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Validate userId and role from req.user
    if (!req.user || !req.user.userId || !req.user.role) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Ensure user IDs are compared as strings
    let commentUserId, authUserId;
    try {
      commentUserId = comment.user.toString();
      authUserId = req.user.userId.toString();
    } catch (error) {
      console.error('Error converting user IDs:', error);
      return res.status(500).json({ success: false, message: 'Invalid user ID format' });
    }

    // Log the values for debugging
    console.log('Comment User ID:', commentUserId);
    console.log('Authenticated User ID:', authUserId);
    console.log('User Role:', req.user.role);

    // Allow the user who posted the comment or an admin to delete
    if (commentUserId !== authUserId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: 'Failed to delete comment', error: error.message });
  }
};

// Toggle like on a comment
const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Validate userId from req.user
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Convert userId to ObjectId for comparison
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    // Log the current state of likes
    console.log('Before toggle - Likes:', comment.likes.map(id => id.toString()));
    console.log('User ID:', userId.toString());

    // Check if the user has already liked the comment
    const index = comment.likes.findIndex(id => id.equals(userId));
    let action;
    if (index === -1) {
      // User hasn't liked the comment, so add their like
      comment.likes.push(userId);
      action = 'added';
    } else {
      // User has already liked the comment, so remove their like
      comment.likes.splice(index, 1);
      action = 'removed';
    }

    await comment.save();

    // Log the updated state of likes
    console.log('After toggle - Likes:', comment.likes.map(id => id.toString()));

    res.status(200).json({ 
      success: true, 
      message: `Like ${action} successfully`, 
      data: comment 
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle like', error: error.message });
  }
};

// Edit a comment
const editComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { commentId } = req.params;

    // Validate userId and role from req.user
    if (!req.user || !req.user.userId || !req.user.role) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Ensure user IDs are compared as strings
    let commentUserId, authUserId;
    try {
      commentUserId = comment.user.toString();
      authUserId = req.user.userId.toString();
    } catch (error) {
      console.error('Error converting user IDs:', error);
      return res.status(500).json({ success: false, message: 'Invalid user ID format' });
    }

    // Log the values for debugging
    console.log('Comment User ID:', commentUserId);
    console.log('Authenticated User ID:', authUserId);
    console.log('User Role:', req.user.role);

    // Allow the user who posted the comment or an admin to edit
    if (commentUserId !== authUserId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this comment' });
    }

    comment.text = text;
    await comment.save();

    res.status(200).json({ success: true, message: 'Comment edited successfully', data: comment });
  } catch (error) {
    console.error('Error editing comment:', error);
    res.status(500).json({ success: false, message: 'Failed to edit comment', error: error.message });
  }
};


module.exports = {
  addComment,
  replyToComment,
  getCommentsByContent,
  deleteComment,
  toggleLikeComment,
  editComment,
};