import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Database functions replicating Supabase triggers
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_quotation_number() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN NEW.quotation_number := 'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_estimate_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.estimate_number := 'EST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_request_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    BEGIN NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_leave_request_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.request_number := 'LV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_expense_report_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.report_number := 'EXP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_travel_request_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.request_number := 'TRV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_tender_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.tender_number := 'TND-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_project_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.project_number := 'PRJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_asset_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.asset_number := 'AST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_applicant_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.applicant_number := 'APP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_support_ticket_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.ticket_number := 'SUP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION generate_voucher_number() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    DECLARE v_type RECORD;
    BEGIN
      SELECT * INTO v_type FROM voucher_types WHERE id = NEW.voucher_type_id;
      IF v_type.numbering_method = 'automatic' THEN
        UPDATE voucher_types SET current_number = current_number + 1 WHERE id = NEW.voucher_type_id;
        SELECT current_number INTO v_type.current_number FROM voucher_types WHERE id = NEW.voucher_type_id;
        NEW.voucher_number := COALESCE(v_type.prefix, v_type.abbreviation) || '-' || TO_CHAR(NEW.voucher_date, 'YYYYMMDD') || '-' || LPAD(v_type.current_number::TEXT, 4, '0');
      END IF;
      RETURN NEW;
    END; $$;

    CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

    CREATE OR REPLACE FUNCTION set_ticket_sla() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
    BEGIN
      CASE NEW.priority WHEN 'critical' THEN NEW.sla_hours := 2; WHEN 'high' THEN NEW.sla_hours := 4; WHEN 'medium' THEN NEW.sla_hours := 8; WHEN 'low' THEN NEW.sla_hours := 24; ELSE NEW.sla_hours := 8; END CASE;
      NEW.sla_deadline := NOW() + (NEW.sla_hours || ' hours')::INTERVAL;
      RETURN NEW;
    END; $$;

    CREATE OR REPLACE FUNCTION update_ledger_balance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN UPDATE ledger_accounts SET current_balance = current_balance + NEW.debit_amount - NEW.credit_amount, updated_at = now() WHERE id = NEW.ledger_id;
      ELSIF TG_OP = 'DELETE' THEN UPDATE ledger_accounts SET current_balance = current_balance - OLD.debit_amount + OLD.credit_amount, updated_at = now() WHERE id = OLD.ledger_id;
      END IF; RETURN COALESCE(NEW, OLD);
    END; $$;

    CREATE OR REPLACE FUNCTION update_stock_quantity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    BEGIN
      UPDATE stock_items SET current_quantity = current_quantity + NEW.quantity_in - NEW.quantity_out,
        current_value = current_value + COALESCE(NEW.value, 0) * CASE WHEN NEW.quantity_in > 0 THEN 1 ELSE -1 END, updated_at = now()
      WHERE id = NEW.stock_item_id; RETURN NEW;
    END; $$;
  `);

  // Create triggers
  await knex.raw(`
    CREATE TRIGGER set_ticket_number BEFORE INSERT ON tickets FOR EACH ROW WHEN (NEW.ticket_number IS NULL) EXECUTE FUNCTION generate_ticket_number();
    CREATE TRIGGER set_quotation_number BEFORE INSERT ON quotations FOR EACH ROW WHEN (NEW.quotation_number IS NULL) EXECUTE FUNCTION generate_quotation_number();
    CREATE TRIGGER set_invoice_number BEFORE INSERT ON invoices FOR EACH ROW WHEN (NEW.invoice_number IS NULL) EXECUTE FUNCTION generate_invoice_number();
    CREATE TRIGGER set_estimate_number BEFORE INSERT ON estimates FOR EACH ROW WHEN (NEW.estimate_number IS NULL) EXECUTE FUNCTION generate_estimate_number();
    CREATE TRIGGER set_request_number BEFORE INSERT ON employee_requests FOR EACH ROW WHEN (NEW.request_number IS NULL) EXECUTE FUNCTION generate_request_number();
    CREATE TRIGGER set_leave_request_number BEFORE INSERT ON leave_requests FOR EACH ROW WHEN (NEW.request_number IS NULL) EXECUTE FUNCTION generate_leave_request_number();
    CREATE TRIGGER set_expense_report_number BEFORE INSERT ON expense_reports FOR EACH ROW WHEN (NEW.report_number IS NULL) EXECUTE FUNCTION generate_expense_report_number();
    CREATE TRIGGER set_travel_request_number BEFORE INSERT ON travel_requests FOR EACH ROW WHEN (NEW.request_number IS NULL) EXECUTE FUNCTION generate_travel_request_number();
    CREATE TRIGGER set_tender_number BEFORE INSERT ON tenders FOR EACH ROW WHEN (NEW.tender_number IS NULL) EXECUTE FUNCTION generate_tender_number();
    CREATE TRIGGER set_project_number BEFORE INSERT ON projects FOR EACH ROW WHEN (NEW.project_number IS NULL) EXECUTE FUNCTION generate_project_number();
    CREATE TRIGGER set_asset_number BEFORE INSERT ON assets FOR EACH ROW WHEN (NEW.asset_number IS NULL) EXECUTE FUNCTION generate_asset_number();
    CREATE TRIGGER set_applicant_number BEFORE INSERT ON job_applicants FOR EACH ROW WHEN (NEW.applicant_number IS NULL) EXECUTE FUNCTION generate_applicant_number();
    CREATE TRIGGER set_support_ticket_number BEFORE INSERT ON customer_support_tickets FOR EACH ROW EXECUTE FUNCTION generate_support_ticket_number();
    CREATE TRIGGER set_voucher_number BEFORE INSERT ON vouchers FOR EACH ROW WHEN (NEW.voucher_number IS NULL) EXECUTE FUNCTION generate_voucher_number();
    CREATE TRIGGER set_ticket_sla_trigger BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION set_ticket_sla();
    CREATE TRIGGER update_ledger_on_entry AFTER INSERT OR DELETE ON voucher_entries FOR EACH ROW EXECUTE FUNCTION update_ledger_balance();
    CREATE TRIGGER update_stock_on_ledger AFTER INSERT ON stock_ledger FOR EACH ROW EXECUTE FUNCTION update_stock_quantity();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION IF EXISTS generate_ticket_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_quotation_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_invoice_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_estimate_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_request_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_leave_request_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_expense_report_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_travel_request_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_tender_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_project_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_asset_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_applicant_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_support_ticket_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS generate_voucher_number CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS set_ticket_sla CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS update_ledger_balance CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS update_stock_quantity CASCADE');
}
