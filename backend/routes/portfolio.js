import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateAllocation,
  calculateMetrics,
  calculateRiskMetrics,
  sectorPerformance,
  topHoldings,
  validatePortfolioData,
} from '../utils/analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });
const DEFAULT_SAMPLE_CSV = `stock,sector,weight,return
NVIDIA,Technology,24,8.6
Microsoft,Technology,20,6.2
JPMorgan,Financials,18,3.4
Exxon Mobil,Energy,14,2.8
UnitedHealth,Healthcare,12,4.1
Costco,Consumer,12,5.3`;

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(',').map((col) => col.trim().toLowerCase());

  return lines.filter(Boolean).map((line) => {
    const vals = line.split(',');
    const row = {};

    cols.forEach((col, index) => {
      row[col] = vals[index];
    });

    return row;
  });
}

function shapeResponse(rows, validation, benchmarkReturn = 4.2, peer1 = 3.8, peer2 = 4.0) {
  const metrics = calculateMetrics(rows);
  const riskMetrics = calculateRiskMetrics(rows);
  const allocation = calculateAllocation(rows);
  const sectorPerf = sectorPerformance(rows);
  const benchmarkData = {
    benchmark_return: Number(benchmarkReturn),
    alpha: metrics.avg_return - Number(benchmarkReturn),
  };
  const peerAverage = (Number(peer1) + Number(peer2)) / 2;
  const peerData = {
    peer_1_return: Number(peer1),
    peer_2_return: Number(peer2),
    peer_average: peerAverage,
    relative_vs_peers: metrics.avg_return - peerAverage,
  };

  return {
    validation,
    metrics,
    riskMetrics,
    allocation,
    sectorPerformance: sectorPerf,
    benchmarkData,
    peerData,
    topHoldings: topHoldings(rows),
    rows,
  };
}

router.get('/sample', (_, res) => {
  try {
    const samplePath = path.join(__dirname, '..', 'sample', 'sample_fund.csv');
    const csv = fs.existsSync(samplePath)
      ? fs.readFileSync(samplePath, 'utf-8')
      : DEFAULT_SAMPLE_CSV;
    const parsed = parseCsv(csv);
    const { messages, cleaned } = validatePortfolioData(parsed);

    res.json(shapeResponse(cleaned, messages));
  } catch (error) {
    console.error('SAMPLE PORTFOLIO ERROR:', error);
    res.status(500).json({ error: 'Unable to load the sample portfolio.' });
  }
});

router.post('/upload', upload.fields([{ name: 'portfolio', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), (req, res) => {
  const file = req.files?.portfolio?.[0];
  if (!file) {
    return res.status(400).json({ error: 'Portfolio CSV is required.' });
  }

  const csv = fs.readFileSync(file.path, 'utf-8');
  const parsed = parseCsv(csv);
  const { messages, cleaned } = validatePortfolioData(parsed);

  res.json(shapeResponse(cleaned, messages, req.body.benchmarkReturn, req.body.peer1, req.body.peer2));
});

export default router;
