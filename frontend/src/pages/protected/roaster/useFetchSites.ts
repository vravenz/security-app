import { useState, useCallback } from 'react';
import axios from 'axios';

interface Site {
  site_id: number;
  site_name: string;
  site_payable_rate_guarding?: number;
  site_payable_rate_supervisor?: number;
  site_billable_rate_guarding?: number;
  site_billable_rate_supervisor?: number;
}

export const useFetchSites = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteDetails, setSelectedSiteDetails] = useState<Site | null>(null);

  // fetch sites by client_id
  const fetchSites = useCallback(async (clientId: number) => {
    try {
      const { data } = await axios.get<Site[]>(`http://localhost:4000/api/clients/${clientId}/sites`);
      setSites(data);
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    }
  }, []);

  // fetch single site details by siteId
  const handleSelectSite = useCallback(async (siteId: number) => {
    if (!siteId) {
      setSelectedSiteDetails(null);
      return;
    }
    try {
      const { data } = await axios.get<Site>(`http://localhost:4000/api/sites/${siteId}`);
      setSelectedSiteDetails(data);
    } catch (error) {
      console.error('Error fetching site details:', error);
      setSelectedSiteDetails(null);
    }
  }, []);

  return {
    sites,
    selectedSiteDetails,
    fetchSites,
    handleSelectSite,
  };
};
