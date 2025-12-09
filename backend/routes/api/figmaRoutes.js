import express from 'express';
const router = express.Router();

// @desc    Test Figma connection
// @route   GET /api/figma/test
// @access  Public
router.get('/test', (req, res) => {
  res.json({ message: 'Figma integration endpoint ready' });
});

// More Figma MCP-related logic can be added here
// For example: receiving webhooks or acting as an MCP client to request Figma data

export default router;

