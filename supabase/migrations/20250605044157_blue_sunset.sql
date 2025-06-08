-- Create triggers for all relevant tables
CREATE TRIGGER companies_audit
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER vehicles_audit
  AFTER INSERT OR UPDATE OR DELETE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER contracts_audit
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER profiles_audit
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();