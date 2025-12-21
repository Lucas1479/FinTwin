import express from 'express';
import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getSummary,
  getAvailableFunds,
} from '../../controllers/wealthCentreController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Summary & Available Funds (place before /:id routes to avoid conflict)
router.get('/summary', protect, getSummary);
router.get('/available-funds', protect, getAvailableFunds);

// Asset CRUD
router.route('/assets')
  .get(protect, getAllAssets)
  .post(protect, createAsset);

router.route('/assets/:id')
  .get(protect, getAssetById)
  .put(protect, updateAsset)
  .delete(protect, deleteAsset);

export default router;