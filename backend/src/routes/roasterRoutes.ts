// routes/roasterRoutes.ts
import express from 'express';
import {
  addRoaster,
  getAllRoasters,
  getRoasterById,
  updateRoaster
} from '../controllers/roaster/roasterController';

const router = express.Router();

/**
 * POST /api/roasters
 * Inserts a new roaster record
 */
router.post('/roasters', addRoaster);

/**
 * GET /api/all
 * Fetches all roasters with joined employees and shifts
 */
router.get('/all', getAllRoasters);

/**
 * GET /api/roasters/:id
 * Fetch a single roaster by ID
 */
router.get('/roasters/:id', getRoasterById);

/**
 * PUT /api/roasters/:id
 * Update an existing roaster by ID
 */
router.put('/roasters/:id', updateRoaster);

export default router;
