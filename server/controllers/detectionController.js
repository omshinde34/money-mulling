const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const GraphService = require('../services/graphService');
const DetectionService = require('../services/detectionService');
const ScoringService = require('../services/scoringService');
const Transaction = require('../models/Transaction');
const DetectionResult = require('../models/DetectionResult');

const COLUMN_ALIASES = {
  transaction_id: ['transaction_id', 'txn_id', 'tx_id', 'id', 'trans_id', 'transaction', 'txnid'],
  sender_id: ['sender_id', 'sender', 'from_id', 'from', 'source_id', 'source', 'from_account', 'sender_account', 'payer_id', 'payer', 'origin'],
  receiver_id: ['receiver_id', 'receiver', 'to_id', 'to', 'target_id', 'target', 'to_account', 'receiver_account', 'payee_id', 'payee', 'destination', 'beneficiary'],
  amount: ['amount', 'value', 'sum', 'amt', 'transaction_amount', 'tx_amount', 'money', 'transfer_amount'],
  timestamp: ['timestamp', 'time', 'date', 'datetime', 'created_at', 'transaction_date', 'tx_date', 'trans_date', 'created', 'transaction_time']
};

const normalizeColumnName = (name) => {
  return name.toLowerCase().trim().replace(/[\s\-\.]+/g, '_').replace(/['"]/g, '');
};

const findColumnMapping = (headers) => {
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));
  const mapping = {};
  const missing = [];

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    let found = false;
    for (const alias of aliases) {
      const index = normalizedHeaders.indexOf(alias);
      if (index !== -1) {
        mapping[field] = headers[index];
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(field);
    }
  }

  return { mapping, missing };
};

const parseTimestamp = (value) => {
  if (!value || value.trim() === '') return null;

  const cleanValue = value.trim();

  let date = new Date(cleanValue);
  if (!isNaN(date.getTime())) return date;

  const formats = [
    /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  ];

  let match = cleanValue.match(formats[0]);
  if (match) {
    const [, year, month, day, hour = 0, min = 0, sec = 0] = match;
    return new Date(year, month - 1, day, hour, min, sec);
  }

  match = cleanValue.match(formats[1]);
  if (match) {
    const [, month, day, year, hour = 0, min = 0, sec = 0] = match;
    return new Date(year, month - 1, day, hour, min, sec);
  }

  match = cleanValue.match(formats[2]);
  if (match) {
    const [, month, day, year, hour = 0, min = 0, sec = 0] = match;
    const fullYear = parseInt(year) + 2000;
    return new Date(fullYear, month - 1, day, hour, min, sec);
  }

  const numericValue = parseFloat(cleanValue);
  if (!isNaN(numericValue)) {
    if (numericValue > 1e12) {
      return new Date(numericValue);
    }
    if (numericValue > 1e9) {
      return new Date(numericValue * 1000);
    }
  }

  return null;
};

const parseAmount = (value) => {
  if (value === null || value === undefined) return NaN;

  const cleanValue = String(value)
    .trim()
    .replace(/[$€£¥₹,\s]/g, '')
    .replace(/\((.+)\)/, '-$1');

  return parseFloat(cleanValue);
};

const validateRow = (row, rowIndex, mapping) => {
  const errors = [];

  const txId = row[mapping.transaction_id];
  if (!txId || String(txId).trim() === '') {
    errors.push(`Row ${rowIndex}: Missing transaction_id`);
  }

  const senderId = row[mapping.sender_id];
  if (!senderId || String(senderId).trim() === '') {
    errors.push(`Row ${rowIndex}: Missing sender_id`);
  }

  const receiverId = row[mapping.receiver_id];
  if (!receiverId || String(receiverId).trim() === '') {
    errors.push(`Row ${rowIndex}: Missing receiver_id`);
  }

  const amount = parseAmount(row[mapping.amount]);
  if (isNaN(amount) || amount < 0) {
    errors.push(`Row ${rowIndex}: Invalid amount "${row[mapping.amount]}"`);
  }

  const timestamp = parseTimestamp(row[mapping.timestamp]);
  if (!timestamp) {
    errors.push(`Row ${rowIndex}: Invalid timestamp format "${row[mapping.timestamp]}"`);
  }

  return errors;
};

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const transactions = [];
    const errors = [];
    let rowIndex = 0;
    let mapping = null;

    const stripBom = (str) => {
      if (str.charCodeAt(0) === 0xFEFF) {
        return str.slice(1);
      }
      return str;
    };

    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => stripBom(header).trim()
      }))
      .on('headers', (headers) => {
        const cleanHeaders = headers.map(h => stripBom(h).trim());
        console.log('CSV Headers found:', cleanHeaders);

        const result = findColumnMapping(cleanHeaders);
        mapping = result.mapping;

        if (result.missing.length > 0) {
          console.log('Column mapping:', mapping);
          console.log('Missing columns:', result.missing);
          reject(new Error(
            `Missing required columns: ${result.missing.join(', ')}\n` +
            `Found columns: ${cleanHeaders.join(', ')}\n` +
            `Expected columns (or aliases): transaction_id, sender_id, receiver_id, amount, timestamp`
          ));
        }
      })
      .on('data', (row) => {
        if (!mapping) return;

        rowIndex++;
        const rowErrors = validateRow(row, rowIndex, mapping);

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          if (errors.length > 10) {
            return;
          }
        } else {
          const txId = String(row[mapping.transaction_id]).trim() || `AUTO_${rowIndex}`;

          transactions.push({
            transaction_id: txId,
            sender_id: String(row[mapping.sender_id]).trim(),
            receiver_id: String(row[mapping.receiver_id]).trim(),
            amount: parseAmount(row[mapping.amount]),
            timestamp: parseTimestamp(row[mapping.timestamp])
          });
        }
      })
      .on('end', () => {
        if (errors.length > 0) {
          reject(new Error(`CSV validation errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : ''}`));
        } else if (transactions.length === 0) {
          reject(new Error('No valid transactions found in CSV'));
        } else {
          console.log(`Successfully parsed ${transactions.length} transactions`);
          resolve(transactions);
        }
      })
      .on('error', (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      });
  });
};

