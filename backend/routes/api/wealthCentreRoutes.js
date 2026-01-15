import express from 'express';
import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  convertAssetToCash,
  convertCashToAsset,
  getSummary,
  getAvailableFunds,
  syncCashAssets,
  getMaturityReminders,
} from '../../controllers/wealthCentreController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Summary & Available Funds (place before /:id routes to avoid conflict)
router.get('/summary', protect, getSummary);
router.get('/available-funds', protect, getAvailableFunds);

// Maturity Reminders (Term Deposits, Fixed Mortgages)
router.get('/reminders', protect, getMaturityReminders);

// Cash Asset Sync (Auto-projection based on Cash Flow rules)
router.post('/sync-cash', protect, syncCashAssets);

// Asset Conversion
router.post('/assets/:id/convert-to-cash', protect, convertAssetToCash);
router.post('/assets/:id/convert-from-cash', protect, convertCashToAsset);

// Asset CRUD
router.route('/assets')
  .get(protect, getAllAssets)
  .post(protect, createAsset);

router.route('/assets/:id')
  .get(protect, getAssetById)
  .put(protect, updateAsset)
  .delete(protect, deleteAsset);

export default router;