import cron from 'node-cron';
import snapshotService from '../services/snapshotService.js';
import User from '../models/userModel.js';

/**
 * ============================================================
 * Snapshot Scheduler - Automated Snapshot Generation
 * ============================================================
 * Purpose:
 * - Runs periodic checks for all users
 * - Takes snapshots for users whose schedules are due
 * - Runs cleanup tasks to remove old snapshots
 * 
 * Implementation:
 * - Uses node-cron for scheduling (lightweight, no external dependencies)
 * - Runs daily at midnight to check all users
 * - Individual user schedules determine when to take snapshots
 * ============================================================
 */

let isSchedulerRunning = false;
let cronJob = null;

/**
 * Check and take snapshots for all users whose schedules are due
 */
const checkAndTakeSnapshots = async () => {
  try {
    console.log('[SnapshotScheduler] Starting snapshot check...');
    
    // Get all users with snapshot settings enabled
    const users = await User.find({ 
      'snapshotSettings.enabled': true 
    }).select('_id snapshotSettings').lean();

    console.log(`[SnapshotScheduler] Found ${users.length} users with snapshots enabled`);

    let snapshotsTaken = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const isDue = await snapshotService.isSnapshotDue(user._id);
        
        if (isDue) {
          console.log(`[SnapshotScheduler] Taking snapshot for user ${user._id}`);
          await snapshotService.takeCombinedSnapshot(user._id, 'auto');
          snapshotsTaken++;
        }
      } catch (error) {
        console.error(`[SnapshotScheduler] Error taking snapshot for user ${user._id}:`, error.message);
        errors++;
      }
    }

    console.log(`[SnapshotScheduler] Snapshot check complete. Taken: ${snapshotsTaken}, Errors: ${errors}`);
  } catch (error) {
    console.error('[SnapshotScheduler] Error in snapshot check:', error);
  }
};

/**
 * Run cleanup task to remove old snapshots based on user settings
 */
const cleanupOldSnapshots = async () => {
  try {
    console.log('[SnapshotScheduler] Starting cleanup task...');
    
    const users = await User.find({ 
      'snapshotSettings.enabled': true 
    }).select('_id').lean();

    let totalDeleted = 0;

    for (const user of users) {
      try {
        const deletedCount = await snapshotService.cleanupUserSnapshots(user._id);
        if (deletedCount > 0) {
          console.log(`[SnapshotScheduler] Cleaned up ${deletedCount} snapshots for user ${user._id}`);
          totalDeleted += deletedCount;
        }
      } catch (error) {
        console.error(`[SnapshotScheduler] Error cleaning up snapshots for user ${user._id}:`, error.message);
      }
    }

    console.log(`[SnapshotScheduler] Cleanup complete. Total deleted: ${totalDeleted}`);
  } catch (error) {
    console.error('[SnapshotScheduler] Error in cleanup task:', error);
  }
};

/**
 * Start the snapshot scheduler
 * Runs daily at midnight (00:00) to check for due snapshots
 * Runs cleanup weekly on Sunday at 2:00 AM
 */
export const startScheduler = () => {
  if (isSchedulerRunning) {
    console.log('[SnapshotScheduler] Scheduler is already running');
    return;
  }

  console.log('[SnapshotScheduler] Starting snapshot scheduler...');

  // Schedule: Check for due snapshots every day at midnight
  // Cron format: minute hour day month weekday
  // '0 0 * * *' = At 00:00 every day
  cronJob = cron.schedule('0 0 * * *', async () => {
    console.log('[SnapshotScheduler] Daily snapshot check triggered');
    await checkAndTakeSnapshots();
  }, {
    scheduled: true,
    timezone: "Pacific/Auckland" // New Zealand timezone
  });

  // Schedule: Cleanup old snapshots every Sunday at 2:00 AM
  // '0 2 * * 0' = At 02:00 on Sunday
  cron.schedule('0 2 * * 0', async () => {
    console.log('[SnapshotScheduler] Weekly cleanup triggered');
    await cleanupOldSnapshots();
  }, {
    scheduled: true,
    timezone: "Pacific/Auckland"
  });

  isSchedulerRunning = true;
  console.log('[SnapshotScheduler] Scheduler started successfully');
  console.log('[SnapshotScheduler] - Daily snapshot check: 00:00 NZDT');
  console.log('[SnapshotScheduler] - Weekly cleanup: Sunday 02:00 NZDT');
};

/**
 * Stop the snapshot scheduler
 */
export const stopScheduler = () => {
  if (!isSchedulerRunning) {
    console.log('[SnapshotScheduler] Scheduler is not running');
    return;
  }

  if (cronJob) {
    cronJob.stop();
  }

  isSchedulerRunning = false;
  console.log('[SnapshotScheduler] Scheduler stopped');
};

/**
 * Manually trigger a snapshot check (useful for testing)
 */
export const triggerManualCheck = async () => {
  console.log('[SnapshotScheduler] Manual snapshot check triggered');
  await checkAndTakeSnapshots();
};

/**
 * Manually trigger cleanup (useful for testing)
 */
export const triggerManualCleanup = async () => {
  console.log('[SnapshotScheduler] Manual cleanup triggered');
  await cleanupOldSnapshots();
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = () => {
  return {
    isRunning: isSchedulerRunning,
    nextDailyCheck: cronJob ? 'Daily at 00:00 NZDT' : null,
    nextWeeklyCleanup: 'Sunday at 02:00 NZDT'
  };
};

export default {
  startScheduler,
  stopScheduler,
  triggerManualCheck,
  triggerManualCleanup,
  getSchedulerStatus
};
