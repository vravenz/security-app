// File: controllers/rosterController.ts

import { Request, Response } from 'express';
import pool from '../../config/database';

// Models
import {
  Roster,
  insertRoster,
  getRosterById,
  getAllRosters,
  updateRoster,
  deleteRoster
} from '../../models/roster/roster';
import {
  RosterEmployee,
  insertRosterEmployees,
  deleteRosterEmployeesByRosterId,
  getRosterEmployeeById,
  getRosterEmployeesByRosterId
} from '../../models/roster/rosterEmployees';
import {
  RosterShift,
  insertRosterShifts,
  deleteRosterShiftsByRosterId,
  getRosterShiftById,
  getRosterShiftsByRosterId,
  updateRosterShift
} from '../../models/roster/rosterShifts';
import {
  RosterShiftAssignment,
  insertRosterShiftAssignments,
  deleteAssignmentsByRosterId,
  getAssignmentsByShiftId,
  removeRosterShiftAssignment,
  getAssignmentsByRosterId
} from '../../models/roster/rosterShiftAssignments';

import { insertRosterShiftHistory } from '../../models/roster/rosterShiftHistory';

export const createRoster = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const {
      company_id,
      site_id,
      po_number,
      employees = [],
      shifts = [],
      assignments = []  // might be empty
    } = req.body;

    await client.query('BEGIN');

    // 1) Insert the main Roster record
    const newRoster: Roster = await insertRoster({ 
      company_id, 
      site_id, 
      po_number 
    });

    // 2) Insert Roster Employees
    let insertedEmployees: RosterEmployee[] = [];
    if (employees.length > 0) {
      employees.forEach((emp: RosterEmployee) => {
        emp.company_id = company_id;
        emp.roster_id = newRoster.roster_id!;
      });
      insertedEmployees = await insertRosterEmployees(employees);
    }

    // 3) Insert Roster Shifts
    let insertedShifts: RosterShift[] = [];
    if (shifts.length > 0) {
      shifts.forEach((shift: RosterShift) => {
        shift.company_id = company_id;
        shift.roster_id = newRoster.roster_id!;
      });
      insertedShifts = await insertRosterShifts(shifts);
    }

    // 4) Process Assignments
    // If the client sent assignment mappings, use them...
    if (assignments.length > 0) {
      const assignmentRecords: RosterShiftAssignment[] = [];
      for (const a of assignments) {
        const shiftIndex = a.shiftIndex;
        const employeeIndex = a.employeeIndex;

        if (shiftIndex == null || employeeIndex == null) continue;
        if (!insertedShifts[shiftIndex] || !insertedEmployees[employeeIndex]) continue;

        assignmentRecords.push({
          company_id: a.company_id,
          roster_shift_id: insertedShifts[shiftIndex].roster_shift_id!,
          roster_employee_id: insertedEmployees[employeeIndex].roster_employee_id!,
          assignment_start_time: a.assignment_start_time ?? null,
          assignment_end_time: a.assignment_end_time ?? null,
          actual_worked_hours: a.actual_worked_hours ?? null,
          assignment_status: a.assignment_status ?? 'active',
          employee_shift_status: a.employee_shift_status ?? 'unconfirmed'
        });
      }
      if (assignmentRecords.length > 0) {
        await insertRosterShiftAssignments(assignmentRecords);
      }
    }
    // Otherwise, auto-generate assignments:
    else if (insertedShifts.length > 0 && insertedEmployees.length > 0) {
      const autoAssignments: RosterShiftAssignment[] = [];
      // Use round-robin assignment: each shift gets an employee (cycling through employees)
      insertedShifts.forEach((shift, index) => {
        const employee = insertedEmployees[index % insertedEmployees.length];
        autoAssignments.push({
          company_id,
          roster_shift_id: shift.roster_shift_id!,
          roster_employee_id: employee.roster_employee_id!,
          assignment_start_time: null,
          assignment_end_time: null,
          actual_worked_hours: null,
          assignment_status: 'active',
          employee_shift_status: 'unconfirmed'
        });
      });
      if (autoAssignments.length > 0) {
        await insertRosterShiftAssignments(autoAssignments);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Roster created successfully',
      roster: newRoster,
      employees: insertedEmployees,
      shifts: insertedShifts
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating roster:', error);
    res.status(500).json({ message: 'Server error while creating roster' });
  } finally {
    client.release();
  }
};

