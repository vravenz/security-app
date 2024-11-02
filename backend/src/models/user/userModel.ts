// src/models/user/userModel.ts
import pool from '../../config/database';

interface User {
  id?: number;
  first_name?: string;
  last_name?: string;
  email: string;
  password?: string;
  role?: string;
  company_id: number;
  user_pin?: string;
}

// Generate a unique 5-digit user PIN
const generateUserPin = async (): Promise<string> => {
  let pin: string;
  let exists = true;
  do {
    pin = Math.floor(10000 + Math.random() * 90000).toString(); // Generate a random 5-digit number
    const result = await pool.query('SELECT 1 FROM users WHERE user_pin = $1', [pin]);
    exists = result.rows.length > 0;
  } while (exists); // Repeat until we have a unique pin
  return pin;
};

export const createUser = async (
  email: string,
  password: string,
  companyId: number,
  roleName: string
): Promise<User> => {
  const roleQuery = await pool.query('SELECT role_id FROM roles WHERE role_name = $1', [roleName]);
  const roleId = roleQuery.rows.length > 0 ? roleQuery.rows[0].role_id : null;

  if (!roleId) {
    throw new Error(`Role '${roleName}' not found in roles table`);
  }

  const userPin = await generateUserPin();

  const result = await pool.query(
    'INSERT INTO users (email, password, role_id, company_id, user_pin) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [email, password, roleId, companyId, userPin]
  );
  
  return result.rows[0];
};

export const findUserByEmailOrPin = async (identifier: string): Promise<User | null> => {
  const query = `
    SELECT users.id, users.email, users.password, roles.role_name as role, users.company_id, users.user_pin
    FROM users
    JOIN roles ON users.role_id = roles.role_id
    WHERE users.email = $1 OR users.user_pin::text = $1;
  `;
  const result = await pool.query(query, [identifier]);
  return result.rows.length > 0 ? result.rows[0] : null;
};
