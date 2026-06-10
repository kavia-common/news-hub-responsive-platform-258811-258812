'use strict';

const path = require('path');

const { getEnv } = require('../utils/env.js');

// Import the shared DB helper from the sibling workspace container.
// This is intentionally a relative path to the repository layout.
const { initDatabase } = require('../../../news-hub-responsive-platform-258811-258813/news_database/index.js');

let _db = null;

function mapFavoriteRowToArticle(row) {
  if (!row) return null;
  return {
    id: row.article_id,
    url: row.url,
    title: row.title,
    description: row.description,
    content: row.content,
    author: row.author,
    source: row.source_name ? { name: row.source_name } : undefined,
    publishedAt: row.published_at,
    urlToImage: row.image_url,
    // passthrough optional tracking fields
    category: row.category,
    country: row.country,
    createdAt: row.created_at,
  };
}

/**
 * PUBLIC_INTERFACE
 * Get (and lazily initialize) a SQLite connection for this backend container.
 * @returns {import('better-sqlite3').Database}
 */
function getDb() {
  if (_db) return _db;

  // Prefer explicit env var; otherwise default to backend-local file under ./data.
  // Note: the shared module also has its own default, but we want backend container
  // to be self-contained by default.
  const dbPath =
    getEnv('NEWS_DB_PATH', '') ||
    path.join(__dirname, '..', '..', 'data', 'news_hub.sqlite3');

  _db = initDatabase({ dbPath, readonly: false });
  return _db;
}

/**
 * PUBLIC_INTERFACE
 * Favorites store operations.
 */
function favoritesStore() {
  const db = getDb();

  const listStmt = db.prepare(
    `SELECT
      article_id, url, title, description, content, author, source_name,
      published_at, image_url, category, country, created_at
     FROM favorites
     ORDER BY datetime(created_at) DESC`
  );

  const getByIdStmt = db.prepare(
    `SELECT
      article_id, url, title, description, content, author, source_name,
      published_at, image_url, category, country, created_at
     FROM favorites
     WHERE article_id = ?`
  );

  const upsertStmt = db.prepare(
    `INSERT INTO favorites(
      article_id, url, title, description, content, author, source_name,
      published_at, image_url, category, country
    )
    VALUES(
      @article_id, @url, @title, @description, @content, @author, @source_name,
      @published_at, @image_url, @category, @country
    )
    ON CONFLICT(article_id) DO UPDATE SET
      url=excluded.url,
      title=excluded.title,
      description=excluded.description,
      content=excluded.content,
      author=excluded.author,
      source_name=excluded.source_name,
      published_at=excluded.published_at,
      image_url=excluded.image_url,
      category=excluded.category,
      country=excluded.country`
  );

  const deleteStmt = db.prepare(`DELETE FROM favorites WHERE article_id = ?`);

  return {
    list: () => listStmt.all().map(mapFavoriteRowToArticle),
    getById: (id) => mapFavoriteRowToArticle(getByIdStmt.get(id)),
    upsert: (article) => {
      upsertStmt.run(article);
      return mapFavoriteRowToArticle(getByIdStmt.get(article.article_id));
    },
    delete: (id) => {
      const info = deleteStmt.run(id);
      return info.changes > 0;
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * Settings store operations (key/value).
 */
function settingsStore() {
  const db = getDb();

  const getStmt = db.prepare(`SELECT key, value FROM settings WHERE key = ?`);
  const upsertStmt = db.prepare(
    `INSERT INTO settings(key, value, updated_at)
     VALUES(?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       value=excluded.value,
       updated_at=datetime('now')`
  );

  return {
    get: (key) => {
      const row = getStmt.get(key);
      return row ? row.value : null;
    },
    set: (key, value) => {
      upsertStmt.run(key, value);
      return value;
    },
  };
}

module.exports = {
  getDb,
  favoritesStore,
  settingsStore,
};
