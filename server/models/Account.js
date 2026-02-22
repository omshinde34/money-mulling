const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  account_id: {
    type: String,
    required: true,
    index: true
  },
  session_id: {
    type: String,
    required: true,
    index: true
  },
  total_outgoing: {
    type: Number,
    default: 0
  },
  total_incoming: {
    type: Number,
    default: 0
  },
  outgoing_count: {
    type: Number,
    default: 0
  },
  incoming_count: {
    type: Number,
    default: 0
  },
  total_amount_sent: {
    type: Number,
    default: 0
  },
  total_amount_received: {
    type: Number,
    default: 0
  },
  first_transaction: {
    type: Date
  },
  last_transaction: {
    type: Date
  },
  is_merchant: {
    type: Boolean,
    default: false
  },
  suspicion_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  detected_patterns: [{
    type: String
  }],
  ring_id: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

accountSchema.index({ account_id: 1, session_id: 1 }, { unique: true });
accountSchema.index({ suspicion_score: -1 });

module.exports = mongoose.model('Account', accountSchema);
