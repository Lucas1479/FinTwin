import express from 'express';
import {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
} from '../../controllers/goalController.js';
import {
  createDecisionLogEntry,
  getDecisionLogsForGoal,
  getDecisionLogsForSession,
} from '../../controllers/goalDecisionController.js';
import { generateGoalDecision, optimizeGoalAllocations } from '../../controllers/goalEngineController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Goal information / CRUD
router.route('/')
  .get(protect, getGoals)
  .post(protect, createGoal);

router.route('/:id')
  .get(protect, getGoalById)
  .put(protect, updateGoal)
  .delete(protect, deleteGoal);

// Goal engine LLM entrypoint
router.post('/engine/generate', protect, generateGoalDecision);
router.post('/engine/optimize', protect, optimizeGoalAllocations);

// Goal decision logs
router.route('/:id/decisions')
  .get(protect, getDecisionLogsForGoal)
  .post(protect, createDecisionLogEntry);

router.get('/decisions/session/:sessionId', protect, getDecisionLogsForSession);

export default router;


