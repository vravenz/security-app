import React, { useState, useEffect, FormEvent } from 'react';
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
import { useRoasterFormData } from './formData/useRoasterFormData';
import { useFetchClients } from './useFetchClients';
import { useFetchSites } from './useFetchSites';
import { useExtendedFields } from './useExtendedFields';
import { useFetchGuardGroups } from './useFetchGuardGroups';
import { useFetchEmployees } from './useFetchEmployees';
import EmployeeDropdown from '../../../components/EmployeeDropdown';
import ShiftsComponent, { ShiftRecord } from '../../../components/ShiftsComponent';

interface Employee {
  applicant_id: number | null;
  first_name?: string;
  last_name?: string;
  employee_photo?: string | null;
  is_subcontractor_employee?: boolean;
  subcontractor_company_id?: number | null;  // might store ID
  subcontractor_company_name?: string;       // might show text
}

const EditRoasterPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // 1) Grab the companyId from useAuth
  const { companyId } = useAuth();

  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // 2) Reuse the roaster form data logic from the Add page
  const { formData, setFormData } = useRoasterFormData();

  // 3) Custom hooks for fetching clients, sites, guard groups, employees
  const { clients, fetchClients } = useFetchClients();
  const { sites, fetchSites, selectedSiteDetails, handleSelectSite } = useFetchSites();
  const { guardGroups, fetchGuardGroups } = useFetchGuardGroups(companyId);

  // We track employees based on guard_group + companyId
  const guardGroupId = Number(formData.guard_group) || 0;
  const { employees, fetchEmployees } = useFetchEmployees(companyId, guardGroupId);

  // 4) Local state for selected employees
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

  // 5) Local state for shifts (fetched from existing roaster data)
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);

  // 6) Get extended fields; pass isEditMode=true so the client/site fields are hidden
  const extendedFields = useExtendedFields({
    formData,
    setFormData,
    sites,
    selectedSiteDetails,
    clients,
    handleSelectSite,
    isEditMode: true,
  });

  // -------------------- FETCH NEEDED DATA ON MOUNT -------------------- //
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setFormData((prev) => ({ ...prev, company_id: companyId }));
    // Although clients and sites are fetched, they won't be rendered in edit mode.
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

  // -------------------- FETCH ROASTER BY ID -------------------- //
  useEffect(() => {
    if (!id) {
      setMessage('No valid roaster ID provided in URL.');
      setLoading(false);
      return;
    }
    const fetchRoasterById = async () => {
      try {
        const response = await axios.get(`http://localhost:4000/api/roasters/${id}`);
        const roasterData = response.data;

        // 1) Pre-fill the main form fields
        setFormData((prev) => ({
          ...prev,
          roaster_id: roasterData.roaster_id,
          company_id: roasterData.company_id,
          client_id: roasterData.client_id,   // For your reference if needed
          client_name: roasterData.client_name, // Read-only
          site_name: roasterData.site_name,     // Read-only
          duty_type: roasterData.duty_type,
          payable_rate_type: roasterData.payable_rate_type,
          payable_role: roasterData.payable_role,
          payable_amount: roasterData.payable_amount,
          payable_expenses: roasterData.payable_expenses,
          billable_role: roasterData.billable_role,
          billable_amount: roasterData.billable_amount,
          billable_expenses: roasterData.billable_expenses,
          unpaid_shift: roasterData.unpaid_shift,
          training_shift: roasterData.training_shift,
          shift_status: roasterData.shift_status,
          po_number: roasterData.po_number,
          penalty: roasterData.penalty,
          comments: roasterData.comments,
          shift_instruction: roasterData.shift_instruction,
        }));

        // 2) If there are shifts, set them
        if (roasterData.selectedShifts) {
          const shiftsData: ShiftRecord[] = roasterData.selectedShifts.map((shift: any) => ({
            shift_date: shift.shift_date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_time: shift.break_time || '',
          }));
          setShifts(shiftsData);
        }

        // 3) Determine how employees were assigned
        if (roasterData.selectedEmployees && roasterData.selectedEmployees.length > 0) {
          const firstStaffType = roasterData.selectedEmployees[0].staff;
          if (firstStaffType === 'unassigned') {
            setFormData((prev) => ({
              ...prev,
              select_staff: 'unassigned',
            }));
            setSelectedEmployees([]);
          } else {
            setFormData((prev) => ({
              ...prev,
              select_staff: 'Employee',
              guard_group: roasterData.selectedEmployees[0].guard_group
                ? String(roasterData.selectedEmployees[0].guard_group)
                : '',
            }));
            const assignedEmps = roasterData.selectedEmployees.map((emp: any) => ({
              applicant_id: emp.applicant_id,
              first_name: emp.first_name,
              last_name: emp.last_name,
              employee_photo: emp.employee_photo,
              is_subcontractor_employee: emp.is_subcontractor_employee,
              subcontractor_company_id: emp.subcontractor,
              subcontractor_company_name: emp.subcontractor_company_name,
            }));
            setSelectedEmployees(assignedEmps);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching roaster by ID:', error);
        setMessage('Failed to fetch roaster details. Possibly invalid ID or server error.');
        setLoading(false);
      }
    };
    fetchRoasterById();
  }, [id, setFormData]);

  // -------------------- SUBMIT HANDLER (UPDATE) -------------------- //
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formData.company_id) {
      setMessage('Company ID is not set. Please re-login or contact support.');
      return;
    }
    if (!formData.roaster_id) {
      setMessage('No valid roaster ID found in form data. Cannot update.');
      return;
    }
    try {
      let selectedEmployeesPayload;
      if (formData.select_staff === 'unassigned') {
        selectedEmployeesPayload = [{
          applicant_id: null,
          staff: 'unassigned',
          guard_group: null,
          subcontractor: null,
        }];
      } else {
        selectedEmployeesPayload = selectedEmployees.map(emp => ({
          applicant_id: emp.applicant_id,
          staff: 'Employee',
          guard_group: formData.guard_group ? Number(formData.guard_group) : null,
          subcontractor: emp.is_subcontractor_employee
            ? emp.subcontractor_company_id ?? null
            : null,
        }));
      }

      const payload = {
        ...formData,
        selectedEmployees: selectedEmployeesPayload,
        selectedShifts: shifts,
      };

      const url = `http://localhost:4000/api/roasters/${formData.roaster_id}`;
      const response = await axios.put(url, payload);
      if (response.status === 200) {
        setMessage('Roaster updated successfully!');
        navigate('/roasters/schedule');
      }
    } catch (error) {
      console.error('Failed to update roaster:', error);
      setMessage('Failed to update roaster. Please check the input data or try again.');
    }
  };

  // -------------------- RENDER FIELDS IN CARDS -------------------- //
  const card2Names = ['payable_rate_type', 'payable_role', 'payable_amount', 'payable_expenses', 'unpaid_shift'];
  const card3Names = ['billable_role', 'billable_amount', 'billable_expenses', 'training_shift'];
  const card4Names = ['penalty', 'comments', 'shift_instruction'];
  const allCard2_3_4 = [...card2Names, ...card3Names, ...card4Names];

  const card1Fields = extendedFields.filter((field) => !allCard2_3_4.includes(field.name));
  const card2Fields = extendedFields
    .filter((field) => card2Names.includes(field.name))
    .sort((a, b) => card2Names.indexOf(a.name) - card2Names.indexOf(b.name));
  const card3Fields = extendedFields
    .filter((field) => card3Names.includes(field.name))
    .sort((a, b) => card3Names.indexOf(a.name) - card3Names.indexOf(b.name));
  const card4Fields = extendedFields
    .filter((field) => card4Names.includes(field.name))
    .sort((a, b) => card4Names.indexOf(a.name) - card4Names.indexOf(b.name));

  const mainContent = (
    <div className={`${theme === 'dark' ? 'text-dark-text' : 'text-light-text'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Left Column: Primary fields */}
          <Card className="md:col-span-2 p-6 space-y-4">
            <h1 className="text-xl font-bold mb-4">Edit Roaster</h1>
            {loading && <p>Loading roaster data...</p>}
            {message && <p className="text-red-500">{message}</p>}

            {/* Render client and site names as read-only */}
            <InputField
              type="text"
              name="client_name"
              value={(formData as any).client_name}
              label="Client Name"
              disabled
              onChange={() => {}}
            />
            <InputField
              type="text"
              name="site_name"
              value={(formData as any).site_name}
              label="Site Name"
              disabled
              onChange={() => {}}
            />

            {/* Render the remaining fields from card1Fields */}
            {!loading && card1Fields.map((field) => (
              <InputField
                key={field.name}
                type={field.type}
                name={field.name}
                value={(formData as any)[field.name]}
                onChange={field.onChange}
                label={field.label}
                required={field.required}
                options={field.options}
              />
            ))}

            {/* Render employee selection if applicable */}
            {formData.select_staff === 'Employee' && (
              <>
                <InputField
                  type="select"
                  name="guard_group"
                  label="Select Guard Group"
                  required
                  options={guardGroups.map((g) => ({ label: g.group_name, value: g.group_id }))}
                  value={formData.guard_group}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      guard_group: e.target.value,
                    }));
                    // Clear employees only when user manually changes the guard group
                    setSelectedEmployees([]);
                  }}
                />
                {formData.guard_group && (
                  <>
                    <EmployeeDropdown
                      label="Select Employee"
                      employees={employees}
                      value={formData.employee ? Number(formData.employee) : undefined}
                      onChange={(selectedId) => {
                        const emp = employees.find(e => e.applicant_id === selectedId);
                        if (emp) {
                          setSelectedEmployees(prev => {
                            if (!prev.some(e => e.applicant_id === emp.applicant_id)) {
                              return [...prev, emp];
                            }
                            return prev;
                          });
                        }
                        setFormData((prev) => ({
                          ...prev,
                          employee: String(selectedId),
                        }));
                      }}
                    />
                    <div className="mt-4 p-4 border-2 dark:border-zinc-700 border-dotted rounded">
                      {selectedEmployees.length === 0 ? (
                        <p className="text-gray-500">No employees are selected</p>
                      ) : (
                        <div className="flex flex-wrap gap-4">
                          {selectedEmployees.map(emp => (
                            <div 
                              key={emp.applicant_id ?? Math.random()}
                              className="flex flex-col items-center p-2 rounded shadow-sm bg-stone-100 dark:bg-stone-950 text-center"
                            >
                              {emp.employee_photo ? (
                                <img 
                                  src={`http://localhost:4000/uploads/employee-photos/${emp.employee_photo}`} 
                                  alt={`${emp.first_name ?? ''} ${emp.last_name ?? ''}`}
                                  className="h-14 w-14 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-full bg-gray-300 flex items-center justify-center">
                                  N/A
                                </div>
                              )}
                              <span className="text-sm font-medium mt-1">
                                {emp.first_name} {emp.last_name}
                              </span>
                              {emp.is_subcontractor_employee && (
                                <span className="text-xs font-semibold mt-1 text-gray-600 bg-yellow-200 rounded-full px-2 py-1">
                                  Sub-Employee
                                  {emp.subcontractor_company_name
                                    ? ` - ${emp.subcontractor_company_name}`
                                    : ''}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Render ShiftsComponent with fetched shifts */}
            <ShiftsComponent
              shifts={shifts}
              onShiftsChange={setShifts}
              disableDateEditing={true}
              disableShiftAddition={true}
            />
          </Card>

          {/* Right Column: Grouped cards */}
          <div className="flex flex-col space-y-2">
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold mb-2 text-blue-600">Payable</h2>
              {card2Fields.map((field) => (
                <InputField
                  key={field.name}
                  type={field.type}
                  name={field.name}
                  value={(formData as any)[field.name]}
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
                  value={(formData as any)[field.name]}
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
                  value={(formData as any)[field.name]}
                  onChange={field.onChange}
                  label={field.label}
                  required={field.required}
                  options={field.options}
                />
              ))}
            </Card>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" color="submit" icon="plus" marginRight="5px" size="small">
            Update Roaster
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-dark-background' : 'bg-light-background'}`}>
      <Navbar />
      <div className="flex-grow">
        <TwoColumnLayout
          sidebarContent={<SideNavbar />}
          mainContent={mainContent}
        />
      </div>
      <Footer />
    </div>
  );
};

export default EditRoasterPage;
