import express from 'express';
import {
  generateCommentary,
  getCommentaryHealth,
  getCommentaryPrompt,
  saveCommentaryPrompt,
} from '../services/openaiService.js';

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

router.get('/prompt', (_req, res, next) => {
  try {
    res.json(getCommentaryPrompt());
  } catch (error) {
    next(error);
  }
});

router.put('/prompt', (req, res, next) => {
  try {
    res.json(saveCommentaryPrompt(req.body?.prompt));
  } catch (error) {
    next(error);
  }
});

export default router;
