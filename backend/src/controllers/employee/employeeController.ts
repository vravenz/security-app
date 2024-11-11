import { Request, Response } from 'express';
import * as EmployeeModel from '../../models/employees/employeeModel';

export const fetchEmployees = async (req: Request, res: Response): Promise<void> => {
    const companyId = parseInt(req.params.companyId);
    if (isNaN(companyId)) {
        res.status(400).json({ error: "Invalid company ID" });
        return;
    }

    try {
        const employees = await EmployeeModel.getEmployeesWithDetails(companyId);
        res.json(employees);
    } catch (error: any) {
        console.error("Failed to fetch employees:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const fetchEmployeeDetail = async (req: Request, res: Response): Promise<void> => {
    const applicantId = parseInt(req.params.applicantId);
    if (isNaN(applicantId)) {
        res.status(400).json({ error: "Invalid applicant ID" });
        return;
    }

    try {
        const employeeDetail = await EmployeeModel.getEmployeeDetail(applicantId);
        res.json(employeeDetail);
    } catch (error: any) {
        console.error("Failed to fetch employee detail:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const updateEmployeeDetail = async (req: Request, res: Response): Promise<void> => {
    const applicantId = parseInt(req.params.applicantId);
    const employeeData = req.body;

    if (isNaN(applicantId)) {
        res.status(400).json({ error: "Invalid applicant ID" });
        return;
    }

    try {
        const updatedData = await EmployeeModel.updateEmployeeDetail(applicantId, employeeData);
        res.json({ message: "Employee updated successfully", data: updatedData });
    } catch (error: any) {
        console.error("Failed to update employee detail:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};