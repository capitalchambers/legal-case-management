-- Fix user passwords with correct hashes
-- Generated using our SHA-256 + salt function

-- Update admin password (admin123)
UPDATE users SET password_hash = 'c207d137050e72784abcc8da4a3b78630d0ff369f9db353bd1121b39face9587' WHERE username = 'admin';

-- Update lawyer passwords (lawyer123)  
UPDATE users SET password_hash = '96283dc77bcc7aebab18330931fc41507521b6d21956a28bb890447b36584d60' WHERE username = 'sarah.johnson';
UPDATE users SET password_hash = '96283dc77bcc7aebab18330931fc41507521b6d21956a28bb890447b36584d60' WHERE username = 'michael.chen';
UPDATE users SET password_hash = '96283dc77bcc7aebab18330931fc41507521b6d21956a28bb890447b36584d60' WHERE username = 'emily.rodriguez';

-- Update paralegal password (paralegal123)
UPDATE users SET password_hash = '84da40520ffd0c775da74efcd165a9960bd340ebbfd827cbd1c63f2a4bbdbc45' WHERE username = 'david.kim';