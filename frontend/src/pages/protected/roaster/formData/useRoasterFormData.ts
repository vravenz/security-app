import { useState } from 'react';

export interface RoasterFormData {
  roaster_id?: number;
  company_id: number;
  client_id: number;
  client_name: string;
  site_id: number;
  site_name: string;
  duty_type: string;

  payable_rate_type: string;
  payable_role: string;
  payable_amount: number;
  payable_expenses: number;

  billable_role: string;
  billable_amount: number;
  billable_expenses: number;

  unpaid_shift?: boolean;
  training_shift?: boolean;

  shift_status: 'confirmed' | 'unconfirmed' | null;

  po_received?: boolean;
  po_number?: string;
  penalty?: number;
  comments?: string;
  shift_instruction?: string;
  select_staff?: string;
  guard_group?: string;
  employee?: string;
  subcontractor?: string;
  subcontractor_employee?: string;
}

export const useRoasterFormData = () => {
  const [formData, setFormData] = useState<RoasterFormData>({
    roaster_id: undefined, // Initialize roaster_id as undefined
    company_id: 0,
    client_id: 0,
    client_name: '',
    site_id: 0,
    site_name: '',
    duty_type: 'security',
    payable_rate_type: 'Site rate',
    payable_role: '',
    payable_amount: 0,
    payable_expenses: 0,
    billable_role: '',
    billable_amount: 0,
    billable_expenses: 0,
    unpaid_shift: false,
    training_shift: false,
    shift_status: 'unconfirmed',
    po_received: false,
    po_number: '',
    penalty: 0,
    comments: '',
    shift_instruction: '',
    select_staff: '',
    guard_group: '',
    employee: '',
    subcontractor: '',
    subcontractor_employee: '',
  });

  return { formData, setFormData };
};
