'use strict';

const express = require('express');

const newsRouter = require('./news.js');
const favoritesRouter = require('./favorites.js');
const settingsRouter = require('./settings.js');

/**
 * PUBLIC_INTERFACE
 * Create the /api router.
 * @returns {import('express').Router}
 */
function createApiRouter() {
  const router = express.Router();

  router.use('/news', newsRouter);
  router.use('/favorites', favoritesRouter);
  router.use('/settings', settingsRouter);

  return router;
}

module.exports = { createApiRouter };
