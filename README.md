# GraphShield - Money Muling Detection Engine

<p align="center">
  <img src="client/public/shield.svg" alt="GraphShield Logo" width="80" height="80">
</p>

<p align="center">
  <strong>Advanced Graph-Based Financial Crime Detection Platform</strong>
</p>

<p align="center">
  Built for the RIFT 2026 Money Muling Detection Challenge
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Detection Algorithms](#detection-algorithms)
- [Suspicion Scoring Model](#suspicion-scoring-model)
- [API Documentation](#api-documentation)
- [Installation](#installation)
- [Deployment](#deployment)
- [Performance](#performance)
- [Known Limitations](#known-limitations)

---

## Overview

GraphShield is a production-grade web application for detecting money muling patterns in financial transaction data. It uses graph-based algorithms to identify:

- **Circular Transaction Patterns (Cycles)**: Funds that flow in a loop, returning to the origin
- **Smurfing Patterns**: Fan-in/fan-out structures where multiple small transactions aggregate or disperse
- **Layered Shell Chains**: Multi-hop transactions through intermediary shell accounts

### Key Features

- CSV upload with strict validation
- Real-time graph visualization using Cytoscape.js
- Interactive fraud ring exploration
- Downloadable JSON reports
- False positive controls for merchants and payroll accounts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ UploadSection│  │  GraphView   │  │  RingTable   │               │
│  │   (CSV)      │  │ (Cytoscape)  │  │  (Results)   │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                           │                                          │
│                    ┌──────┴──────┐                                   │
│                    │  Dashboard  │                                   │
│                    └──────┬──────┘                                   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────┼─────────────────────────────────────────┐
│                       SERVER (Node.js/Express)                      │
├───────────────────────────┼─────────────────────────────────────────┤
│                    ┌──────┴──────┐                                   │
│                    │   Routes    │                                   │
│                    └──────┬──────┘                                   │
│                           │                                          │
│                    ┌──────┴──────┐                                   │
│                    │ Controller  │                                   │
│                    └──────┬──────┘                                   │
│         ┌─────────────────┼─────────────────┐                        │
│         │                 │                 │                        │
│  ┌──────┴─────┐    ┌──────┴─────┐    ┌──────┴─────┐                  │
│  │   Graph    │    │ Detection  │    │  Scoring   │                  │
│  │  Service   │───▶│  Service   │───▶│  Service   │                  │
│  └────────────┘    └────────────┘    └────────────┘                  │
│         │                                                            │
│  ┌──────┴──────────────────────────────────────────┐                 │
│  │              Adjacency List (Map)               │                 │
│  │   Map<account_id, { outgoing: [], incoming: [] }>                 │
│  └──────┬──────────────────────────────────────────┘                 │
│         │                                                            │
└─────────┼────────────────────────────────────────────────────────────┘
          │
┌─────────┴────────────────────────────────────────────────────────────┐
│                         MongoDB (Persistence)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Transactions │  │   Accounts   │  │   Results    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
graphshield/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadSection.jsx
│   │   │   ├── GraphView.jsx
│   │   │   ├── RingTable.jsx
│   │   │   ├── SummaryCard.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── FeatureSection.jsx
│   │   │   ├── AccountSearch.jsx
│   │   │   └── RingFilter.jsx
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   ├── utils/
│   │   │   └── graphUtils.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   │   └── shield.svg
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── server/                    # Express backend
│   ├── controllers/
│   │   └── detectionController.js
│   ├── services/
│   │   ├── graphService.js
│   │   ├── detectionService.js
│   │   └── scoringService.js
│   ├── models/
│   │   ├── Transaction.js
│   │   ├── Account.js
│   │   └── DetectionResult.js
│   ├── routes/
│   │   └── detectionRoutes.js
│   ├── utils/
│   │   └── timeWindow.js
│   ├── server.js
│   └── package.json
│
├── sample-transactions.csv    # Sample test data
├── package.json               # Root package.json
└── README.md
```

---

## Detection Algorithms

### 1. Cycle Detection (Length 3-5)

**Algorithm**: Modified Depth-First Search (DFS)

```
FUNCTION detectCycles(graph, minLength=3, maxLength=5):
    cycles = []
    cycleSet = Set()  // For deduplication
    
    FOR each account in graph:
        IF account is merchant OR payroll:
            CONTINUE
        
        DFS(account, account, [account], cycleSet, cycles, minLength, maxLength)
    
    RETURN cycles

FUNCTION DFS(start, current, path, cycleSet, cycles, minLen, maxLen):
    IF path.length > maxLen + 1:
        RETURN
    
    FOR each neighbor in getOutgoingNeighbors(current):
        IF neighbor == start AND minLen <= path.length <= maxLen:
            normalizedCycle = normalize(path)
            IF normalizedCycle NOT IN cycleSet:
                cycleSet.add(normalizedCycle)
                cycles.add(path)
        
        IF neighbor IN path:  // Already visited in this path
            CONTINUE
        
        IF path.length >= maxLen:
            CONTINUE
        
        path.push(neighbor)
        DFS(start, neighbor, path, cycleSet, cycles, minLen, maxLen)
        path.pop()
```

**Complexity**: O(V × d^k) where V = vertices, d = average degree, k = max cycle length

**Optimizations**:
- Early termination when path exceeds max length
- Merchant/payroll account pruning
- Cycle normalization to avoid duplicates

### 2. Smurfing Detection (Fan-in/Fan-out)

**Algorithm**: Sliding Time Window Analysis

```
FUNCTION detectSmurfing(graph, minConnections=10, windowHours=72):
    patterns = []
    
    FOR each account in graph:
        IF account is merchant OR payroll:
            CONTINUE
        
        // Fan-in detection
        incoming = getIncomingTransactions(account)
        IF incoming.length >= minConnections:
            window = slidingWindowAnalysis(incoming, windowHours)
            IF uniqueSenders(window.maxWindow) >= minConnections:
                patterns.add(FAN_IN_PATTERN)
        
        // Fan-out detection
        outgoing = getOutgoingTransactions(account)
        IF outgoing.length >= minConnections:
            window = slidingWindowAnalysis(outgoing, windowHours)
            IF uniqueReceivers(window.maxWindow) >= minConnections:
                patterns.add(FAN_OUT_PATTERN)
    
    RETURN patterns

FUNCTION slidingWindowAnalysis(transactions, windowHours):
    sorted = sortByTimestamp(transactions)
    windowMs = windowHours * 3600000
    maxWindow = null
    maxCount = 0
    
    FOR i = 0 to sorted.length:
        windowStart = sorted[i].timestamp
        windowEnd = windowStart + windowMs
        
        windowTxs = filter(sorted, tx => windowStart <= tx.timestamp <= windowEnd)
        
        IF windowTxs.length > maxCount:
            maxCount = windowTxs.length
            maxWindow = windowTxs
    
    RETURN { maxCount, maxWindow }
```

**Complexity**: O(E × log E) for sorting + O(E × W) for window analysis
where E = edges, W = window transaction count

### 3. Layered Shell Chain Detection

**Algorithm**: Modified DFS with Shell Node Validation

```
FUNCTION detectLayeredShells(graph, minHops=3, maxTxPerShell=3):
    chains = []
    visited = Set()
    
    FOR each account in graph:
        IF account is merchant OR payroll:
            CONTINUE
        
        // Start from accounts with mostly outgoing transactions
        IF incomingCount(account) > maxTxPerShell:
            CONTINUE
        
        DFSShells(account, [account], chains, visited, minHops, maxTxPerShell)
    
    RETURN chains

FUNCTION DFSShells(current, path, chains, visited, minHops, maxTx):
    IF path.length > 10:  // Max depth limit
        RETURN
    
    FOR each neighbor in getOutgoingNeighbors(current):
        IF neighbor IN path:
            CONTINUE
        
        totalTx = outgoingCount(neighbor) + incomingCount(neighbor)
        isShell = (2 <= totalTx <= maxTx)
        
        IF isShell OR path.length >= minHops - 1:
            newPath = path + [neighbor]
            
            IF newPath.length >= minHops:
                chainKey = join(newPath, "->")
                IF chainKey NOT IN visited:
                    visited.add(chainKey)
                    IF validateChain(newPath, maxTx):
                        chains.add(newPath)
            
            IF isShell:
                DFSShells(neighbor, newPath, chains, visited, minHops, maxTx)
```

**Complexity**: O(V × d^m) where m = max chain depth (10)

---

## Suspicion Scoring Model

### Scoring Weights

| Pattern | Points |
|---------|--------|
| Cycle Involvement | +40 |
| Smurfing Aggregator | +30 |
| Smurfing Distributor | +30 |
| Smurfing Participant | +15 |
| Layered Shell Chain | +20 |
| High Velocity (<24h) | +10 |

### False Positive Reductions

| Condition | Reduction |
|-----------|-----------|
| Merchant Account | -30 |
| Payroll Account | -30 |
| High Volume + Low Variance | -20 |

### Scoring Formula

```
raw_score = Σ(pattern_weights)
reductions = Σ(applicable_reductions)
final_score = max(0, min(100, raw_score - reductions))
```

### Merchant Detection Logic

An account is classified as a merchant if:
1. Total transactions > 1000
2. Incoming/Outgoing ratio < 0.1 OR > 10

### Payroll Detection Logic

An account is classified as payroll if:
1. Outgoing transactions > 20
2. Incoming transactions < 10% of outgoing
3. Coefficient of variation of outgoing amounts < 0.3

---

## API Documentation

### POST /api/upload

Upload CSV file for analysis.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` (CSV file)

**Response**:
```json
{
  "success": true,
  "session_id": "uuid",
  "suspicious_accounts": [...],
  "fraud_rings": [...],
  "summary": {...},
  "graph_data": {...}
}
```

### GET /api/download/:id

Download analysis results as JSON.

**Response**: JSON file download

### GET /api/result/:id

Retrieve stored analysis results.

### GET /api/health

Server health check.

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "ISO timestamp",
  "uptime": 12345
}
```

---

## Installation

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0 (optional, for persistence)
- npm >= 9.0.0

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd graphshield
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Configure environment**
```bash
cp server/.env.example server/.env
# Edit server/.env with your MongoDB connection string
```

4. **Start development servers**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Production Build

```bash
npm run build
npm start
```

---

## Deployment

### Render Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install && cd server && npm install && cd ../client && npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV=production`
     - `MONGODB_URI=<your-mongodb-uri>`

### Railway Deployment

1. Create a new project on Railway
2. Connect your GitHub repository
3. Add MongoDB plugin
4. Configure environment variables:
   - `NODE_ENV=production`
   - `PORT=3000` (Railway assigns port automatically)

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm run install:all

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

---

## Performance

### Benchmarks

| Dataset Size | Processing Time | Memory Usage |
|--------------|-----------------|--------------|
| 1,000 tx | ~0.5s | ~50MB |
| 5,000 tx | ~2s | ~100MB |
| 10,000 tx | ~5s | ~200MB |

### Optimization Techniques

1. **Map-based Adjacency List**: O(1) neighbor lookup
2. **Early Pruning**: Skip merchant/payroll accounts
3. **Cycle Normalization**: Avoid duplicate cycle detection
4. **Sliding Window**: Efficient time-based analysis
5. **Depth Limits**: Prevent exponential path exploration

### Scalability Considerations

- For datasets > 10,000 transactions, consider:
  - Batch processing
  - Worker threads for parallel detection
  - Streaming CSV parsing

---

## Known Limitations

1. **Memory Constraints**: Graph is held in memory; very large datasets (>100k tx) may require optimization

2. **Single-Node Processing**: No distributed processing support

3. **Static Thresholds**: Detection thresholds are fixed (e.g., 10 connections for smurfing)

4. **Timestamp Granularity**: Relies on accurate timestamps; missing/invalid timestamps affect time-window analysis

5. **No Real-Time Processing**: Batch analysis only; no streaming support

6. **Simple Merchant Detection**: May not catch all legitimate high-volume accounts

---

## Precision/Recall Considerations

### Precision Optimization

- Merchant/payroll filtering reduces false positives
- Multiple pattern requirements increase confidence
- Weighted scoring differentiates severity

### Recall Optimization

- Multiple detection algorithms catch different patterns
- Sliding window catches patterns across time boundaries
- Shell chain detection finds multi-hop layering

### Trade-offs

| Setting | Effect on Precision | Effect on Recall |
|---------|--------------------:|----------------:|
| Lower smurfing threshold | ↓ | ↑ |
| Higher cycle length | ↑ | ↓ |
| Stricter merchant rules | ↓ | ↑ |
| Longer time windows | ↓ | ↑ |

---

## License

MIT License - Built for RIFT 2026 Challenge

---

## Support

For issues and feature requests, please open a GitHub issue.
