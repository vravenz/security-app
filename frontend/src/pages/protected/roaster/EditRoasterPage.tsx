// File: src/pages/EditRosterShiftPage.tsx

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

import Navbar from '../../../components/Navbar';
import SideNavbar from '../../../components/SideNavbar';
import TwoColumnLayout from '../../../components/TwoColumnLayout';
import Card from '../../../components/Card';
import InputField from '../../../components/InputField';
import Footer from '../../../components/Footer';
import Button from '../../../components/Button';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../hooks/useAuth';

// Custom hooks
import { useRoasterFormData } from './formData/useRoasterFormData';
import { useFetchClients } from './useFetchClients';
import { useFetchSites } from './useFetchSites';
import { useExtendedFields } from './useExtendedFields';
import { useFetchGuardGroups } from './useFetchGuardGroups';
import { useFetchEmployees } from './useFetchEmployees';

// Components
import EmployeeDropdown from '../../../components/EmployeeDropdown';
import ShiftsComponent from '../../../components/ShiftsComponent';

interface Employee {
  applicant_id: number | null;
  first_name?: string;
  last_name?: string;
  employee_photo?: string | null;
  is_subcontractor_employee?: boolean;
  subcontractor_company_id?: number | null;
  subcontractor_company_name?: string;
}

interface Roster {
  roster_id: number;
  company_id: number;
  site_id: number;
  po_number?: string | null;
  client_name: string;
  site_name: string;
}

interface RosterShift {
  roster_shift_id: number;
  roster_id: number;
  shift_date: string; // "YYYY-MM-DD"
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  break_time?: string | null;
  shift_status?: 'confirmed' | 'unconfirmed' | 'unassigned';
  penalty?: number | null;
  comments?: string | null;
  shift_instruction?: string | null;
  payable_rate_type?: string | null;
  payable_role?: string | null;
  payable_amount?: number | null;
  billable_role?: string | null;
  billable_amount?: number | null;
  payable_expenses?: number | null;
  billable_expenses?: number | null;
  unpaid_shift?: boolean;
  training_shift?: boolean;
}

interface RosterShiftAssignment {
  roster_shift_assignment_id: number;
  company_id: number;
  roster_shift_id: number;
  roster_employee_id: number;
  assignment_start_time?: string | null;
  assignment_end_time?: string | null;
  actual_worked_hours?: number | null;
  assignment_status?: 'active' | 'removed' | 'completed';
  employee_shift_status?: 'confirmed' | 'unconfirmed';
}

const EditRosterShiftPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Destructure auth info; note we now use companyId and userId directly.
  const { companyId, userId } = useAuth();

  // Local state for loading, messages, and fetched data.
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  const [rosterData, setRosterData] = useState<Roster | null>(null);
  const [shiftData, setShiftData] = useState<RosterShift | null>(null);
  const [assignmentData, setAssignmentData] = useState<RosterShiftAssignment | null>(null);

  // For removal flow.
  const [showRemovalReason, setShowRemovalReason] = useState<boolean>(false);
  const [removalReason, setRemovalReason] = useState<string>('');

  // Main form state.
  const { formData, setFormData } = useRoasterFormData();

  // Data fetching hooks.
  const { clients, fetchClients } = useFetchClients();
  const { sites, fetchSites, selectedSiteDetails, handleSelectSite } = useFetchSites();
  const { guardGroups, fetchGuardGroups } = useFetchGuardGroups(companyId);
  const guardGroupId = Number(formData.guard_group) || 0;
  const { employees, fetchEmployees } = useFetchEmployees(companyId, guardGroupId);

  // The currently assigned employee (if any).
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Generate extended fields but exclude 'select_staff' so it isn’t duplicated.
  const extendedFields = useExtendedFields({
    formData,
    setFormData,
    sites,
    selectedSiteDetails,
    clients,
    handleSelectSite,
    isEditMode: true,
  });

  const card2Names = ['payable_rate_type', 'payable_role', 'payable_amount', 'payable_expenses', 'unpaid_shift'];
  const card3Names = ['billable_role', 'billable_amount', 'billable_expenses', 'training_shift'];
  const card4Names = ['penalty', 'comments', 'shift_instruction'];
  const allCard2_3_4 = [...card2Names, ...card3Names, ...card4Names];

  // Exclude "select_staff" from card1Fields to avoid duplication.
  const card1Fields = extendedFields.filter(
    (field) => !allCard2_3_4.includes(field.name) && field.name !== 'select_staff'
  );
  const card2Fields = extendedFields.filter((field) => card2Names.includes(field.name));
  const card3Fields = extendedFields.filter((field) => card3Names.includes(field.name));
  const card4Fields = extendedFields.filter((field) => card4Names.includes(field.name));

  // -------------------- INITIAL LOAD & FETCHES --------------------
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setFormData((prev) => ({ ...prev, company_id: companyId }));
    fetchClients(companyId);
    fetchGuardGroups();
  }, [companyId, setFormData, fetchClients, fetchGuardGroups]);

  useEffect(() => {
    if (formData.client_id) {
      fetchSites(formData.client_id);
    }
  }, [formData.client_id, fetchSites]);

  useEffect(() => {
    if (companyId && guardGroupId) {
      fetchEmployees();
    }
  }, [companyId, guardGroupId, fetchEmployees]);

  // Fetch the shift details using the shift id.
  useEffect(() => {
    if (!id) {
      setMessage('No valid shift ID provided.');
      setLoading(false);
      return;
    }
    const fetchShiftData = async () => {
      try {
        // 1. Fetch the shift.
        const shiftRes = await axios.get(`http://localhost:4000/api/rostershifts/${id}`);
        const shift = shiftRes.data;
        setShiftData(shift);
        setFormData((prev) => ({
          ...prev,
          payable_rate_type: shift.payable_rate_type,
          payable_role: shift.payable_role,
          payable_amount: shift.payable_amount,
          payable_expenses: shift.payable_expenses,
          billable_role: shift.billable_role,
          billable_amount: shift.billable_amount,
          billable_expenses: shift.billable_expenses,
          unpaid_shift: shift.unpaid_shift,
          training_shift: shift.training_shift,
          shift_status: shift.shift_status,
          penalty: shift.penalty,
          comments: shift.comments,
          shift_instruction: shift.shift_instruction,
          shift_date: shift.shift_date,
          scheduled_start_time: shift.scheduled_start_time,
          scheduled_end_time: shift.scheduled_end_time,
          break_time: shift.break_time || '',
        }));

        // 2. Fetch the parent roster.
        const rosterRes = await axios.get(`http://localhost:4000/api/rosters/${shift.roster_id}`);
        const roster = rosterRes.data.roster;
        setRosterData(roster);
        setFormData((prev) => ({
          ...prev,
          client_name: roster.client_name,
          site_name: roster.site_name,
          po_number: roster.po_number,
          site_id: roster.site_id,
        }));

        // 3. Fetch assignment(s) for this shift and filter out removed ones.
        const assignRes = await axios.get(`http://localhost:4000/api/rostershiftassignments/shift/${id}`);
        const assignments = assignRes.data;
        if (assignments && assignments.length > 0) {
          const validAssignment = assignments.find(
            (assignment: RosterShiftAssignment) => assignment.assignment_status !== 'removed'
          );
          if (validAssignment) {
            setAssignmentData(validAssignment);
          } else {
            setSelectedEmployee(null);
            setFormData((prev) => ({ ...prev, select_staff: 'unassigned' }));
          }
        } else {
          setSelectedEmployee(null);
          setFormData((prev) => ({ ...prev, select_staff: 'unassigned' }));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching shift details:', error);
        setMessage('Failed to fetch shift details. Please try again.');
        setLoading(false);
      }
    };

    fetchShiftData();
  }, [id, companyId, setFormData]);

  // When an assignment exists, fetch the detailed employee record.
  useEffect(() => {
    if (assignmentData && assignmentData.roster_employee_id) {
      axios
        .get(`http://localhost:4000/api/rosteremployees/${assignmentData.roster_employee_id}`)
        .then((response) => {
          setSelectedEmployee(response.data);
          setFormData((prev) => ({ ...prev, select_staff: 'Employee' }));
        })
        .catch((error) => {
          console.error('Error fetching assigned employee details:', error);
        });
    }
  }, [assignmentData, setFormData]);

  // -------------------- HELPER FUNCTIONS --------------------
  // Remove the currently assigned employee: show removal reason modal.
  const handleRequestRemoveEmployee = () => {
    setShowRemovalReason(true);
    setRemovalReason('');
  };

  // Confirm removal using the DELETE route.
  const handleConfirmRemoveEmployee = async () => {
    if (!assignmentData) {
      setSelectedEmployee(null);
      setFormData((prev) => ({ ...prev, select_staff: 'unassigned' }));
      setShowRemovalReason(false);
      return;
    }
    try {
      // Send a DELETE request with a request body that includes company_id and removal_reason.
      await axios.delete(
        `http://localhost:4000/api/rostershiftassignments/${assignmentData.roster_shift_assignment_id}`,
        {
          data: { 
            company_id: companyId, 
            removal_reason: removalReason 
          },
          headers: { 'x-user-id': userId ?? '' }
        }
      );
  
      // Clear assignment data on success.
      setAssignmentData(null);
      setSelectedEmployee(null);
      setFormData((prev) => ({ ...prev, select_staff: 'unassigned' }));
      setMessage('Employee removed from shift successfully!');
    } catch (error) {
      console.error('Error removing employee from shift:', error);
      setMessage('Failed to remove employee from shift.');
    } finally {
      setShowRemovalReason(false);
      setRemovalReason('');
    }
  };  

  const handleCancelRemove = () => {
    setShowRemovalReason(false);
    setRemovalReason('');
  };

  // -------------------- SUBMIT HANDLER --------------------
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!companyId || userId === null) {
      setMessage('User or Company ID is missing. Please re-login.');
      return;
    }
    if (!shiftData) {
      setMessage('No shift data found.');
      return;
    }

    try {
      // 1. Update the shift record with header containing actual user id
      const shiftPayload = {
        company_id: companyId,
        roster_id: shiftData.roster_id,
        shift_date: shiftData.shift_date,
        scheduled_start_time: formData.scheduled_start_time,
        scheduled_end_time: formData.scheduled_end_time,
        break_time: formData.break_time,
        shift_status: formData.shift_status,
        penalty: formData.penalty,
        comments: formData.comments,
        shift_instruction: formData.shift_instruction,
        payable_rate_type: formData.payable_rate_type,
        payable_role: formData.payable_role,
        payable_amount: formData.payable_amount,
        billable_role: formData.billable_role,
        billable_amount: formData.billable_amount,
        billable_expenses: formData.billable_expenses,
        payable_expenses: formData.payable_expenses,
        unpaid_shift: formData.unpaid_shift,
        training_shift: formData.training_shift,
      };

      await axios.put(
        `http://localhost:4000/api/rostershifts/${shiftData.roster_shift_id}`,
        shiftPayload,
        { headers: { 'x-user-id': userId } }
      );

      // 2. If there's a selected employee and no assignment exists, create one.
      if (selectedEmployee && !assignmentData) {
        const newAssignmentPayload = {
          company_id: companyId,
          roster_shift_id: shiftData.roster_shift_id,
          roster_employee_id: selectedEmployee.applicant_id,
          assignment_start_time: null,
          assignment_end_time: null,
          actual_worked_hours: null,
          assignment_status: 'active',
          employee_shift_status: 'unconfirmed',
        };
        await axios.post(
          'http://localhost:4000/api/rostershiftassignments',
          newAssignmentPayload,
          { headers: { 'x-user-id': userId } }
        );
      }

      setMessage('Shift updated successfully!');
      navigate('/rosters/schedule');
    } catch (error) {
      console.error('Error updating shift:', error);
      setMessage('Failed to update shift. Please check your input and try again.');
    }
  };

  const memoizedShifts = useMemo(() => [{
    shift_date: formData.shift_date,
    scheduled_start_time: formData.scheduled_start_time,
    scheduled_end_time: formData.scheduled_end_time,
    break_time: formData.break_time || '',
  }], [
    formData.shift_date,
    formData.scheduled_start_time,
    formData.scheduled_end_time,
    formData.break_time
  ]);

  // -------------------- RENDERING --------------------
  const mainContent = (
    <div className={`${theme === 'dark' ? 'text-dark-text' : 'text-light-text'}`}>
      {loading ? (
        <p>Loading shift data...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* LEFT/MIDDLE Column */}
            <Card className="md:col-span-2 p-6 space-y-4">
              <h1 className="text-xl font-bold mb-4">Edit Shift</h1>
              {message && <p className="text-red-500">{message}</p>}

              {/* Roster read-only fields */}
              <InputField
                type="text"
                name="client_name"
                value={formData.client_name || ''}
                label="Client Name"
                disabled
                onChange={() => {}}
              />
              <InputField
                type="text"
                name="site_name"
                value={formData.site_name || ''}
                label="Site Name"
                disabled
                onChange={() => {}}
              />
              <InputField
                type="text"
                name="po_number"
                value={formData.po_number || ''}
                label="PO Number"
                disabled
                onChange={() => {}}
              />

              {/* Render additional card1 fields (excluding select_staff) */}
              {card1Fields.map((field) => (
                <InputField
                  key={field.name}
                  type={field.type}
                  name={field.name}
                  value={(formData as any)[field.name] || ''}
                  onChange={field.onChange}
                  label={field.label}
                  required={field.required}
                  options={field.options}
                />
              ))}

              {/* Manually render "Select Staff" once */}
              <InputField
                type="select"
                name="select_staff"
                label="Select Staff"
                required
                options={[
                  { label: 'Employee', value: 'Employee' },
                  { label: 'Unassigned', value: 'unassigned' },
                ]}
                value={formData.select_staff || 'unassigned'}
                disabled={!!selectedEmployee}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, select_staff: e.target.value }))
                }
              />

              {/* If "Employee" is selected and no employee is assigned, show dropdown for guard group and employee */}
              {formData.select_staff === 'Employee' && !selectedEmployee && (
                <div className="space-y-4">
                  <InputField
                    type="select"
                    name="guard_group"
                    label="Select Guard Group"
                    required
                    options={guardGroups.map((g) => ({ label: g.group_name, value: g.group_id }))}
                    value={formData.guard_group || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, guard_group: e.target.value }))
                    }
                  />
                  {formData.guard_group && (
                    <EmployeeDropdown
                      label="Select Employee"
                      employees={employees}
                      value={undefined}
                      onChange={(selectedId) => {
                        const emp = employees.find((e) => e.applicant_id === selectedId);
                        if (emp) {
                          setSelectedEmployee(emp);
                        }
                      }}
                    />
                  )}
                </div>
              )}

              {/* If an employee is assigned, show their card with a remove button */}
              {selectedEmployee && (
                <div className="mt-4 p-4 border-2 dark:border-zinc-700 border-dotted rounded">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center p-2 rounded shadow-sm bg-stone-100 dark:bg-stone-950 text-center">
                      {selectedEmployee.employee_photo ? (
                        <img
                          src={`http://localhost:4000/uploads/employee-photos/${selectedEmployee.employee_photo}`}
                          alt={`${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-gray-300 flex items-center justify-center">
                          N/A
                        </div>
                      )}
                      <span className="text-sm font-medium mt-1">
                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                      </span>
                      {selectedEmployee.is_subcontractor_employee && (
                        <span className="text-xs font-semibold mt-1 text-gray-600 bg-yellow-200 rounded-full px-2 py-1">
                          Sub-Employee
                          {selectedEmployee.subcontractor_company_name
                            ? ` - ${selectedEmployee.subcontractor_company_name}`
                            : ''}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestRemoveEmployee}
                      className="text-red-500 text-xl font-bold"
                      title="Remove Employee"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Shift details: date is read-only, but times and break can be updated */}
              <ShiftsComponent
                  shifts={memoizedShifts}
                  onShiftsChange={(newShifts) => {
                    if (newShifts && newShifts.length > 0) {
                      setFormData((prev) => ({ ...prev, ...newShifts[0] }));
                    }
                  }}
                  disableDateEditing={true}
                  disableShiftAddition={true}
                  readOnly={true}
                />
            </Card>

            {/* RIGHT Column */}
            <div className="flex flex-col space-y-2">
              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-bold mb-2 text-blue-600">Payable</h2>
                {card2Fields.map((field) => (
                  <InputField
                    key={field.name}
                    type={field.type}
                    name={field.name}
                    value={(formData as any)[field.name] || ''}
                    onChange={field.onChange}
                    label={field.label}
                    required={field.required}
                    options={field.options}
                  />
                ))}
              </Card>
              <Card className="p-6 space-y-2">
                <h2 className="text-lg font-bold mb-2 text-green-600">Billable</h2>
                {card3Fields.map((field) => (
                  <InputField
                    key={field.name}
                    type={field.type}
                    name={field.name}
                    value={(formData as any)[field.name] || ''}
                    onChange={field.onChange}
                    label={field.label}
                    required={field.required}
                    options={field.options}
                  />
                ))}
              </Card>
              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-bold mb-2 text-red-600">Additional</h2>
                {card4Fields.map((field) => (
                  <InputField
                    key={field.name}
                    type={field.type}
                    name={field.name}
                    value={(formData as any)[field.name] || ''}
                    onChange={field.onChange}
                    label={field.label}
                    required={field.required}
                    options={field.options}
                  />
                ))}
              </Card>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end">
            <Button type="submit" color="submit" icon="plus" marginRight="5px" size="small">
              Update Shift
            </Button>
          </div>
        </form>
      )}

      {/* Removal Reason Modal */}
      {showRemovalReason && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white dark:bg-stone-900 p-4 rounded shadow max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Removal Reason</h3>
            <textarea
              className="w-full p-2 border border-gray-300 rounded dark:bg-stone-800 dark:text-white"
              rows={3}
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
            />
            <div className="flex justify-end mt-3 space-x-2">
              <Button type="button" color="delete" onClick={handleConfirmRemoveEmployee} size="small">
                Remove
              </Button>
              <Button type="button" color="edit" onClick={handleCancelRemove} size="small">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`flex flex-col min-h-screen ${
        theme === 'dark' ? 'bg-dark-background text-dark-text' : 'bg-light-background text-light-text'
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

export default EditRosterShiftPage;
