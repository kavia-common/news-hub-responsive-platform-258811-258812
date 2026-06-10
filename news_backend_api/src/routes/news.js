'use strict';

const express = require('express');

const { getEnv } = require('../utils/env.js');
const { HttpError } = require('../utils/httpError.js');
const { stableArticleId, normalizeArticle } = require('../utils/newsNormalize.js');
const { createNewsProvider } = require('../services/newsProvider.js');

const router = express.Router();

/**
 * GET /api/news
 * Query:
 * - category?: string
 * - q?: string
 * - page?: number (1-based)
 * - pageSize?: number
 * - country?: string (2-letter)
 *
 * Response: { articles, page, pageSize, totalResults?, hasMore? }
 */
router.get('/', async (req, res, next) => {
  try {
    const provider = createNewsProvider();

    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    const page = Math.max(1, Number(req.query.page || 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10) || 10));
    const country =
      typeof req.query.country === 'string'
        ? req.query.country.toLowerCase()
        : getEnv('DEFAULT_COUNTRY', 'us');

    const result = await provider.list({ category, q, page, pageSize, country });

    const articles = (result.articles || []).map((a) => {
      const normalized = normalizeArticle(a);
      return {
        ...normalized,
        id: normalized.id || stableArticleId(normalized),
      };
    });

    const totalResults = typeof result.totalResults === 'number' ? result.totalResults : undefined;
    const hasMore =
      typeof result.hasMore === 'boolean'
        ? result.hasMore
        : totalResults != null
          ? page * pageSize < totalResults
          : articles.length === pageSize;

    res.json({
      articles,
      page,
      pageSize,
      totalResults,
      hasMore,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/news/:id
 * Returns a single article.
 *
 * Notes:
 * - This backend keeps a short-lived in-memory cache per process for detail lookup.
 * - For production, a more robust cache/store should be used.
 */
router.get('/:id', (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) throw new HttpError(400, 'ValidationError', 'id is required');

    const provider = createNewsProvider();
    const article = provider.getFromCache(id);

    if (!article) {
      throw new HttpError(404, 'NotFound', 'Article not found (may have expired from cache).');
    }

    res.json({ article });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
