import express from 'express';
import {
  getWealthHistory,
  getGoalHistory,
  takeManualWealthSnapshot,
  takeManualGoalSnapshot,
  takeManualCombinedSnapshot,
  getSnapshotSettings,
  updateSnapshotSettings,
  getSnapshotStatus,
  cleanupSnapshots
} from '../../controllers/snapshotController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * ============================================================
 * Snapshot Routes
 * ============================================================
 * All routes require authentication (protect middleware)
 * ============================================================
 */

// Snapshot Settings
router.get('/settings', protect, getSnapshotSettings);
router.put('/settings', protect, updateSnapshotSettings);

// Snapshot Status
router.get('/status', protect, getSnapshotStatus);

// Wealth Snapshots
router.get('/wealth', protect, getWealthHistory);
router.post('/wealth/manual', protect, takeManualWealthSnapshot);

// Goal Snapshots
router.get('/goals/:goalId', protect, getGoalHistory);
router.post('/goals/:goalId/manual', protect, takeManualGoalSnapshot);

// Combined Snapshots (wealth + all goals)
router.post('/combined/manual', protect, takeManualCombinedSnapshot);

// Cleanup
router.delete('/cleanup', protect, cleanupSnapshots);

export default router;
