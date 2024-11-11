// src/controllers/auth/registerController.ts
import { Request, Response } from 'express';
import { createCompany } from '../../models/company/companyCreate';
import { createUser } from '../../models/user/userModel';
import { hashPassword } from '../../utils/hashUtils';

const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, company } = req.body;

    if (typeof password !== 'string' || password.trim() === '') {
      res.status(400).json({ error: "Password must be a valid string" });
      return;
    }

    if (!company || !company.firstName || !company.lastName || !company.companyName) {
      res.status(400).json({ error: "Company information is incomplete." });
      return;
    }

    const newCompany = await createCompany(company.firstName, company.lastName, company.companyName);
    if (!newCompany) {
      res.status(409).json({ error: "Company name already exists." });
      return;
    }

    const hashedPassword = await hashPassword(password);
    // Pass true for isMainUser since this is the main user registration
    const newUser = await createUser(email, hashedPassword, newCompany.company_id!, "Super Admin", true);

    delete newUser.password; // Ensure password is not sent back in response
    res.status(201).json({
      ...newUser,
      message: "User registered successfully. Use your email or the provided PIN to log in.",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export default register;
