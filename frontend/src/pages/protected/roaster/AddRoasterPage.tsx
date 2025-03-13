import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ShiftsComponent from '../../../components/ShiftsComponent';

interface Employee {
  applicant_id: number;
  first_name: string;
  last_name: string;
  employee_photo: string | null;
  is_subcontractor_employee?: boolean;
  subcontractor_company_id?: number | null;
  subcontractor_company_name?: string;
}

export interface ShiftRecord {
  shift_date: string;  // "YYYY-MM-DD"
  start_time: string;  // "HH:mm"
  end_time: string;    // "HH:mm"
  break_time: string;  // e.g., "00:15:00", "00:30:00", etc.
}

const AddRoasterPage: React.FC = () => {
  const { companyId } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [message, setMessage] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

  // 1) Base roaster form data (from custom hook)
  const { formData, setFormData } = useRoasterFormData();

  // 2) Custom hooks for fetching clients and sites
  const { clients, fetchClients } = useFetchClients();
  const { sites, fetchSites, selectedSiteDetails, handleSelectSite } = useFetchSites();

  const { guardGroups, fetchGuardGroups } = useFetchGuardGroups(companyId);

  const guardGroupId = Number(formData.guard_group) || 0;
  const { employees, fetchEmployees } = useFetchEmployees(companyId, guardGroupId);

  const [shifts, setShifts] = useState<ShiftRecord[]>([]);

  useEffect(() => {
    if (companyId) {
      fetchGuardGroups();
    }
  }, [companyId, fetchGuardGroups]);
  
  useEffect(() => {
    if (companyId && guardGroupId) {
      fetchEmployees();
    }
  }, [companyId, guardGroupId, fetchEmployees]); 

  useEffect(() => {
    // Clear selected employees when staff type or guard group changes
    setSelectedEmployees([]);
  }, [formData.select_staff, formData.guard_group]);
  

  // 3) Extended fields (base fields + your additional fields/logic)
  const extendedFields = useExtendedFields({
    formData,
    setFormData,
    sites,
    selectedSiteDetails,
    clients,
    handleSelectSite,
  });

  // --- Side-effects to fetch data ---
  useEffect(() => {
    // fetch clients on mount if we have a companyId
    if (companyId) {
      setFormData((prev) => ({ ...prev, company_id: companyId }));
      fetchClients(companyId);
    }
  }, [companyId, fetchClients, setFormData]);

  // When client_id changes, fetch sites for that client
  useEffect(() => {
    if (formData.client_id) {
      fetchSites(formData.client_id);
    }
  }, [formData.client_id, fetchSites]);

  // 4) Handle form submission
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formData.company_id) {
      setMessage('Company ID is not set. Please re-login or contact support.');
      return;
    }

    try {
      let selectedEmployeesPayload;

      if (formData.select_staff === 'unassigned') {
        // For unassigned case, set applicant_id, guard_group, and subcontractor to null
        selectedEmployeesPayload = [{
          applicant_id: null,
          staff: 'unassigned',
          guard_group: null,
          subcontractor: null,
        }];
      } else {
        // For non-unassigned employees
        selectedEmployeesPayload = selectedEmployees.map(emp => ({
          applicant_id: emp.applicant_id,
          staff: formData.select_staff,
          guard_group: formData.guard_group ? Number(formData.guard_group) : null,
          subcontractor: emp.is_subcontractor_employee 
            ? emp.subcontractor_company_id ?? null 
            : null,
        }));
      }

      // Build the complete payload
      const payload = {
        ...formData, // Include all roaster fields
        selectedEmployees: selectedEmployeesPayload,
        selectedShifts: shifts,
      };

      const response = await axios.post('http://localhost:4000/api/roasters', payload);
      if (response.status === 201) {
        setMessage('Roaster added successfully!');
        navigate('/roasters/schedule');
      }
    } catch (error) {
      console.error('Failed to add roaster:', error);
      setMessage('Failed to add roaster. Please check the input data.');
    }
  };

  // 1) The field names for each card (desired order)
  const card2Names = ['payable_rate_type', 'payable_role', 'payable_amount', 'payable_expenses', 'unpaid_shift'];
  const card3Names = ['billable_role', 'billable_amount', 'billable_expenses', 'training_shift'];
  const card4Names = ['penalty', 'comments', 'shift_instruction'];

  // 2) Combine the above so we can exclude them from card1
  const allCard2_3_4 = [...card2Names, ...card3Names, ...card4Names];

  // 3) Filter out and sort the fields for each card according to the defined order
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


  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-dark-background' : 'bg-light-background'}`}>
      <Navbar />
      <div className='flex-grow'>
      <TwoColumnLayout
        sidebarContent={<SideNavbar />}
        mainContent={
          <div className={`${theme === 'dark' ? 'text-dark-text' : 'text-light-text'}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 2-column grid: left is card1, right has cards 2,3,4 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* ----- Card 1: Everything except the fields in card2/3/4 ----- */}
                <Card className="md:col-span-2 p-6 space-y-4">
                  <h1 className="text-xl font-bold mb-4">Add New Roaster</h1>
                  {card1Fields.map((field) => (
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

                {/* Conditionally render additional dropdowns based on selections */}
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
                          employee: '',
                        }));
                        // Clear selected employees on guard group change
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
                            // Find the selected employee in the current employees list
                            const emp = employees.find(e => e.applicant_id === selectedId);
                            if (emp) {
                              setSelectedEmployees(prev => {
                                // Add only if not already selected
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
                      {/* Container for selected employees */}
                      <div className="mt-4 p-4 border-2 dark:border-zinc-700 border-dotted rounded">
                        {selectedEmployees.length === 0 ? (
                          <p className="text-gray-500">No employees are selected</p>
                        ) : (
                          <div className="flex flex-wrap gap-4">
                            {selectedEmployees.map(emp => (
                              <div 
                                key={emp.applicant_id} 
                                className="flex flex-col items-center p-2 rounded shadow-sm bg-stone-100 dark:bg-stone-950 text-center"
                              >
                                {emp.employee_photo ? (
                                  <img 
                                    src={`http://localhost:4000/uploads/employee-photos/${emp.employee_photo}`} 
                                    alt={`${emp.first_name} ${emp.last_name}`}
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
                                    Sub-Employee{emp.subcontractor_company_name ? ` - ${emp.subcontractor_company_name}` : ''}
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

                  <ShiftsComponent onShiftsChange={setShifts} />
                </Card>

                {/* ----- Right Column: 3 stacked cards ----- */}
                <div className="flex flex-col space-y-2">

                  {/* Card 2: Payable */}
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

                  {/* Card 3: Billable */}
                  <Card className="p-6 space-y-4">
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

                  {/* Card 4: Penalty, Comments, Shift Instruction */}
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

              {/* Submit button below all cards */}
              <div className="flex justify-end">
                <Button type="submit" color="submit" icon="plus" marginRight='5px' size="small">
                  Add Roaster
                </Button>
              </div>
            </form>

            {message && <p className="text-red-500 mt-2">{message}</p>}
          </div>
        }
      />
      </div>
      <Footer />
    </div>
  );
};

export default AddRoasterPage;
