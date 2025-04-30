const express = require('express');
const { isAuthenticated } = require('../middlewares/identification');
const {
  addComment,
  replyToComment,
  getCommentsByContent,
  deleteComment,
  toggleLikeComment,
  editComment,
} = require('../controllers/commentController');

const router = express.Router();

// Comment routes
router.post('/comments/:contentId', isAuthenticated, addComment);
router.post('/comments/:contentId/reply/:commentId', isAuthenticated, replyToComment);
router.get('/comments/:contentId', isAuthenticated, getCommentsByContent);
router.delete('/comments/:commentId', isAuthenticated, deleteComment);
router.post('/comments/:commentId/like', isAuthenticated, toggleLikeComment);
router.put('/comments/:commentId', isAuthenticated, editComment);

module.exports = router;