/**
 * Get all rosters
 */

export const getRosters = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch basic roster records with client_name and site_name now included.
    const rosters = await getAllRosters();

    // For each roster, fetch related employees, shifts, and assignments
    const completeRosters = await Promise.all(
      rosters.map(async (roster) => {
        const employees = await getRosterEmployeesByRosterId(roster.roster_id!);
        const shifts = await getRosterShiftsByRosterId(roster.roster_id!);
        const assignments = await getAssignmentsByRosterId(roster.roster_id!);
        return { ...roster, employees, shifts, assignments };
      })
    );

    res.json(completeRosters);
  } catch (error) {
    console.error('Error fetching rosters:', error);
    res.status(500).json({ message: 'Server error while fetching rosters' });
  }
};

/**
 * Get one roster by ID, optionally you can fetch employees/shifts/assignments
 */
export const getRosterDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const roster_id = parseInt(req.params.id, 10);
    if (isNaN(roster_id)) {
      res.status(400).json({ message: 'Invalid roster ID' });
      return;
    }

    const roster = await getRosterById(roster_id);
    if (!roster) {
      res.status(404).json({ message: 'Roster not found' });
      return;
    }

    // If you want, you can also fetch employees, shifts, and assignments:
    // const employees = await getRosterEmployeesByRosterId(roster_id);
    // const shifts = await getRosterShiftsByRosterId(roster_id);
    // const assignments = await getAssignmentsByRosterId(roster_id);

    res.json({
      roster
      // employees,
      // shifts,
      // assignments
    });
  } catch (error) {
    console.error('Error fetching roster details:', error);
    res.status(500).json({ message: 'Server error while fetching roster details' });
  }
};

/**
 * Update roster details (and optionally replace employees/shifts/assignments).
 * This example does a "destructive" replace: it deletes old employees/shifts/assignments,
 * then re-inserts the new ones from the request body.
 */
export const updateRosterDetails = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const roster_id = parseInt(req.params.id, 10);
    if (isNaN(roster_id)) {
      res.status(400).json({ message: 'Invalid roster ID' });
      return;
    }    

    const {
      company_id,
      site_id,
      po_number,
      employees = [],
      shifts = [],
      assignments = []
    } = req.body;

    await client.query('BEGIN');

    // 1) Update the main Roster record
    const updatedRoster = await updateRoster(roster_id, { company_id, site_id, po_number });

    // 2) Delete existing employees (which can cascade to assignments if foreign keys are set up with ON DELETE CASCADE).
    //    Otherwise, we must also manually delete assignments, then shifts, etc.
    await deleteAssignmentsByRosterId(roster_id);
    await deleteRosterShiftsByRosterId(roster_id);
    await deleteRosterEmployeesByRosterId(roster_id);

    // 3) Re-insert employees
    let insertedEmployees: RosterEmployee[] = [];
    if (employees.length > 0) {
      employees.forEach((emp: RosterEmployee) => {
        emp.company_id = updatedRoster.company_id;
        emp.roster_id = updatedRoster.roster_id!;
      });
      insertedEmployees = await insertRosterEmployees(employees);
    }

    // 4) Re-insert shifts
    let insertedShifts: RosterShift[] = [];
    if (shifts.length > 0) {
      shifts.forEach((shift: RosterShift) => {
        shift.company_id = updatedRoster.company_id;
        shift.roster_id = updatedRoster.roster_id!;
      });
      insertedShifts = await insertRosterShifts(shifts);
    }

    // 5) Re-insert assignments
    if (assignments.length > 0) {
      const assignmentRecords: RosterShiftAssignment[] = [];
      for (const a of assignments) {
        const shiftIndex = a.shiftIndex;
        const employeeIndex = a.employeeIndex;
        if (shiftIndex == null || employeeIndex == null) continue;
        if (!insertedShifts[shiftIndex] || !insertedEmployees[employeeIndex]) continue;

        assignmentRecords.push({
          company_id: updatedRoster.company_id,
          roster_shift_id: insertedShifts[shiftIndex].roster_shift_id!,
          roster_employee_id: insertedEmployees[employeeIndex].roster_employee_id!,
          assignment_start_time: a.assignment_start_time ?? null,
          assignment_end_time: a.assignment_end_time ?? null,
          actual_worked_hours: a.actual_worked_hours ?? null,
          assignment_status: a.assignment_status ?? 'active',
          employee_shift_status: a.employee_shift_status ?? 'unconfirmed'
        });
      }
      if (assignmentRecords.length > 0) {
        await insertRosterShiftAssignments(assignmentRecords);
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Roster updated successfully',
      roster: updatedRoster
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating roster:', error);
    res.status(500).json({ message: 'Server error while updating roster' });
  } finally {
    client.release();
  }
};

