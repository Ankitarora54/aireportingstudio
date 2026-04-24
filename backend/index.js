import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import commentaryRoutes from './routes/commentary.js';
import pdfRoutes from './routes/pdf.js';
import portfolioRoutes from './routes/portfolio.js';

const app = express();
const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  process.env.FRONTEND_ORIGIN ??
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/commentary', commentaryRoutes);
app.use('/api/pdf', pdfRoutes);
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use((err, _req, res, _next) => {
  console.error('SERVER ERROR:', err);

  const statusCode = err?.statusCode || err?.status || 500;
  const message = typeof err?.message === 'string' && err.message.trim()
    ? err.message
    : 'Internal server error';

  res.status(statusCode).json({
    error: message,
  });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
