'use strict';

const { getEnv } = require('../utils/env.js');
const { HttpError } = require('../utils/httpError.js');
const { stableArticleId, normalizeArticle } = require('../utils/newsNormalize.js');

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const _cache = new Map(); // id -> { article, expiresAt }

/**
 * Store articles in a short-lived process cache so /api/news/:id can be served.
 * @param {Array<object>} articles
 */
function cacheArticles(articles) {
  const now = Date.now();
  for (const a of articles) {
    const normalized = normalizeArticle(a);
    const id = normalized.id || stableArticleId(normalized);
    _cache.set(id, { article: { ...normalized, id }, expiresAt: now + CACHE_TTL_MS });
  }
}

/**
 * Drop expired cache entries.
 */
function sweepCache() {
  const now = Date.now();
  for (const [k, v] of _cache.entries()) {
    if (!v || v.expiresAt <= now) _cache.delete(k);
  }
}

function getFromCache(id) {
  sweepCache();
  const item = _cache.get(id);
  return item ? item.article : null;
}

function mockProvider() {
  // Deterministic-ish mock items to keep UI functional without external keys.
  const base = [
    {
      title: 'Welcome to News Hub',
      description: 'Set NEWS_PROVIDER=newsapi and configure NEWSAPI_KEY to fetch real headlines.',
      url: 'https://example.com/news-hub',
      source: { name: 'News Hub' },
      publishedAt: new Date().toISOString(),
      urlToImage: null,
      content:
        'This is mock content. The backend is running correctly, but it is not configured with an upstream news provider.',
    },
    {
      title: 'Favorites and settings are stored locally',
      description: 'Try saving this article to favorites and updating settings.',
      url: 'https://example.com/local-storage',
      source: { name: 'News Hub' },
      publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      urlToImage: null,
      content:
        'Favorites and settings use SQLite via better-sqlite3. This works even when news is mocked.',
    },
  ];

  return {
    list: async ({ category, q, page, pageSize, country }) => {
      const tag = q ? `Search "${q}"` : `Category "${category || 'general'}"`;
      const items = base.map((a, idx) => ({
        ...a,
        title: `${a.title} — ${tag} (${country})`,
        url: `${a.url}?p=${page}&i=${idx}`,
      }));

      // Fake pagination: only first page has items.
      const paged = page === 1 ? items.slice(0, pageSize) : [];
      cacheArticles(paged);

      return {
        articles: paged,
        totalResults: items.length,
        hasMore: page === 1 && items.length > pageSize,
      };
    },
    getFromCache,
  };
}

async function newsApiProvider() {
  const apiKey = getEnv('NEWSAPI_KEY', '');
  if (!apiKey) {
    throw new HttpError(
      500,
      'ConfigError',
      'NEWS_PROVIDER=newsapi but NEWSAPI_KEY is not set'
    );
  }

  const fetchTimeoutMs = Number(getEnv('NEWS_FETCH_TIMEOUT_MS', '12000')) || 12000;

  // Use Node 18+ global fetch (undici). If runtime is older, this would fail; CI should catch.
  async function fetchJson(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), fetchTimeoutMs);

    try {
      const res = await fetch(url, {
        headers: { 'X-Api-Key': apiKey },
        signal: ctrl.signal,
      });
      const text = await res.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }

      if (!res.ok) {
        throw new HttpError(
          502,
          'UpstreamError',
          `Upstream NewsAPI error (${res.status})`,
          { upstream: payload }
        );
      }
      return payload;
    } catch (e) {
      if (e?.name === 'AbortError') {
        throw new HttpError(504, 'Timeout', 'Upstream request timed out');
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  return {
    list: async ({ category, q, page, pageSize, country }) => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      if (country) params.set('country', country);
      if (category) params.set('category', category);

      let endpoint = 'https://newsapi.org/v2/top-headlines';
      if (q) {
        // NewsAPI supports q on top-headlines as well; keep same endpoint.
        params.set('q', q);
      }

      const url = `${endpoint}?${params.toString()}`;
      const payload = await fetchJson(url);

      const articles = Array.isArray(payload.articles) ? payload.articles : [];
      cacheArticles(articles);

      return {
        articles,
        totalResults: typeof payload.totalResults === 'number' ? payload.totalResults : undefined,
      };
    },
    getFromCache,
  };
}

/**
 * PUBLIC_INTERFACE
 * Create a provider based on env.
 * @returns {{list: function({category?:string,q?:string,page:number,pageSize:number,country?:string}): Promise<{articles:any[], totalResults?:number, hasMore?:boolean}>, getFromCache: function(string): any}}
 */
function createNewsProvider() {
  const provider = getEnv('NEWS_PROVIDER', 'mock').toLowerCase();
  if (provider === 'mock') return mockProvider();
  if (provider === 'newsapi') {
    // Note: async init. We'll throw synchronously if called incorrectly.
    // To keep router code simple, we wrap with a sync facade using cached promise.
    if (!createNewsProvider._newsapiPromise) {
      createNewsProvider._newsapiPromise = newsApiProvider();
    }

    return {
      list: async (args) => {
        const p = await createNewsProvider._newsapiPromise;
        return p.list(args);
      },
      getFromCache,
    };
  }

  throw new HttpError(500, 'ConfigError', `Unsupported NEWS_PROVIDER: ${provider}`);
}
createNewsProvider._newsapiPromise = null;

module.exports = { createNewsProvider };
