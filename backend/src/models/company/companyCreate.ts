// src/models/company/companyCreate.ts
import pool from '../../config/database';

interface Company {
  company_id?: number;
  first_name: string;
  last_name: string;
  company_name: string;
}

export const createCompany = async (
  firstName: string,
  lastName: string,
  companyName: string
): Promise<Company | null> => {
  // Check if the company already exists
  const check = await pool.query(
    'SELECT 1 FROM companies WHERE company_name = $1',
    [companyName]
  );

  if ((check.rowCount ?? 0) > 0) return null;

  // Insert a new company if it does not exist
  const result = await pool.query(
    'INSERT INTO companies (first_name, last_name, company_name) VALUES ($1, $2, $3) RETURNING *',
    [firstName, lastName, companyName]
  );

  if ((result.rowCount ?? 0) === 0) throw new Error("Failed to create the company");

  return result.rows[0];
};
