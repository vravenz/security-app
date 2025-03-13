// controllers/roasterController.ts
import { Request, Response } from 'express';
import pool from '../../config/database';
import {
  Roaster,
  insertRoaster,
  insertRoasterEmployees,
  RoasterEmployee,
  insertMultipleShiftsForEmployees,
  RoasterShift,
  fetchAllRoasters,
  fetchRoasterById,
  updateRoasterInDB,
  deleteRoasterEmployees,
  deleteShiftsForEmployees,
} from '../../models/roaster/roaster';

export const addRoaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const roasterData: Roaster = req.body;
    const roasterEmployees: RoasterEmployee[] = req.body.selectedEmployees || [];
    const selectedShifts: RoasterShift[] = req.body.selectedShifts || [];

    const newRoaster = await insertRoaster(roasterData);

    const insertedEmployees = await insertRoasterEmployees(
      newRoaster.roaster_id!,
      roasterEmployees
    );

    if (selectedShifts.length > 0 && insertedEmployees.length > 0) {
      const shiftsToInsert: RoasterShift[] = [];
      insertedEmployees.forEach((emp) => {
        selectedShifts.forEach((shift) => {
          shiftsToInsert.push({
            roaster_employee_id: emp.roaster_employee_id,
            shift_date: shift.shift_date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_time: shift.break_time ?? null,
          });
        });
      });
      await insertMultipleShiftsForEmployees(shiftsToInsert);
    }

    res.status(201).json({
      roaster: newRoaster,
      roasterEmployees: insertedEmployees,
      insertedShifts: selectedShifts,
    });
  } catch (error) {
    console.error('Error adding new roaster:', error);
    res.status(500).send('Server error while adding roaster');
  }
};

export const getAllRoasters = async (req: Request, res: Response): Promise<void> => {
  try {
    const roastersList = await fetchAllRoasters();
    res.json(roastersList);
  } catch (error) {
    console.error('Error fetching roasters in controller:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRoasterById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const roasterId = parseInt(id, 10);
    const roaster = await fetchRoasterById(roasterId);
    if (!roaster) {
      res.status(404).json({ message: 'Roaster not found' });
      return;
    }
    res.json(roaster);
  } catch (error) {
    console.error('Error fetching roaster by ID:', error);
    res.status(500).json({ message: 'Server error while fetching roaster' });
  }
};

export const updateRoaster = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const roasterId = parseInt(id, 10);
  if (isNaN(roasterId)) {
    res.status(400).json({ message: 'Invalid roaster ID' });
    return;
  }

  const updateData: Partial<Roaster> = req.body;
  const roasterEmployees: RoasterEmployee[] = req.body.selectedEmployees || [];
  const selectedShifts: RoasterShift[] = req.body.selectedShifts || [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedRoaster = await updateRoasterInDB(roasterId, updateData);

    // Delete existing employees (and their shifts if cascading is not enabled)
    await deleteRoasterEmployees(roasterId);

    let insertedEmployees: RoasterEmployee[] = [];
    if (roasterEmployees.length > 0) {
      insertedEmployees = await insertRoasterEmployees(roasterId, roasterEmployees);
    }

    if (selectedShifts.length > 0 && insertedEmployees.length > 0) {
      const shiftsToInsert: RoasterShift[] = [];
      insertedEmployees.forEach((emp) => {
        selectedShifts.forEach((shift) => {
          shiftsToInsert.push({
            roaster_employee_id: emp.roaster_employee_id,
            shift_date: shift.shift_date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_time: shift.break_time ?? null,
          });
        });
      });
      await insertMultipleShiftsForEmployees(shiftsToInsert);
    }

    await client.query('COMMIT');
    res.json(updatedRoaster);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating roaster:', error);
    res.status(500).json({ message: 'Server error while updating roaster' });
  } finally {
    client.release();
  }
};
