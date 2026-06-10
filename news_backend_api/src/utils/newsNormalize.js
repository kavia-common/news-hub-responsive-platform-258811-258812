'use strict';

const crypto = require('crypto');

/**
 * PUBLIC_INTERFACE
 * Compute a stable article id from URL (preferred) or title+publishedAt.
 * @param {object} article
 * @returns {string}
 */
function stableArticleId(article) {
  const basis = article?.url || `${article?.title || 'article'}:${article?.publishedAt || ''}`;
  return crypto.createHash('sha1').update(String(basis)).digest('hex');
}

/**
 * PUBLIC_INTERFACE
 * Normalize an upstream article into the frontend-friendly shape.
 * This mirrors common NewsAPI fields and preserves unknown fields.
 * @param {object} raw
 * @returns {object}
 */
function normalizeArticle(raw) {
  if (!raw || typeof raw !== 'object') return {};

  // Support both {source:{name}} and source_name forms.
  const source =
    raw.source && typeof raw.source === 'object'
      ? raw.source
      : raw.source_name
        ? { name: raw.source_name }
        : raw.source
          ? { name: String(raw.source) }
          : undefined;

  const publishedAt = raw.publishedAt || raw.published_at || null;

  return {
    ...raw,
    source,
    publishedAt,
    urlToImage: raw.urlToImage || raw.image_url || raw.imageUrl || null,
    imageUrl: raw.imageUrl || raw.image_url || raw.urlToImage || null,
  };
}

module.exports = {
  stableArticleId,
  normalizeArticle,
};
