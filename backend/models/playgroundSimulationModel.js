import mongoose from 'mongoose';

const PlaygroundSimulationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional reference to a reusable background profile
    background: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlaygroundBackground',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Please add a name for this simulation'],
      default: 'Untitled Simulation',
    },
    // Snapshot of the profile/background used for this simulation
    profile: {
      type: Object, // Storing the full profile snapshot or a ref if profiles become entities
      required: true,
    },
    // The parameters adjusted in the simulation
    goalId: {
      type: String, // Can be a real goal ID or null
      default: null,
    },
    parameters: {
      monthlyContribution: { type: Number, default: 0 },
      retirementAge: { type: Number, default: 65 },
      inflationRate: { type: Number, default: 3 }, // %
      returnRate: { type: Number, default: 7 }, // %
      lumpSum: { type: Number, default: 0 },
      isInflationAdjusted: { type: Boolean, default: true },
      // Add other flexible parameters as needed
    },
    // Cached results (optional, depending on if we want to store output or re-calc)
    results: {
      successProbability: { type: Number },
      finalAmount: { type: Number },
      status: { type: String, enum: ['safe', 'risky', 'unknown'], default: 'unknown' },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('PlaygroundSimulation', PlaygroundSimulationSchema);