/**
 * Delete a roster by ID
 */
export const removeRoster = async (req: Request, res: Response): Promise<void> => {
  try {
    const roster_id = parseInt(req.params.id, 10);
    if (isNaN(roster_id)) {
      res.status(400).json({ message: 'Invalid roster ID' });
      return;
    }    

    await deleteRoster(roster_id);
    res.json({ message: 'Roster deleted successfully' });
  } catch (error) {
    console.error('Error deleting roster:', error);
    res.status(500).json({ message: 'Server error while deleting roster' });
  }
};

// Get Shifts Single by ID

export const getRosterShiftDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const shift_id = parseInt(req.params.id, 10);
    if (isNaN(shift_id)) {
      res.status(400).json({ message: 'Invalid shift ID' });
      return;
    }

    const shift = await getRosterShiftById(shift_id);
    if (!shift) {
      res.status(404).json({ message: 'Shift not found' });
      return;
    }

    // Return the shift data
    res.json(shift);
  } catch (error) {
    console.error('Error fetching shift details:', error);
    res.status(500).json({ message: 'Server error while fetching shift details' });
  }
};

export const getShiftAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const shift_id = parseInt(req.params.id, 10);
    if (isNaN(shift_id)) {
      res.status(400).json({ message: 'Invalid shift ID' });
      return;
    }
    const assignments = await getAssignmentsByShiftId(shift_id);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching shift assignments:', error);
    res.status(500).json({ message: 'Server error while fetching shift assignments' });
  }
};

/**
 * Get a single roster employee by its ID.
 * This endpoint returns the detailed employee record (joined with applicants).
 */
export const getRosterEmployeeDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const roster_employee_id = parseInt(req.params.id, 10);
    if (isNaN(roster_employee_id)) {
      res.status(400).json({ message: 'Invalid roster employee ID' });
      return;
    }
    const employee = await getRosterEmployeeById(roster_employee_id);
    if (!employee) {
      res.status(404).json({ message: 'Roster employee not found' });
      return;
    }
    res.json(employee);
  } catch (error) {
    console.error('Error fetching roster employee details:', error);
    res.status(500).json({ message: 'Server error while fetching roster employee details' });
  }
};

/**
 * Update a roster shift assignment.
 * This function takes the assignment ID from the request parameters
 * and updates the assignment record based on the request body.
 */
