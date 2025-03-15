// File: routes/roasterRoutes.ts

import express from 'express';
import {
  createRoster,
  getRosters,
  getRosterDetails,
  updateRosterDetails,
  removeRoster,
  getRosterShiftDetails,
  getShiftAssignments,
  getRosterEmployeeDetails,
  updateRosterShiftAssignment,
  removeRosterShiftAssignmentController,
  updateRosterShiftDetails
} from '../controllers/roster/rosterController';

const router = express.Router();

router.post('/rosters', createRoster);
router.get('/rosters', getRosters);
router.get('/rosters/:id', getRosterDetails);
router.put('/rosters/:id', updateRosterDetails);
router.delete('/rosters/:id', removeRoster);

router.get('/rostershifts/:id', getRosterShiftDetails);
router.get('/rostershiftassignments/shift/:id', getShiftAssignments);
router.put('/rostershiftassignments/:id', updateRosterShiftAssignment);
router.delete('/rostershiftassignments/:id', removeRosterShiftAssignmentController);
router.put('/rostershifts/:id', updateRosterShiftDetails);

// New endpoint to get a single roster employee by ID
router.get('/rosteremployees/:id', getRosterEmployeeDetails);

export default router;
