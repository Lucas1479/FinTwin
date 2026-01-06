import mongoose from 'mongoose';

const PlaygroundBackgroundSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a name for this background'],
      default: 'Untitled Background',
      trim: true,
    },
    // Flexible profile payload used by the Playground (identity, income, balance sheet, risk prefs)
    identity: {
      type: Object,
      default: {},
    },
    financials: {
      type: Object,
      default: {},
    },
    income: {
      type: Object,
      default: {},
    },
    preferences: {
      type: Object,
      default: {},
    },
    // Optional metadata hook for future expansions (tags, notes, etc.)
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

PlaygroundBackgroundSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('PlaygroundBackground', PlaygroundBackgroundSchema);


