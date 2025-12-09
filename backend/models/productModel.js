const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['KiwiSaver', 'ManagedFunds', 'TermDeposit'],
    required: true
  },
  provider: { type: String, required: true },
  providerLogo: String,
  name: { type: String, required: true },
  riskLevel: {
    type: String,
    enum: ['Conservative', 'Balanced', 'Growth', 'Aggressive'],
    required: true
  },
  riskScore: { type: Number, min: 1, max: 7 },
  fees: { type: Number, required: true },
  minimumInvestment: { type: Number, default: 0 },
  returns: {
    '1y': { type: Number, required: true },
    '5y': Number
  },
  topHoldings: [String],
  description: String,
  strategy: String,
  fundManager: String,
  performanceGraph: {
    '1y': [{
      date: String,
      value: Number,
      benchmark: Number
    }],
    '5y': [{
      date: String,
      value: Number,
      benchmark: Number
    }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);