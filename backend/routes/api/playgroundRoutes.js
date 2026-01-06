import express from 'express';
import asyncHandler from 'express-async-handler';
import PlaygroundSimulation from '../../models/playgroundSimulationModel.js';
import PlaygroundBackground from '../../models/playgroundBackgroundModel.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Utility: convert a background document or plain object to a snapshot (strip ids & user)
const toSnapshot = (backgroundPayload) => {
  if (!backgroundPayload) return null;
  const obj = backgroundPayload.toObject ? backgroundPayload.toObject() : backgroundPayload;
  // eslint-disable-next-line no-unused-vars
  const { _id, id, user, user_id, createdAt, updatedAt, __v, ...rest } = obj;
  return rest;
};

// All playground routes are private
router.use(protect);

// ===== Background CRUD =====
// @desc    Get all backgrounds for current user
// @route   GET /api/playground/backgrounds
router.get(
  '/backgrounds',
  asyncHandler(async (req, res) => {
    const backgrounds = await PlaygroundBackground.find({ user: req.user._id }).sort('-updatedAt');
    res.json(backgrounds);
  })
);

// @desc    Create a background
// @route   POST /api/playground/backgrounds
router.post(
  '/backgrounds',
  asyncHandler(async (req, res) => {
    const { name, identity, financials, income, preferences, meta } = req.body || {};

    const background = await PlaygroundBackground.create({
      user: req.user._id,
      name: name || 'Untitled Background',
      identity: identity || {},
      financials: financials || {},
      income: income || {},
      preferences: preferences || {},
      meta: meta || {},
    });

    res.status(201).json(background);
  })
);

// @desc    Update a background
// @route   PUT /api/playground/backgrounds/:id
router.put(
  '/backgrounds/:id',
  asyncHandler(async (req, res) => {
    const background = await PlaygroundBackground.findById(req.params.id);

    if (!background) {
      res.status(404);
      throw new Error('Background not found');
    }

    if (background.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to update this background');
    }

    const fields = ['name', 'identity', 'financials', 'income', 'preferences', 'meta'];
    fields.forEach((field) => {
      if (typeof req.body[field] !== 'undefined') {
        background[field] = req.body[field];
      }
    });

    const updated = await background.save();
    res.json(updated);
  })
);

// @desc    Delete a background
// @route   DELETE /api/playground/backgrounds/:id
router.delete(
  '/backgrounds/:id',
  asyncHandler(async (req, res) => {
    const background = await PlaygroundBackground.findById(req.params.id);

    if (!background) {
      res.status(404);
      throw new Error('Background not found');
    }

    if (background.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to delete this background');
    }

    await background.deleteOne();
    res.json({ message: 'Background removed' });
  })
);

// ===== Simulation CRUD =====
// @desc    Get all simulations for current user
// @route   GET /api/playground/simulations
router.get(
  '/simulations',
  asyncHandler(async (req, res) => {
    const simulations = await PlaygroundSimulation.find({ user: req.user._id })
      .sort('-updatedAt')
      .lean();
    res.json(simulations);
  })
);

// @desc    Get single simulation
// @route   GET /api/playground/simulations/:id
router.get(
  '/simulations/:id',
  asyncHandler(async (req, res) => {
    const simulation = await PlaygroundSimulation.findById(req.params.id);

    if (simulation) {
      if (simulation.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to access this simulation');
      }
      res.json(simulation);
    } else {
      res.status(404);
      throw new Error('Simulation not found');
    }
  })
);

// @desc    Create a new simulation
// @route   POST /api/playground/simulations
router.post(
  '/simulations',
  asyncHandler(async (req, res) => {
    const { name, profile, backgroundId, goalId, parameters, results } = req.body || {};

    let backgroundDoc = null;
    if (backgroundId) {
      backgroundDoc = await PlaygroundBackground.findOne({
        _id: backgroundId,
        user: req.user._id,
      });
      if (!backgroundDoc) {
        res.status(404);
        throw new Error('Background not found for this user');
      }
    }

    const profileSnapshot = profile || toSnapshot(backgroundDoc);
    if (!profileSnapshot) {
      res.status(400);
      throw new Error('Profile/background data is required to create a simulation');
    }

    const defaultParams = {
      monthlyContribution: 0,
      retirementAge: 65,
      inflationRate: 3,
      returnRate: 7,
    };

    const simulation = await PlaygroundSimulation.create({
      user: req.user._id,
      background: backgroundDoc?._id || null,
      name: name || 'Untitled Simulation',
      profile: profileSnapshot,
      goalId,
      parameters: { ...defaultParams, ...(parameters || {}) },
      results: results || {},
    });

    res.status(201).json(simulation);
  })
);

// @desc    Update a simulation
// @route   PUT /api/playground/simulations/:id
router.put(
  '/simulations/:id',
  asyncHandler(async (req, res) => {
    const simulation = await PlaygroundSimulation.findById(req.params.id);

    if (!simulation) {
      res.status(404);
      throw new Error('Simulation not found');
    }

    if (simulation.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to update this simulation');
    }

    const { name, profile, backgroundId, goalId, parameters, results } = req.body || {};

    let backgroundDoc = null;
    if (backgroundId) {
      backgroundDoc = await PlaygroundBackground.findOne({
        _id: backgroundId,
        user: req.user._id,
      });
      if (!backgroundDoc) {
        res.status(404);
        throw new Error('Background not found for this user');
      }
      simulation.background = backgroundDoc._id;
      // If caller didn't send an explicit profile snapshot, refresh from the background
      if (!profile) {
        simulation.profile = toSnapshot(backgroundDoc);
      }
    }

    if (profile) {
      simulation.profile = profile;
    }

    if (typeof name !== 'undefined') {
      simulation.name = name || simulation.name;
    }

    if (typeof goalId !== 'undefined') {
      simulation.goalId = goalId;
    }

    if (parameters) {
      simulation.parameters = { ...(simulation.parameters || {}), ...parameters };
    }

    if (results) {
      simulation.results = { ...(simulation.results || {}), ...results };
    }

    const updatedSimulation = await simulation.save();
    res.json(updatedSimulation);
  })
);

// @desc    Delete a simulation
// @route   DELETE /api/playground/simulations/:id
router.delete(
  '/simulations/:id',
  asyncHandler(async (req, res) => {
    const simulation = await PlaygroundSimulation.findById(req.params.id);

    if (simulation) {
      if (simulation.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to delete this simulation');
      }

      await simulation.deleteOne();
      res.json({ message: 'Simulation removed' });
    } else {
      res.status(404);
      throw new Error('Simulation not found');
    }
  })
);

export default router;

