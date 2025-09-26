-- Legal Case Management System - Seed Data

-- Insert case statuses
INSERT OR IGNORE INTO case_statuses (name, description, color) VALUES 
  ('New', 'Newly opened case', '#3B82F6'),
  ('Active', 'Case is actively being worked on', '#10B981'),
  ('On Hold', 'Case temporarily paused', '#F59E0B'),
  ('Settled', 'Case resolved through settlement', '#8B5CF6'),
  ('Won', 'Case resolved in favor of client', '#10B981'),
  ('Lost', 'Case resolved against client', '#EF4444'),
  ('Closed', 'Case closed', '#6B7280');

-- Insert sample officers
INSERT OR IGNORE INTO officers (name, email, phone, position, specialization, hourly_rate) VALUES 
  ('Sarah Johnson', 'sarah.johnson@lawfirm.com', '(555) 123-4567', 'Senior Partner', 'Corporate Law', 850.00),
  ('Michael Chen', 'michael.chen@lawfirm.com', '(555) 234-5678', 'Associate', 'Criminal Defense', 450.00),
  ('Emily Rodriguez', 'emily.rodriguez@lawfirm.com', '(555) 345-6789', 'Senior Associate', 'Family Law', 650.00),
  ('David Thompson', 'david.thompson@lawfirm.com', '(555) 456-7890', 'Paralegal', 'General Practice', 125.00),
  ('Jessica Williams', 'jessica.williams@lawfirm.com', '(555) 567-8901', 'Partner', 'Civil Litigation', 750.00);

-- Insert sample clients
INSERT OR IGNORE INTO clients (name, email, phone, address, company, client_type, contact_person) VALUES 
  ('Robert Smith', 'robert.smith@email.com', '(555) 111-2222', '123 Main St, Anytown, ST 12345', NULL, 'Individual', NULL),
  ('TechCorp Industries', 'legal@techcorp.com', '(555) 222-3333', '456 Corporate Blvd, Business City, ST 67890', 'TechCorp Industries', 'Corporation', 'John Miller'),
  ('Maria Garcia', 'maria.garcia@email.com', '(555) 333-4444', '789 Oak Ave, Hometown, ST 11111', NULL, 'Individual', NULL),
  ('Green Energy Solutions', 'contracts@greenenergy.com', '(555) 444-5555', '321 Green Way, Eco City, ST 22222', 'Green Energy Solutions', 'Corporation', 'Lisa Park'),
  ('James Wilson', 'james.wilson@email.com', '(555) 555-6666', '654 Pine St, Lakeside, ST 33333', NULL, 'Individual', NULL);

-- Insert sample cases
INSERT OR IGNORE INTO cases (case_number, title, description, client_id, primary_officer_id, status_id, case_type, priority, court_name, case_value, filing_date, summary) VALUES 
  ('2024-CV-001', 'Smith v. Insurance Co.', 'Personal injury claim from automobile accident', 1, 2, 2, 'Civil Litigation', 'High', 'Superior Court of State', 125000.00, '2024-01-15', 'Client suffered injuries in rear-end collision. Seeking compensation for medical expenses and lost wages.'),
  ('2024-CR-002', 'State v. Garcia', 'Criminal defense - DUI charge', 3, 2, 2, 'Criminal Defense', 'Medium', 'Municipal Court', 0.00, '2024-02-20', 'First-time DUI offense. Negotiating plea agreement and license retention.'),
  ('2024-CO-003', 'TechCorp Acquisition', 'Corporate acquisition due diligence', 2, 1, 2, 'Corporate Law', 'High', NULL, 2500000.00, '2024-01-30', 'Representing TechCorp in acquisition of smaller competitor. Complex IP and employment issues.'),
  ('2024-FA-004', 'Wilson Divorce', 'Contested divorce with child custody', 5, 3, 2, 'Family Law', 'Medium', 'Family Court', 0.00, '2024-03-01', 'High-conflict divorce involving custody of two minor children and division of substantial assets.'),
  ('2024-CO-005', 'Green Energy Contract Dispute', 'Breach of contract claim', 4, 5, 1, 'Civil Litigation', 'High', 'Commercial Court', 750000.00, '2024-03-15', 'Supplier failed to deliver solar panels on time, causing project delays and financial losses.');

-- Assign additional officers to cases
INSERT OR IGNORE INTO case_officers (case_id, officer_id, role) VALUES 
  (1, 4, 'Paralegal'),  -- Smith case
  (2, 4, 'Paralegal'),  -- Garcia case
  (3, 3, 'Associate'),  -- TechCorp case
  (3, 4, 'Paralegal'),  -- TechCorp case
  (4, 4, 'Paralegal'),  -- Wilson case
  (5, 2, 'Associate');  -- Green Energy case

-- Insert sample deadlines
INSERT OR IGNORE INTO case_deadlines (case_id, title, description, due_date, priority, type, created_by) VALUES 
  (1, 'Discovery Deadline', 'Complete all discovery requests and depositions', '2024-12-15', 'High', 'Discovery', 2),
  (1, 'Expert Witness Disclosure', 'Disclose expert witnesses and reports', '2024-11-30', 'Medium', 'Discovery', 2),
  (2, 'Pre-trial Conference', 'Attend pre-trial conference with prosecutor', '2024-11-20', 'High', 'Hearing', 2),
  (3, 'Due Diligence Review', 'Complete financial and legal due diligence', '2024-12-01', 'High', 'General', 1),
  (4, 'Custody Evaluation', 'Submit custody evaluation report', '2024-11-25', 'High', 'Filing', 3),
  (5, 'Mediation Session', 'Mandatory mediation before trial', '2024-12-10', 'Medium', 'Hearing', 5);