exports.uploadAndDetect = async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload a CSV file.'
      });
    }

    const filePath = req.file.path;
    let transactions;

    try {
      transactions = await parseCSV(filePath);
    } catch (parseError) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        error: parseError.message
      });
    }

    fs.unlinkSync(filePath);

    const sessionId = uuidv4();

    const graphService = new GraphService();
    const graphStats = graphService.buildGraph(transactions);

    const detectionService = new DetectionService(graphService);
    const detectionResults = detectionService.runAllDetections();

    const scoringService = new ScoringService(graphService, detectionService);

    const processingTime = (Date.now() - startTime) / 1000;
    const output = scoringService.generateOutput(processingTime);

    let graphData;
    const suspiciousAccountIds = new Set(output.suspicious_accounts.map(a => a.account_id));
    const allAccounts = graphService.getAllAccounts();

    if (allAccounts.length > 500) {
      const relevantAccounts = new Set();

      output.suspicious_accounts.forEach(acc => relevantAccounts.add(acc.account_id));
      output.fraud_rings.forEach(ring => {
        ring.member_accounts.forEach(id => relevantAccounts.add(id));
      });

      output.suspicious_accounts.forEach(acc => {
        const neighbors = graphService.getNeighbors(acc.account_id);
        neighbors.outgoing.slice(0, 5).forEach(n => relevantAccounts.add(n.to));
        neighbors.incoming.slice(0, 5).forEach(n => relevantAccounts.add(n.from));
      });

      graphData = graphService.getSubgraph(Array.from(relevantAccounts));
      console.log(`Large dataset: showing ${relevantAccounts.size} of ${allAccounts.length} accounts`);
    } else {
      graphData = graphService.getGraphForVisualization();
    }

    graphData.nodes = graphData.nodes.map(node => {
      const suspiciousAccount = output.suspicious_accounts.find(a => a.account_id === node.id);
      return {
        ...node,
        suspicious: suspiciousAccountIds.has(node.id),
        score: suspiciousAccount ? suspiciousAccount.suspicion_score : 0,
        patterns: suspiciousAccount ? suspiciousAccount.detected_patterns : [],
        ring_id: suspiciousAccount ? suspiciousAccount.ring_id : null
      };
    });

    graphData.totalNodes = allAccounts.length;
    graphData.isFiltered = allAccounts.length > 500;

    const detectionResult = new DetectionResult({
      session_id: sessionId,
      suspicious_accounts: output.suspicious_accounts,
      fraud_rings: output.fraud_rings,
      summary: output.summary,
      graph_data: graphData
    });

    await detectionResult.save();

    try {
      const transactionsWithSession = transactions.map(tx => ({
        ...tx,
        session_id: sessionId
      }));
      await Transaction.insertMany(transactionsWithSession, { ordered: false });
    } catch (dbError) {
      console.warn('Some transactions may have failed to save:', dbError.message);
    }

    res.json({
      success: true,
      session_id: sessionId,
      ...output,
      graph_data: graphData,
      detection_details: {
        cycles_detected: detectionResults.cycles.count,
        fan_in_patterns: detectionResults.smurfing.fanIn,
        fan_out_patterns: detectionResults.smurfing.fanOut,
        layered_shell_chains: detectionResults.layeredShells.count
      }
    });

  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during detection processing',
      details: error.message
    });
  }
};

exports.downloadResult = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await DetectionResult.findOne({ session_id: id });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Detection result not found'
      });
    }

    const output = {
      suspicious_accounts: result.suspicious_accounts,
      fraud_rings: result.fraud_rings,
      summary: result.summary
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=graphshield-result-${id}.json`);
    res.json(output);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download result'
    });
  }
};

exports.getResult = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await DetectionResult.findOne({ session_id: id });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Detection result not found'
      });
    }

    res.json({
      success: true,
      session_id: id,
      suspicious_accounts: result.suspicious_accounts,
      fraud_rings: result.fraud_rings,
      summary: result.summary,
      graph_data: result.graph_data
    });

  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve result'
    });
  }
};

exports.healthCheck = (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

exports.getStats = async (req, res) => {
  try {
    const totalResults = await DetectionResult.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    const latestResult = await DetectionResult.findOne()
      .sort({ createdAt: -1 })
      .select('summary createdAt');

    res.json({
      success: true,
      stats: {
        total_analyses: totalResults,
        total_transactions_processed: totalTransactions,
        latest_analysis: latestResult ? {
          date: latestResult.createdAt,
          summary: latestResult.summary
        } : null
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats'
    });
  }
};
