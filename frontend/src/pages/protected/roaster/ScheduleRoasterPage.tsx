// ScheduleRoasterPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Card from '../../../components/Card';
import TwoColumnLayout from '../../../components/TwoColumnLayout';
import Navbar from '../../../components/Navbar';
import SideNavbar from '../../../components/SideNavbar';
import Footer from '../../../components/Footer';
import { useTheme } from '../../../context/ThemeContext';
import { 
  format, 
  startOfWeek, 
  addWeeks, 
  subWeeks, 
  isWithinInterval, 
  parseISO, 
  addDays 
} from 'date-fns';
import { FaChevronLeft, FaChevronRight, FaCheckCircle, FaExclamationCircle, FaQuestionCircle } from 'react-icons/fa';


// ----------- Types -----------
interface Shift {
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_status: 'confirmed' | 'unconfirmed'; // Added shift_status
  employee_photo?: string;
}

interface Employee {
  roaster_employee_id: number;
  guard_name: string;
  shifts: Shift[];
}

interface Roaster {
  roaster_id: number;
  client_name: string;
  site_name: string;
  employees: Employee[];
  // Additional fields can be added if needed
}

// Interface for table rows
interface TableRow {
  roaster_id: number;
  client_name: string;
  site_name: string;
  date: string;
  shifts: ShiftDetail[];
}

interface ShiftDetail {
  guard_name: string;
  start_time: string;
  end_time: string;
  shift_status: 'confirmed' | 'unconfirmed'; // Added shift_status
  employee_photo?: string
}

