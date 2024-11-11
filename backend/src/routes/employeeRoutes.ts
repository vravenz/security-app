import express from 'express';
import {fetchEmployees, fetchEmployeeDetail, updateEmployeeDetail} from '../controllers/employee/employeeController';

const router = express.Router();

router.get('/:companyId/employees', fetchEmployees);
router.get('/employees/details/:applicantId', fetchEmployeeDetail);
router.patch('/employees/details/:applicantId', updateEmployeeDetail);

export default router;
