const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    index: true
  },
  sender_id: {
    type: String,
    required: true,
    index: true
  },
  receiver_id: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  session_id: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

transactionSchema.index({ sender_id: 1, timestamp: 1 });
transactionSchema.index({ receiver_id: 1, timestamp: 1 });
transactionSchema.index({ session_id: 1, timestamp: 1 });
transactionSchema.index({ transaction_id: 1, session_id: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
