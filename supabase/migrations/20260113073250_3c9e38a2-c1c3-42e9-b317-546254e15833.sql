-- Add missing stage values to the deal_stage enum
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'qualified' AFTER 'pipeline';
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'proposal' AFTER 'qualified';
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'negotiation' AFTER 'proposal';