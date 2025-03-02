// models/roaster/roaster.ts
import pool from '../../config/database';

export interface Roaster {
  roaster_id?: number;
  company_id: number;
  client_name: string;
  site_name: string;
  duty_type: string;
  payable_rate_type: string;
  payable_role: string;
  payable_amount: number;
  payable_expenses?: number;
  billable_role: string;
  billable_amount: number;
  billable_expenses?: number;
  unpaid_shift?: boolean;
  training_shift?: boolean;
  shift_status: 'confirmed' | 'unconfirmed' | null;
  po_number?: string;
  penalty?: number;
  comments?: string;
  shift_instruction?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Insert a new roaster record into the database.
 */
export const insertRoaster = async (roaster: Roaster): Promise<Roaster> => {
  const {
    company_id,
    client_name,
    site_name,
    duty_type,
    payable_rate_type,
    payable_role,
    payable_amount,
    payable_expenses,
    billable_role,
    billable_amount,
    billable_expenses,
    unpaid_shift,
    training_shift,
    shift_status,
    po_number,
    penalty,
    comments,
    shift_instruction,
  } = roaster;

  try {
    const query = `
      INSERT INTO roaster (
        company_id,
        client_name,
        site_name,
        duty_type,
        payable_rate_type,
        payable_role,
        payable_amount,
        payable_expenses,
        billable_role,
        billable_amount,
        billable_expenses,
        unpaid_shift,
        training_shift,
        shift_status,
        po_number,
        penalty,
        comments,
        shift_instruction
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *;
    `;
    const values = [
      company_id,
      client_name,
      site_name,
      duty_type,
      payable_rate_type,
      payable_role,
      payable_amount,
      payable_expenses ?? null,
      billable_role,
      billable_amount,
      billable_expenses ?? null,
      unpaid_shift ?? false,
      training_shift ?? false,
      shift_status,
      po_number ?? null,
      penalty ?? null,
      comments ?? null,
      shift_instruction ?? null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error inserting new roaster:', error);
    throw error;
  }
}

/**
 * Fetch a single roaster record by its roaster_id.
 */
export const fetchRoasterById = async (roasterId: number): Promise<Roaster | null> => {
  try {
    const query = `
      SELECT
        roaster_id,
        company_id,
        client_name,
        site_name,
        duty_type,
        payable_rate_type,
        payable_role,
        payable_amount,
        payable_expenses,
        billable_role,
        billable_amount,
        billable_expenses,
        unpaid_shift,
        training_shift,
        shift_status,
        po_number,
        penalty,
        comments,
        shift_instruction,
        created_at,
        updated_at
      FROM roaster
      WHERE roaster_id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [roasterId]);
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  } catch (error) {
    console.error('Error fetching roaster by ID:', error);
    throw error;
  }
}

/**
 * Update an existing roaster record by roaster_id.
 */
export const updateRoasterInDB = async (roasterId: number, data: Partial<Roaster>): Promise<Roaster> => {
  // The columns you want to update
  const {
    client_name,
    site_name,
    duty_type,
    payable_rate_type,
    payable_role,
    payable_amount,
    payable_expenses,
    billable_role,
    billable_amount,
    billable_expenses,
    unpaid_shift,
    training_shift,
    shift_status,
    po_number,
    penalty,
    comments,
    shift_instruction,
  } = data;

  try {
    const query = `
      UPDATE roaster
      SET
        client_name = $1,
        site_name = $2,
        duty_type = $3,
        payable_rate_type = $4,
        payable_role = $5,
        payable_amount = $6,
        payable_expenses = $7,
        billable_role = $8,
        billable_amount = $9,
        billable_expenses = $10,
        unpaid_shift = $11,
        training_shift = $12,
        shift_status = $13,
        po_number = $14,
        penalty = $15,
        comments = $16,
        shift_instruction = $17,
        updated_at = CURRENT_TIMESTAMP
      WHERE roaster_id = $18
      RETURNING *;
    `;
    const values = [
      client_name ?? null,
      site_name ?? null,
      duty_type ?? null,
      payable_rate_type ?? null,
      payable_role ?? null,
      payable_amount ?? null,
      payable_expenses ?? null,
      billable_role ?? null,
      billable_amount ?? null,
      billable_expenses ?? null,
      unpaid_shift ?? false,
      training_shift ?? false,
      shift_status,
      po_number ?? null,
      penalty ?? null,
      comments ?? null,
      shift_instruction ?? null,
      roasterId
    ];

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      throw new Error(`No roaster found with ID ${roasterId}`);
    }
    return rows[0];
  } catch (error) {
    console.error('Error updating roaster in DB:', error);
    throw error;
  }
}

// ---------------------
// RoasterEmployee
// ---------------------
export interface RoasterEmployee {
  roaster_employee_id?: number;
  roaster_id?: number;
  applicant_id: number | null;
  staff?: string;
  guard_group?: number | null;
  subcontractor?: number | null;
}

export const insertRoasterEmployees = async (
  roasterId: number,
  roasterEmployees: RoasterEmployee[]
): Promise<RoasterEmployee[]> => {
  if (!roasterEmployees || roasterEmployees.length === 0) {
    return [];
  }

  const insertQuery = `
    INSERT INTO roaster_employees (
      roaster_id,
      applicant_id,
      staff,
      guard_group,
      subcontractor
    )
    VALUES
  `;
  
  const valuesClause: string[] = [];
  const parameters: any[] = [];
  let paramIndex = 1;

  roasterEmployees.forEach((emp) => {
    valuesClause.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    );
    parameters.push(
      roasterId,
      emp.applicant_id,
      emp.staff ?? null,
      emp.guard_group ?? null,
      emp.subcontractor ?? null
    );
  });

  const finalQuery = insertQuery + valuesClause.join(', ') + ' RETURNING *';

  try {
    const result = await pool.query(finalQuery, parameters);
    return result.rows;
  } catch (error) {
    console.error('Error inserting roaster employees:', error);
    throw error;
  }
};

// ---------------------
// RoasterShift
// ---------------------
export interface RoasterShift {
  roaster_employee_id?: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_time?: string | null;
}

export const insertMultipleShiftsForEmployees = async (
  shifts: RoasterShift[]
): Promise<void> => {
  if (!shifts || shifts.length === 0) {
    return;
  }

  const insertQuery = `
    INSERT INTO roaster_shifts (
      roaster_employee_id,
      shift_date,
      start_time,
      end_time,
      break_time
    )
    VALUES
  `;
  
  const valuesClause: string[] = [];
  const parameters: any[] = [];
  let paramIndex = 1;

  for (const shift of shifts) {
    valuesClause.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    );
    parameters.push(
      shift.roaster_employee_id,
      shift.shift_date,
      shift.start_time,
      shift.end_time,
      shift.break_time ?? null
    );
  }

  const finalQuery = insertQuery + valuesClause.join(', ') + ';';

  try {
    await pool.query(finalQuery, parameters);
  } catch (error) {
    console.error('Error inserting roaster shifts:', error);
    throw error;
  }
};

/**
 * Fetch all roasters with joined employees and shifts.
 */
export const fetchAllRoasters = async (): Promise<any[]> => {
  try {
    const query = `
      SELECT
        r.roaster_id,
        r.client_name,
        r.site_name,
        r.shift_status,
        re.roaster_employee_id,
        COALESCE(a.first_name || ' ' || a.last_name, re.staff) AS guard_name,
        a.employee_photo,
        rs.shift_date,
        rs.start_time,
        rs.end_time
      FROM roaster AS r
      JOIN roaster_employees AS re
        ON r.roaster_id = re.roaster_id
      JOIN roaster_shifts AS rs
        ON re.roaster_employee_id = rs.roaster_employee_id
      LEFT JOIN applicants AS a
        ON re.applicant_id = a.applicant_id
      ORDER BY r.roaster_id, re.roaster_employee_id, rs.shift_date, rs.start_time;
    `;
    const { rows } = await pool.query(query);

    const roastersMap = new Map<number, any>();

    for (const row of rows) {
      const {
        roaster_id,
        client_name,
        site_name,
        shift_status,
        roaster_employee_id,
        guard_name,
        employee_photo,
        shift_date,
        start_time,
        end_time,
      } = row;

      if (!roastersMap.has(roaster_id)) {
        roastersMap.set(roaster_id, {
          roaster_id,
          client_name,
          site_name,
          employees: []
        });
      }

      const roasterObj = roastersMap.get(roaster_id);

      let employeeObj = roasterObj.employees.find((e: any) => e.roaster_employee_id === roaster_employee_id);
      if (!employeeObj) {
        employeeObj = {
          roaster_employee_id,
          guard_name,
          shifts: []
        };
        roasterObj.employees.push(employeeObj);
      }

      employeeObj.shifts.push({
        shift_date,
        start_time,
        end_time,
        shift_status,
        employee_photo,
      });
    }

    return Array.from(roastersMap.values());
  } catch (error) {
    console.error('Error fetching roasters in model:', error);
    throw error;
  }
};
