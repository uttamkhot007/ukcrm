-- Add new closed_won substages for accounts workflow
ALTER TYPE closed_won_substage ADD VALUE IF NOT EXISTS 'request_odf';
ALTER TYPE closed_won_substage ADD VALUE IF NOT EXISTS 'process_order';
ALTER TYPE closed_won_substage ADD VALUE IF NOT EXISTS 'get_license';
ALTER TYPE closed_won_substage ADD VALUE IF NOT EXISTS 'raise_invoice';
ALTER TYPE closed_won_substage ADD VALUE IF NOT EXISTS 'collect_payment';