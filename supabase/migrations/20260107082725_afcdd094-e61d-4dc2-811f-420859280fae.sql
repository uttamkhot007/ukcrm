-- Add missing solution_description column to tender_workspaces table
ALTER TABLE public.tender_workspaces 
ADD COLUMN IF NOT EXISTS solution_description TEXT;