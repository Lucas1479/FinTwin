import express from 'express';
import userRoutes from './userRoutes.js';
import figmaRoutes from './figmaRoutes.js';
import productRoutes from './productRoutes.js';
import cashFlowRoutes from './cashFlowRoutes.js'; // New Import

import goalRoutes from './goalRoutes.js';

import wealthCentreRoutes from './wealthCentreRoutes.js';

const router = express.Router();

// Mount specific API routes
router.use('/users', userRoutes);
router.use('/figma', figmaRoutes);
router.use('/products', productRoutes);
router.use('/goals', goalRoutes);
router.use('/wealth', wealthCentreRoutes);
router.use('/cashflow', cashFlowRoutes); // New Route

// Health Check for /api/health
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;

