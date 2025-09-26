-- Legal Case Management System - Initial Schema

-- Handling Officers/Staff table
CREATE TABLE IF NOT EXISTS officers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  position TEXT NOT NULL, -- Partner, Senior Associate, Associate, Paralegal, etc.
  specialization TEXT, -- Corporate Law, Criminal Law, Family Law, etc.
  hourly_rate DECIMAL(10,2) DEFAULT 0.00,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  company TEXT,
  client_type TEXT DEFAULT 'Individual', -- Individual, Corporation, Non-Profit
  contact_person TEXT, -- for corporate clients
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Case Status lookup
CREATE TABLE IF NOT EXISTS case_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280' -- Tailwind gray-500
);

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_id INTEGER NOT NULL,
  primary_officer_id INTEGER NOT NULL,
  status_id INTEGER NOT NULL,
  case_type TEXT NOT NULL, -- Civil, Criminal, Corporate, Family, etc.
  priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Urgent
  court_name TEXT,
  judge_name TEXT,
  opposing_party TEXT,
  opposing_counsel TEXT,
  case_value DECIMAL(15,2) DEFAULT 0.00,
  filing_date DATE,
  statute_of_limitations DATE,
  summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (primary_officer_id) REFERENCES officers(id),
  FOREIGN KEY (status_id) REFERENCES case_statuses(id)
);

-- Case Officers assignment (many-to-many)
CREATE TABLE IF NOT EXISTS case_officers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  officer_id INTEGER NOT NULL,
  role TEXT DEFAULT 'Associate', -- Lead, Associate, Paralegal, Consultant
  assigned_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (officer_id) REFERENCES officers(id),
  UNIQUE(case_id, officer_id)
);

-- Deadlines and Important Dates
CREATE TABLE IF NOT EXISTS case_deadlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,
  priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
  type TEXT DEFAULT 'General', -- Filing, Discovery, Hearing, Trial, Appeal, etc.
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATETIME,
  reminder_days INTEGER DEFAULT 7, -- Days before due date to remind
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES officers(id)
);

-- Hearings and Court Dates
CREATE TABLE IF NOT EXISTS hearings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  hearing_type TEXT NOT NULL, -- Arraignment, Preliminary, Motion, Trial, Settlement Conference, etc.
  court_name TEXT NOT NULL,
  courtroom TEXT,
  judge_name TEXT,
  hearing_date DATE NOT NULL,
  hearing_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  notes TEXT,
  preparation_notes TEXT,
  outcome TEXT,
  next_hearing_id INTEGER, -- Link to follow-up hearing
  attending_officers TEXT, -- JSON array of officer IDs
  status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled, Postponed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (next_hearing_id) REFERENCES hearings(id)
);

-- Financial Management - Retainers
CREATE TABLE IF NOT EXISTS retainers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  received_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'Check', -- Check, Wire, Credit Card, Cash
  reference_number TEXT,
  notes TEXT,
  trust_account BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Time Entries and Billable Hours
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  officer_id INTEGER NOT NULL,
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  hours DECIMAL(4,2) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  billable BOOLEAN DEFAULT TRUE,
  billed BOOLEAN DEFAULT FALSE,
  task_type TEXT DEFAULT 'Legal Research', -- Legal Research, Court Appearance, Client Meeting, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (officer_id) REFERENCES officers(id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  officer_id INTEGER,
  expense_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- Court Fees, Travel, Copies, Research, Expert Witness, etc.
  receipt_number TEXT,
  billable BOOLEAN DEFAULT TRUE,
  billed BOOLEAN DEFAULT FALSE,
  reimbursable BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (officer_id) REFERENCES officers(id)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(15,2) DEFAULT 0.00,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(15,2) DEFAULT 0.00,
  status TEXT DEFAULT 'Draft', -- Draft, Sent, Paid, Overdue, Cancelled
  payment_terms TEXT DEFAULT 'Net 30',
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (created_by) REFERENCES officers(id)
);

-- Documents and Files
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL, -- Contract, Pleading, Motion, Evidence, Correspondence, etc.
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT,
  version INTEGER DEFAULT 1,
  tags TEXT, -- JSON array of tags
  confidential BOOLEAN DEFAULT FALSE,
  uploaded_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES officers(id)
);

-- Case Notes and Updates
CREATE TABLE IF NOT EXISTS case_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'General', -- General, Client Communication, Court Update, Strategy, etc.
  priority TEXT DEFAULT 'Normal', -- Low, Normal, High
  confidential BOOLEAN DEFAULT FALSE,
  author_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES officers(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_primary_officer_id ON cases(primary_officer_id);
CREATE INDEX IF NOT EXISTS idx_cases_status_id ON cases(status_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_case_deadlines_case_id ON case_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_case_deadlines_due_date ON case_deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_hearings_case_id ON hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_hearings_hearing_date ON hearings(hearing_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_case_id ON time_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_officer_id ON time_entries(officer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_case_id ON expenses(case_id);
CREATE INDEX IF NOT EXISTS idx_invoices_case_id ON invoices(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_officers_email ON officers(email);