import { useState, useCallback } from 'react';
import axios from 'axios';

interface Employee {
  applicant_id: number;
  first_name: string;
  last_name: string;
  employee_photo: string | null;
  is_subcontractor_employee?: boolean;
  subcontractor_company_id?: number | null;
  subcontractor_company_name?: string;
}

export const useFetchEmployees = (companyId: number | null, groupId: number) => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = useCallback(async () => {
    if (!companyId || !groupId) return;  // Ensure valid companyId and groupId
    try {
      // Fetch only the guards that are part of the specified group
      const groupGuardsResponse = await axios.get(`http://localhost:4000/api/guard-groups/${groupId}/guards`);
      
      // Assume the response data is an array of employees in the group
      setEmployees(groupGuardsResponse.data);
    } catch (error) {
      console.error('Failed to fetch employees in group:', error);
      setEmployees([]);
    }
  }, [companyId, groupId]);

  return { employees, fetchEmployees };
};
