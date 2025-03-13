import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../../components/Navbar';
import SideNavbar from '../../../components/SideNavbar';
import TwoColumnLayout from '../../../components/TwoColumnLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import ViewAsTable from '../../../components/ViewAsTable';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeContext';
import Footer from '../../../components/Footer';

interface Site {
    site_id: number;
    site_name: string;
    site_group: string;
    contact_person: string;
    contact_number: string;
    site_address: string;
    post_code: string;
    weekly_contracted_hours: number;
    trained_guards_required: boolean;
    site_billable_rate_guarding: number;
    site_billable_rate_supervisor: number;
    site_payable_rate_guarding: number;
    site_payable_rate_supervisor: number;
    site_note: string;
}

const SiteDetailPage: React.FC = () => {
    const { siteId } = useParams<{ siteId: string }>();
    const { theme } = useTheme();
    const [site, setSite] = useState<Site | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`http://localhost:4000/api/sites/${siteId}`);
                setSite(response.data);
            } catch (error) {
                console.error('Failed to fetch site data:', error);
                setError('Failed to load site details');
            }
        };

        fetchData();
    }, [siteId]);

    return (
        <div className={`${theme === 'dark' ? 'bg-dark-background' : 'bg-light-background'} min-h-screen`}>
            <Navbar />
            <TwoColumnLayout
                sidebarContent={<SideNavbar />}
                mainContent={
                    <div className={`${theme === 'dark' ? 'text-dark-text' : 'text-light-text'} md:grid md:grid-cols-1 md:gap-4`}>
                        <Card className="p-6">
                            <h1 className="text-2xl font-bold mb-4">Site Details</h1>
                            {error ? (
                                <p>{error}</p>
                            ) : site ? (
                                <ViewAsTable
                                    data={[
                                        { field: 'Site ID', value: site.site_id },
                                        { field: 'Site Name', value: site.site_name },
                                        { field: 'Site Group', value: site.site_group },
                                        { field: 'Contact Person', value: site.contact_person },
                                        { field: 'Contact Number', value: site.contact_number },
                                        { field: 'Address', value: site.site_address },
                                        { field: 'Post Code', value: site.post_code },
                                        { field: 'Contracted Hours', value: site.weekly_contracted_hours },
                                        { field: 'Trained Guards', value: site.trained_guards_required ? 'Yes' : 'No' },
                                        { field: 'Billable Rate Guarding', value: site.site_billable_rate_guarding },
                                        { field: 'Billable Rate Supervisor', value: site.site_billable_rate_supervisor },
                                        { field: 'Payable Rate Guarding', value: site.site_payable_rate_guarding },
                                        { field: 'Payable Rate Supervisor', value: site.site_payable_rate_supervisor },
                                        { field: 'Site Note', value: site.site_note },
                                    ]}
                                    columns={[
                                        { label: 'Field', accessor: 'field' },
                                        { label: 'Value', accessor: 'value' },
                                    ]}
                                />
                            ) : (
                                <p>No site details available.</p>
                            )}
                        </Card>
                    </div>
                }
            />
            <Footer />
        </div>
    );
};

export default SiteDetailPage;
