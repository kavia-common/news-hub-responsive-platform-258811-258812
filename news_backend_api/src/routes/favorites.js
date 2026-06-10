'use strict';

const express = require('express');
const { z } = require('zod');

const { favoritesStore } = require('../db/index.js');
const { HttpError } = require('../utils/httpError.js');
const { validateBody } = require('../middleware/validate.js');

const router = express.Router();

const ArticleSchema = z
  .object({
    id: z.string().min(1),
    url: z.string().url().optional(),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
    author: z.string().optional().nullable(),
    source: z
      .union([z.object({ name: z.string().optional().nullable() }).passthrough(), z.string()])
      .optional()
      .nullable(),
    publishedAt: z.string().optional().nullable(),
    urlToImage: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
  })
  .passthrough();

const AddFavoriteSchema = z.object({
  article: ArticleSchema,
});

/**
 * GET /api/favorites
 * Returns saved favorite articles.
 */
router.get('/', (req, res, next) => {
  try {
    const store = favoritesStore();
    const favorites = store.list();
    res.json({ favorites });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/favorites
 * Body: { article: Article }
 * Upserts a favorite.
 */
router.post('/', validateBody(AddFavoriteSchema), (req, res, next) => {
  try {
    const store = favoritesStore();
    const article = req.body.article;

    // Normalize fields for DB schema.
    const articleId = article.id;
    const url = article.url;

    if (!url) {
      throw new HttpError(400, 'ValidationError', 'article.url is required');
    }

    const sourceName =
      typeof article.source === 'string'
        ? article.source
        : article.source && typeof article.source === 'object'
          ? article.source.name
          : null;

    const record = {
      article_id: articleId,
      url,
      title: article.title ?? null,
      description: article.description ?? null,
      content: article.content ?? null,
      author: article.author ?? null,
      source_name: sourceName ?? null,
      published_at: article.publishedAt ?? null,
      image_url: (article.urlToImage ?? article.imageUrl) ?? null,
      category: article.category ?? null,
      country: article.country ?? null,
    };

    const favorite = store.upsert(record);
    res.status(201).json({ favorite });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/favorites/:id
 * Deletes a favorite by article id.
 */
router.delete('/:id', (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) throw new HttpError(400, 'ValidationError', 'id is required');

    const store = favoritesStore();
    const removed = store.delete(id);

    if (!removed) {
      // Idempotent delete: return ok even if it didn't exist.
      return res.json({ ok: true });
    }

    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