const ScheduleRoasterPage: React.FC = () => {
  const { theme } = useTheme();
  const [roasters, setRoasters] = useState<Roaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  // State to manage the current week (start date)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 })); // Assuming week starts on Monday

  // Fetch roasters data on component mount
  useEffect(() => {
    const fetchRoasters = async () => {
      try {
        const response = await axios.get<Roaster[]>('http://localhost:4000/api/all');
        setRoasters(response.data);
      } catch (err) {
        console.error('Error fetching roasters:', err);
        setError('Failed to load roasters.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoasters();
  }, []);

  // Handler that navigates to Edit page
  const handleShiftClick = (roasterId: number) => {
    navigate(`/roasters/edit/${roasterId}`);
  };

  // Transform roasters data into table rows, filtered by the current week
  const tableRows: TableRow[] = useMemo(() => {
    const rows: TableRow[] = [];

    const weekInterval = {
      start: currentWeekStart,
      end: addDays(currentWeekStart, 6), // End of the week (6 days after start)
    };

    roasters.forEach((roaster) => {
      const shiftMap: { [date: string]: ShiftDetail[] } = {};

      roaster.employees.forEach((employee) => {
        employee.shifts.forEach((shift) => {
          const date = shift.shift_date;
          const shiftDate = parseISO(date);

          // Check if the shift is within the current week
          if (isWithinInterval(shiftDate, weekInterval)) {
            const formattedDate = format(shiftDate, 'yyyy-MM-dd');
            if (!shiftMap[formattedDate]) {
              shiftMap[formattedDate] = [];
            }
            shiftMap[formattedDate].push({
              guard_name: employee.guard_name,
              start_time: shift.start_time,
              end_time: shift.end_time,
              shift_status: shift.shift_status,
              employee_photo: shift.employee_photo,
            });
          }
        });
      });

      Object.keys(shiftMap).forEach((date) => {
        rows.push({
          roaster_id: roaster.roaster_id,
          client_name: roaster.client_name,
          site_name: roaster.site_name,
          date,
          shifts: shiftMap[date],
        });
      });
    });

    return rows;
  }, [roasters, currentWeekStart]);

  const getEmployeePhotoUrl = (photo?: string) => {
    if (!photo) return '';
    return photo.startsWith('http') ? photo : `http://localhost:4000/uploads/employee-photos/${photo}`;
  };  

  // Function to format time to AM/PM
  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const hourNum = parseInt(hours, 10);
    const amOrPm = hourNum >= 12 ? 'PM' : 'AM';
    const adjustedHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${adjustedHour}:${minutes} ${amOrPm}`;
  };

  // Handlers to navigate weeks
  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  // Highlight today's date
  const today = format(new Date(), 'yyyy-MM-dd');

  // Render the table
  const renderTable = () => {
    if (loading) return <p>Loading roasters...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    if (tableRows.length === 0) return <p>No roasters found for this week.</p>;

    return (
      <div className="overflow-x-auto">
        <table
          className={`min-w-full divide-y ${
            theme === 'dark' ? 'divide-neutral-700' : 'divide-neutral-200'
          }`}
        >
          <thead
            className={`${
              theme === 'dark' ? 'bg-dark-background text-dark-text' : 'bg-light-background text-light-text'
            }`}
          >
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Site
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Shifts
              </th>
            </tr>
          </thead>
          <tbody
            className={`${
              theme === 'dark' ? 'bg-dark-cardBackground' : 'bg-white'
            } divide-y ${
              theme === 'dark' ? 'divide-neutral-700' : 'divide-neutral-200'
            }`}
          >
            {tableRows.map((row, idx) => (
              <tr 
                key={idx} 
                className={`hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  row.date === today ? 'bg-neutral-100 dark:bg-neutral-900' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {row.client_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {row.site_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {format(parseISO(row.date), 'PPP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-wrap gap-2">
                      {row.shifts.map((shift, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => handleShiftClick(row.roaster_id)}
                          className={`w-[160px] px-6 py-2 rounded-md flex flex-col items-center justify-center min-w-[120px] text-white ${
                            shift.shift_status === 'confirmed'
                              ? 'bg-green-600'
                              : shift.shift_status === 'unconfirmed'
                              ? 'bg-red-600'
                              : 'bg-gray-600'
                          }`}
                          title={`Shift Status: ${shift.shift_status || 'unassigned'}`}
                          tabIndex={0}
                        >
                          {/* Render employee photo if available */}
                          {shift.employee_photo && (
                            <img
                              src={getEmployeePhotoUrl(shift.employee_photo)}
                              alt={shift.guard_name}
                              className="w-8 h-8 rounded-full mb-1 object-cover"
                            />
                          )}
                        <span className="font-semibold">{shift.guard_name}</span>
                        <span className="text-xs">
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </span>
                        <span className="text-xs flex items-center gap-1 mt-1">
                          {shift.shift_status === 'confirmed' ? (
                            <FaCheckCircle />
                          ) : shift.shift_status === 'unconfirmed' ? (
                            <FaExclamationCircle />
                          ) : (
                            <FaQuestionCircle />
                          )}
                          {shift.shift_status 
                            ? shift.shift_status.charAt(0).toUpperCase() + shift.shift_status.slice(1)
                            : 'Unassigned'}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Main content layout
  const mainContent = (
    <div className="space-y-2">
      {/* Page Header with Weekly Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-light-cardBackground dark:bg-dark-cardBackground rounded p-4 shadow">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Schedule Roaster</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Manage and review all scheduled roasters for the week.
          </p>
        </div>
        {/* Weekly Navigation */}
        <div className="flex items-center mt-3 sm:mt-0">
          <button
            onClick={handlePrevWeek}
            className="p-2 bg-gray-200 dark:bg-neutral-700 rounded-md hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
            aria-label="Previous Week"
          >
            <FaChevronLeft />
          </button>
          <span className="mx-4 text-lg font-medium">
            {format(currentWeekStart, 'MMM dd, yyyy')} - {format(addDays(currentWeekStart, 6), 'MMM dd, yyyy')}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-2 bg-gray-200 dark:bg-neutral-700 rounded-md hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
            aria-label="Next Week"
          >
            <FaChevronRight />
          </button>
        </div>
      </header>

      {/* Roaster Table */}
      <Card padding="p-4" shadow={true} border={true}>
        {renderTable()}
      </Card>
    </div>
  );

  // Final Return
  return (
    <div
      className={`flex flex-col min-h-screen ${
        theme === 'dark'
          ? 'bg-dark-background text-dark-text'
          : 'bg-light-background text-light-text'
      }`}
    >
      <Navbar />
      <div className="flex-grow">
        <TwoColumnLayout sidebarContent={<SideNavbar />} mainContent={mainContent} />
      </div>
      <Footer />
    </div>
  );
};

export default ScheduleRoasterPage;
