// Type definitions for Legal Case Management System

export interface CloudflareBindings {
  DB: D1Database;
}

// Core Entity Types
export interface Officer {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  position: string;
  specialization?: string;
  hourly_rate: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  client_type: 'Individual' | 'Corporation' | 'Non-Profit';
  contact_person?: string;
  notes?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CaseStatus {
  id?: number;
  name: string;
  description?: string;
  color: string;
}

export interface Case {
  id?: number;
  case_number: string;
  title: string;
  description?: string;
  client_id: number;
  primary_officer_id: number;
  status_id: number;
  case_type: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  court_name?: string;
  judge_name?: string;
  opposing_party?: string;
  opposing_counsel?: string;
  case_value: number;
  filing_date?: string;
  statute_of_limitations?: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
  
  // Joined data
  client_name?: string;
  primary_officer_name?: string;
  status_name?: string;
  status_color?: string;
}

export interface CaseDeadline {
  id?: number;
  case_id: number;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  type: string;
  completed: boolean;
  completed_date?: string;
  reminder_days: number;
  notes?: string;
  created_by: number;
  created_at?: string;
  updated_at?: string;

  // Joined data
  case_title?: string;
  case_number?: string;
  created_by_name?: string;
}

export interface Hearing {
  id?: number;
  case_id: number;
  title: string;
  hearing_type: string;
  court_name: string;
  courtroom?: string;
  judge_name?: string;
  hearing_date: string;
  hearing_time?: string;
  duration_minutes: number;
  location?: string;
  notes?: string;
  preparation_notes?: string;
  outcome?: string;
  next_hearing_id?: number;
  attending_officers?: string; // JSON array
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed';
  created_at?: string;
  updated_at?: string;

  // Joined data
  case_title?: string;
  case_number?: string;
}

export interface TimeEntry {
  id?: number;
  case_id: number;
  officer_id: number;
  entry_date: string;
  start_time?: string;
  end_time?: string;
  hours: number;
  rate: number;
  description: string;
  billable: boolean;
  billed: boolean;
  task_type: string;
  created_at?: string;
  updated_at?: string;

  // Joined data
  case_title?: string;
  case_number?: string;
  officer_name?: string;
  amount?: number; // hours * rate
}

export interface Expense {
  id?: number;
  case_id: number;
  officer_id?: number;
  expense_date: string;
  amount: number;
  description: string;
  category: string;
  receipt_number?: string;
  billable: boolean;
  billed: boolean;
  reimbursable: boolean;
  notes?: string;
  created_at?: string;

  // Joined data
  case_title?: string;
  case_number?: string;
  officer_name?: string;
}

export interface Retainer {
  id?: number;
  case_id: number;
  client_id: number;
  amount: number;
  received_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  trust_account: boolean;
  created_at?: string;

  // Joined data
  case_title?: string;
  case_number?: string;
  client_name?: string;
}

export interface CaseNote {
  id?: number;
  case_id: number;
  title: string;
  content: string;
  note_type: string;
  priority: 'Low' | 'Normal' | 'High';
  confidential: boolean;
  author_id: number;
  created_at?: string;
  updated_at?: string;

  // Joined data
  case_title?: string;
  case_number?: string;
  author_name?: string;
}

// Dashboard Statistics
export interface DashboardStats {
  total_cases: number;
  active_cases: number;
  total_clients: number;
  upcoming_deadlines: number;
  upcoming_hearings: number;
  total_billable_hours: number;
  total_revenue: number;
  pending_invoices: number;
  recent_cases: Case[];
  urgent_deadlines: CaseDeadline[];
  upcoming_hearings_list: Hearing[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form Input Types
export interface CreateCaseInput {
  title: string;
  description?: string;
  client_id: number;
  primary_officer_id: number;
  case_type: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  court_name?: string;
  judge_name?: string;
  opposing_party?: string;
  opposing_counsel?: string;
  case_value: number;
  filing_date?: string;
  statute_of_limitations?: string;
  summary?: string;
}

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  client_type: 'Individual' | 'Corporation' | 'Non-Profit';
  contact_person?: string;
  notes?: string;
}

export interface CreateDeadlineInput {
  case_id: number;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  type: string;
  reminder_days: number;
  notes?: string;
  created_by: number;
}

export interface CreateHearingInput {
  case_id: number;
  title: string;
  hearing_type: string;
  court_name: string;
  courtroom?: string;
  judge_name?: string;
  hearing_date: string;
  hearing_time?: string;
  duration_minutes: number;
  location?: string;
  notes?: string;
  preparation_notes?: string;
  attending_officers?: number[];
}

export interface CreateTimeEntryInput {
  case_id: number;
  officer_id: number;
  entry_date: string;
  start_time?: string;
  end_time?: string;
  hours: number;
  rate: number;
  description: string;
  billable: boolean;
  task_type: string;
}