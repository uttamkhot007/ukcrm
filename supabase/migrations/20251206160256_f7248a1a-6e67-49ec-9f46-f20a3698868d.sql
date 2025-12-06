-- Add accounts and admin to the team_type enum
ALTER TYPE team_type ADD VALUE IF NOT EXISTS 'accounts';
ALTER TYPE team_type ADD VALUE IF NOT EXISTS 'admin';