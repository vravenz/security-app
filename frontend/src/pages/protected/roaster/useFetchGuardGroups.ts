import { useState, useCallback } from 'react';
import axios from 'axios';

interface GuardGroup {
  group_id: number;
  group_name: string;
}

export const useFetchGuardGroups = (companyId: number | null) => {
  const [guardGroups, setGuardGroups] = useState<GuardGroup[]>([]);

  const fetchGuardGroups = useCallback(async () => {
    if (!companyId) return;  // Check if companyId is valid
    try {
      const response = await axios.get(`http://localhost:4000/api/guard-groups/${companyId}`);
      setGuardGroups(response.data);
    } catch (error) {
      console.error('Error fetching guard groups:', error);
      setGuardGroups([]);
    }
  }, [companyId]);

  return { guardGroups, fetchGuardGroups };
};
