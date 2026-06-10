'use strict';

const express = require('express');
const { z } = require('zod');

const { settingsStore } = require('../db/index.js');
const { validateBody } = require('../middleware/validate.js');

const router = express.Router();

const SettingsUpdateSchema = z.object({
  country: z.string().min(2).max(2).optional(),
  defaultCategory: z.string().min(1).max(40).optional(),
});

/**
 * GET /api/settings
 * Returns the persisted settings.
 */
router.get('/', (req, res, next) => {
  try {
    const store = settingsStore();
    const country = store.get('country') || 'us';
    const defaultCategory = store.get('default_category') || 'general';

    res.json({
      settings: {
        country,
        defaultCategory,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/settings
 * Body: { country?, defaultCategory? }
 * Persists settings and returns the updated values.
 */
router.put('/', validateBody(SettingsUpdateSchema), (req, res, next) => {
  try {
    const store = settingsStore();

    if (typeof req.body.country === 'string') {
      store.set('country', req.body.country.toLowerCase());
    }
    if (typeof req.body.defaultCategory === 'string') {
      store.set('default_category', req.body.defaultCategory);
    }

    const country = store.get('country') || 'us';
    const defaultCategory = store.get('default_category') || 'general';

    res.json({
      settings: {
        country,
        defaultCategory,
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