-- Insert sample hearings
INSERT OR IGNORE INTO hearings (case_id, title, hearing_type, court_name, hearing_date, hearing_time, judge_name, attending_officers, status) VALUES 
  (1, 'Case Management Conference', 'Case Management', 'Superior Court of State', '2024-11-15', '09:00', 'Judge Anderson', '[2, 4]', 'Scheduled'),
  (2, 'Arraignment', 'Arraignment', 'Municipal Court', '2024-11-08', '14:00', 'Judge Roberts', '[2]', 'Scheduled'),
  (3, 'Status Conference', 'Status Conference', 'Commercial Court', '2024-12-05', '10:30', 'Judge Thompson', '[1, 3]', 'Scheduled'),
  (4, 'Custody Hearing', 'Custody Hearing', 'Family Court', '2024-12-12', '09:30', 'Judge Martinez', '[3, 4]', 'Scheduled'),
  (5, 'Motion to Dismiss Hearing', 'Motion Hearing', 'Commercial Court', '2024-11-22', '11:00', 'Judge Lee', '[5, 2]', 'Scheduled');

-- Insert sample retainers
INSERT OR IGNORE INTO retainers (case_id, client_id, amount, received_date, payment_method, reference_number) VALUES 
  (1, 1, 15000.00, '2024-01-15', 'Check', 'CHK-001234'),
  (2, 3, 5000.00, '2024-02-20', 'Credit Card', 'CC-567890'),
  (3, 2, 75000.00, '2024-01-30', 'Wire Transfer', 'WIRE-789012'),
  (4, 5, 10000.00, '2024-03-01', 'Check', 'CHK-345678'),
  (5, 4, 25000.00, '2024-03-15', 'Wire Transfer', 'WIRE-901234');

-- Insert sample time entries
INSERT OR IGNORE INTO time_entries (case_id, officer_id, entry_date, hours, rate, description, task_type) VALUES 
  (1, 2, '2024-10-01', 2.5, 450.00, 'Initial client consultation and case evaluation', 'Client Meeting'),
  (1, 2, '2024-10-02', 4.0, 450.00, 'Review medical records and police reports', 'Document Review'),
  (1, 4, '2024-10-03', 1.5, 125.00, 'Organize case file and create document index', 'Administrative'),
  (2, 2, '2024-10-01', 1.0, 450.00, 'Client consultation on DUI charges', 'Client Meeting'),
  (3, 1, '2024-10-01', 6.0, 850.00, 'Contract review and due diligence planning', 'Legal Research'),
  (3, 3, '2024-10-02', 3.0, 650.00, 'Employment law compliance review', 'Legal Research'),
  (4, 3, '2024-10-01', 2.0, 650.00, 'Initial divorce consultation', 'Client Meeting'),
  (5, 5, '2024-10-01', 3.5, 750.00, 'Contract analysis and breach assessment', 'Legal Research');

-- Insert sample expenses
INSERT OR IGNORE INTO expenses (case_id, officer_id, expense_date, amount, description, category, receipt_number) VALUES 
  (1, 2, '2024-10-01', 125.50, 'Court filing fees for personal injury lawsuit', 'Court Fees', 'RCPT-001'),
  (1, 2, '2024-10-02', 45.75, 'Copies of medical records', 'Copies', 'RCPT-002'),
  (2, 2, '2024-10-01', 75.00, 'Criminal court filing fees', 'Court Fees', 'RCPT-003'),
  (3, 1, '2024-10-01', 2500.00, 'Financial audit by CPA firm', 'Expert Witness', 'RCPT-004'),
  (4, 3, '2024-10-01', 1200.00, 'Child custody evaluation', 'Expert Witness', 'RCPT-005'),
  (5, 5, '2024-10-01', 350.00, 'Engineering expert consultation', 'Expert Witness', 'RCPT-006');

-- Insert sample case notes
INSERT OR IGNORE INTO case_notes (case_id, title, content, note_type, author_id) VALUES 
  (1, 'Initial Case Assessment', 'Client has strong case based on clear liability. Defendant ran red light and rear-ended client. Medical expenses currently at $12,000 with ongoing treatment expected.', 'Strategy', 2),
  (1, 'Client Communication', 'Spoke with client about treatment progress. Physical therapy going well. Expects to return to work next month.', 'Client Communication', 2),
  (2, 'Prosecution Meeting', 'Met with DA office. They are open to plea agreement for reckless driving if client completes alcohol education program.', 'Court Update', 2),
  (3, 'Due Diligence Update', 'Financial records look clean. Need to review employee contracts and IP assignments more carefully.', 'General', 1),
  (4, 'Custody Concerns', 'Client concerned about ex-spouse\'s drinking. Need to investigate and possibly request supervised visitation.', 'Strategy', 3),
  (5, 'Mediation Prep', 'Client willing to settle for 80% of claimed damages if defendant covers all legal fees.', 'Strategy', 5);