export const updateRosterShiftAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const roster_shift_assignment_id = parseInt(req.params.id, 10);
    if (isNaN(roster_shift_assignment_id)) {
      res.status(400).json({ message: 'Invalid roster shift assignment ID' });
      return;
    }
    // Import and call the model function from models/rosterShiftAssignments.ts
    const updatedAssignment = await (
      await import('../../models/roster/rosterShiftAssignments')
    ).updateRosterShiftAssignment(roster_shift_assignment_id, req.body);
    res.json(updatedAssignment);
  } catch (error) {
    console.error('Error updating roster shift assignment:', error);
    res.status(500).json({ message: 'Server error while updating roster shift assignment' });
  }
};


// -----------------------------------------------------------------------------
// Update Roster Shift Details (excluding shift date, start/end times, break time)
// and then insert a history record.
export const updateRosterShiftDetails = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const shift_id = parseInt(req.params.id, 10);
    if (isNaN(shift_id)) {
      res.status(400).json({ message: 'Invalid shift ID' });
      return;
    }

    // Fetch the current shift details
    const currentShift = await getRosterShiftById(shift_id);
    if (!currentShift) {
      res.status(404).json({ message: 'Shift not found' });
      return;
    }

    // Update the shift record (this update does NOT change shift_date, start/end times, or break_time)
    const updatedShift = await updateRosterShift(shift_id, req.body);

    // Prepare history record data
    const historyData = {
      company_id: currentShift.company_id,
      roster_shift_id: shift_id,
      shift_status: updatedShift.shift_status,
      penalty: updatedShift.penalty,
      comments: updatedShift.comments,
      shift_instruction: updatedShift.shift_instruction,
      payable_rate_type: updatedShift.payable_rate_type,
      payable_role: updatedShift.payable_role,
      payable_amount: updatedShift.payable_amount,
      billable_role: updatedShift.billable_role,
      billable_amount: updatedShift.billable_amount,
      payable_expenses: updatedShift.payable_expenses,
      billable_expenses: updatedShift.billable_expenses,
      unpaid_shift: updatedShift.unpaid_shift,
      training_shift: updatedShift.training_shift,
      updated_by: (req as any).userId  // Must be a valid user ID present in the "users" table
    };

    // If userId is missing, rollback and respond with an error.
    if (!historyData.updated_by) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Missing userId. A valid userId is required to update shift.' });
      return;
    }

    // Insert a history record capturing the updated shift details.
    await insertRosterShiftHistory(historyData);

    // Send the updated shift details as JSON
    res.json(updatedShift);
  } catch (error) {
    console.error('Error updating roster shift:', error);
    res.status(500).json({ message: 'Server error while updating roster shift' });
  } finally {
    client.release();
  }
};

// -----------------------------------------------------------------------------
// Remove a roster shift assignment by first logging its removal
export const removeRosterShiftAssignmentController = async (req: Request, res: Response): Promise<void> => {
  try {
    const roster_shift_assignment_id = parseInt(req.params.id, 10);
    if (isNaN(roster_shift_assignment_id)) {
      res.status(400).json({ message: 'Invalid roster shift assignment ID' });
      return;
    }
    const { removal_reason, company_id } = req.body;
    // If company_id is not provided, try to resolve it from the assignment
    let resolved_company_id = company_id;
    if (!resolved_company_id) {
      const result = await pool.query(
        "SELECT company_id FROM public.roster_shift_assignments WHERE roster_shift_assignment_id = $1",
        [roster_shift_assignment_id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ message: 'Assignment not found' });
        return;
      }
      resolved_company_id = result.rows[0].company_id;
    }
    const removed_by = (req as any).userId;
    if (!removed_by) {
      res.status(400).json({ message: 'Missing user id for removal' });
      return;
    }

    const updatedAssignment = await removeRosterShiftAssignment(
      roster_shift_assignment_id,
      removal_reason,
      resolved_company_id,
      removed_by
    );

    res.json({
      message: 'Shift assignment marked as removed and removal logged successfully',
      assignment: updatedAssignment,
    });
  } catch (error) {
    console.error('Error removing roster shift assignment:', error);
    res.status(500).json({ message: 'Server error while removing roster shift assignment' });
  }
};