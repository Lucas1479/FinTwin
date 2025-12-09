import express from 'express';
import userRoutes from './userRoutes.js';
import figmaRoutes from './figmaRoutes.js';
import productRoutes from './productRoutes.js';

const router = express.Router();

// Mount specific API routes
router.use('/users', userRoutes);
router.use('/figma', figmaRoutes);
router.use('/products', productRoutes);

// Health Check for /api/health
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;

