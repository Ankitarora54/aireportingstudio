import express from 'express';
import { generateCommentary, getCommentaryHealth } from '../services/openaiService.js';

const router = express.Router();

router.post('/generate', async (req, res, next) => {
  try {
    const result = await generateCommentary(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/health', (_req, res) => {
  res.json(getCommentaryHealth());
});

export default router;
