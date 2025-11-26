import express from 'express';
import apiRoutes from './api/apiRoutes.js';
const router = express.Router();

// Mount API routes
router.use('/api', apiRoutes);

export default router;

