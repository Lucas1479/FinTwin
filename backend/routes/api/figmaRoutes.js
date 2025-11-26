import express from 'express';
const router = express.Router();

// @desc    Test Figma connection
// @route   GET /api/figma/test
// @access  Public
router.get('/test', (req, res) => {
  res.json({ message: 'Figma integration endpoint ready' });
});

// 这里可以添加更多与 Figma MCP 交互的逻辑
// 例如：接收 Webhook，或者作为 MCP Client 请求 Figma 数据

export default router;

