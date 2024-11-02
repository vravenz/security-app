// src/controllers/auth/loginController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmailOrPin } from '../../models/user/userModel';
import { generateToken } from '../../utils/jwtUtils';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body; // Renamed email to identifier

    // Basic validations
    if (!identifier || !password) {
      res.status(400).json({ error: "Email/PIN and password are required" });
      return;
    }

    const user = await findUserByEmailOrPin(identifier); // Use identifier to find user by email or pin
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Ensure required fields are defined
    if (user.id === undefined || user.role === undefined || user.company_id === undefined) {
      res.status(500).json({ error: "User data is incomplete" });
      return;
    }

    // Generate token
    const token = generateToken({ id: user.id, role: user.role, company_id: user.company_id });
    res.json({
      user: { 
        id: user.id, 
        email: user.email, 
        user_pin: user.user_pin, // Added user_pin to response
        role: user.role, 
        company_id: user.company_id 
      },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
