'use strict';

const express = require('express');
const cors = require('cors');

const { createApiRouter } = require('./routes/api.js');
const { errorHandler, notFoundHandler } = require('./middleware/errors.js');
const { getEnv } = require('./utils/env.js');

const app = express();

/**
 * App metadata (OpenAPI-like; Express doesn't generate OpenAPI by default)
 * but we keep consistent documentation patterns in route docstrings.
 */
const APP_META = {
  title: 'News Hub Backend API',
  description:
    'Express REST API for News Hub. Proxies upstream news browsing/search and persists favorites + settings into SQLite.',
  version: '0.1.0',
};

// Trust proxy so req.ip, etc. behave behind ingress.
app.set('trust proxy', 1);

// CORS: allow local dev frontend + same-origin usage.
const corsOrigin = getEnv('CORS_ORIGIN', '*');
app.use(
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((s) => s.trim()),
    credentials: false,
  })
);

// Body parsing.
app.use(express.json({ limit: '1mb' }));

// Basic health + meta.
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'news_backend_api', ...APP_META });
});

// Optional docs endpoint (requested in backend guideline: docs route for usage help).
app.get('/docs', (req, res) => {
  res.type('text/plain').send(
    [
      `${APP_META.title} v${APP_META.version}`,
      '',
      APP_META.description,
      '',
      'Endpoints:',
      '  GET    /api/news?category=&q=&page=&pageSize=&country=',
      '  GET    /api/news/:id',
      '  GET    /api/favorites',
      '  POST   /api/favorites  { article: Article }',
      '  DELETE /api/favorites/:id',
      '  GET    /api/settings',
      '  PUT    /api/settings   { country, defaultCategory }',
      '',
      'Environment variables:',
      '  PORT                   (default 3001)',
      '  CORS_ORIGIN             (default "*"; or comma-separated list)',
      '  NEWS_DB_PATH            (optional; path to SQLite db file)',
      '  NEWS_PROVIDER           ("mock" | "newsapi"; default "mock")',
      '  NEWSAPI_KEY             (required when NEWS_PROVIDER=newsapi)',
      '  NEWS_FETCH_TIMEOUT_MS   (default 12000)',
      '',
      'Notes:',
      '- In dev, the React frontend proxies /api to http://localhost:3001.',
      '- Favorites and settings are stored in SQLite via the shared news_database module.',
    ].join('\n')
  );
});

app.use('/api', createApiRouter());

// 404 + error handling
app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(getEnv('PORT', '3001'));
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[news_backend_api] listening on :${port}`);
});
