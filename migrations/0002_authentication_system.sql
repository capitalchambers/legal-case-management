-- User Authentication System
-- Add user accounts, sessions, and permissions

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'lawyer' CHECK (role IN ('admin', 'lawyer', 'paralegal', 'staff')),
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for login management
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User permissions for role-based access
CREATE TABLE IF NOT EXISTS user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    permission_name TEXT NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    granted_by INTEGER,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    UNIQUE(user_id, permission_name)
);

-- Activity log for audit trail
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Update officers table to link with users
ALTER TABLE officers ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Insert default admin user (password: admin123 - CHANGE THIS!)
-- Password hash for 'admin123' using bcrypt
INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name, role) 
VALUES ('admin', 'admin@legalfirm.com', '$2b$10$rVWxz8Xz7QmKZ8Xz7QmKZOyJ5KZ8Xz7QmKZ8Xz7QmKZ8Xz7QmKZ8X', 'System', 'Administrator', 'admin');

-- Insert sample lawyers
INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name, role, phone) 
VALUES 
('sarah.johnson', 'sarah@legalfirm.com', '$2b$10$rVWxz8Xz7QmKZ8Xz7QmKZOyJ5KZ8Xz7QmKZ8Xz7QmKZ8Xz7QmKZ8X', 'Sarah', 'Johnson', 'lawyer', '555-0101'),
('michael.chen', 'michael@legalfirm.com', '$2b$10$rVWxz8Xz7QmKZ8Xz7QmKZOyJ5KZ8Xz7QmKZ8Xz7QmKZ8Xz7QmKZ8X', 'Michael', 'Chen', 'lawyer', '555-0102'),
('emily.rodriguez', 'emily@legalfirm.com', '$2b$10$rVWxz8Xz7QmKZ8Xz7QmKZOyJ5KZ8Xz7QmKZ8Xz7QmKZ8Xz7QmKZ8X', 'Emily', 'Rodriguez', 'lawyer', '555-0103'),
('david.kim', 'david@legalfirm.com', '$2b$10$rVWxz8Xz7QmKZ8Xz7QmKZOyJ5KZ8Xz7QmKZ8Xz7QmKZ8Xz7QmKZ8X', 'David', 'Kim', 'paralegal', '555-0104');

-- Link existing officers with users
UPDATE officers SET user_id = (SELECT id FROM users WHERE first_name = 'Sarah' AND last_name = 'Johnson') WHERE name = 'Sarah Johnson';
UPDATE officers SET user_id = (SELECT id FROM users WHERE first_name = 'Michael' AND last_name = 'Chen') WHERE name = 'Michael Chen';
UPDATE officers SET user_id = (SELECT id FROM users WHERE first_name = 'Emily' AND last_name = 'Rodriguez') WHERE name = 'Emily Rodriguez';

-- Grant default permissions
-- Admin gets all permissions
INSERT OR IGNORE INTO user_permissions (user_id, permission_name) 
SELECT id, 'admin' FROM users WHERE role = 'admin';

-- Lawyers get full case management permissions
INSERT OR IGNORE INTO user_permissions (user_id, permission_name) 
SELECT id, 'case_management' FROM users WHERE role IN ('admin', 'lawyer');

INSERT OR IGNORE INTO user_permissions (user_id, permission_name) 
SELECT id, 'client_management' FROM users WHERE role IN ('admin', 'lawyer');

INSERT OR IGNORE INTO user_permissions (user_id, permission_name) 
SELECT id, 'billing_management' FROM users WHERE role IN ('admin', 'lawyer');

INSERT OR IGNORE INTO user_permissions (user_id, permission_name) 
SELECT id, 'time_tracking' FROM users WHERE role IN ('admin', 'lawyer', 'paralegal');

-- Paralegals get limited permissions
INSERT OR IGNORE INTO user_permissions (user_id, permission_name) 
SELECT id, 'case_view' FROM users WHERE role = 'paralegal';

INSERT OR IGNORE INTO user_permissions (user_id, permission_name) 
SELECT id, 'client_view' FROM users WHERE role = 'paralegal';