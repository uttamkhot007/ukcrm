-- Add new team types to the team_type enum
ALTER TYPE team_type ADD VALUE IF NOT EXISTS 'mss';
ALTER TYPE team_type ADD VALUE IF NOT EXISTS 'offensive';