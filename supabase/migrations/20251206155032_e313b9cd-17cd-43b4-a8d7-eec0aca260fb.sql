-- Add 'renewals' to the team_type enum
ALTER TYPE public.team_type ADD VALUE IF NOT EXISTS 'renewals';