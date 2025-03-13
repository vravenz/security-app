import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { isStaff } from '../../../utils/checkRole';

const StaffDashboard: React.FC = () => {
    const { userId, email, companyId, role, userPin, branchId } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!isStaff()) {
            navigate('/'); // Redirect to login if not a Super Admin
        }
    }, [navigate]);

    return (
        <div>
            <h1>Staff Dashboard</h1>
            <p>Your user ID: {userId}</p>
            <p>Your company ID: {companyId}</p>
            <p>Your email is: {email}</p>
            <p>Your pin is: {userPin}</p>
            <p>Your role is: {role}</p>
            <p>Your branch ID is: {branchId}</p> 
        </div>
    );
};

export default StaffDashboard;
