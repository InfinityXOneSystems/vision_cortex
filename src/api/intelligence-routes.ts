/**
 * 🌐 VISION CORTEX API ENDPOINTS
 * Quantum Intelligence Synthesis API for Frontend/Backend Integration
 */

import express from 'express';
import { QuantumIntelligenceCore } from '../intelligence/quantum-core';
import { IntelligenceSynthesisRequest, SignalDetectionQuery, AnomalyQuery } from '../intelligence/types';

const router = express.Router();
const quantumCore = new QuantumIntelligenceCore();

// 🧠 1. Intelligence Synthesis Engine
router.post('/intelligence/synthesize', async (req, res) => {
  try {
    const request: IntelligenceSynthesisRequest = req.body;
    const intelligence = await quantumCore.synthesizeIntelligence(request);
    res.json(intelligence);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 🧠 2. Signal Detection Engine  
router.get('/signals', async (req, res) => {
  try {
    const query: SignalDetectionQuery = req.query as any;
    const signals = await quantumCore.detectSignals(query);
    res.json({ signals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🧠 3. Anomaly Detection Engine
router.get('/anomalies', async (req, res) => {
  try {
    const query: AnomalyQuery = req.query as any;
    const anomalies = await quantumCore.detectAnomalies(query);
    res.json({ anomalies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🧠 4. Classified Intelligence Preview
router.get('/classified/preview', async (req, res) => {
  try {
    const preview = await quantumCore.getClassifiedPreview();
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 System Status
router.get('/status', (req, res) => {
  res.json(quantumCore.getSystemStatus());
});

export default router;