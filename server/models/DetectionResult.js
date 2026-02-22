const mongoose = require('mongoose');

const detectionResultSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  suspicious_accounts: [{
    account_id: String,
    suspicion_score: Number,
    detected_patterns: [String],
    ring_id: String
  }],
  fraud_rings: [{
    ring_id: String,
    member_accounts: [String],
    pattern_type: String,
    risk_score: Number
  }],
  summary: {
    total_accounts_analyzed: Number,
    suspicious_accounts_flagged: Number,
    fraud_rings_detected: Number,
    processing_time_seconds: Number
  },
  graph_data: {
    nodes: [{
      id: String,
      suspicious: Boolean,
      score: Number,
      patterns: [String],
      ring_id: String
    }],
    edges: [{
      source: String,
      target: String,
      amount: Number,
      timestamp: Date
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DetectionResult', detectionResultSchema);
