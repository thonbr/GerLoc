/*
  # Add audit triggers for new tables

  1. Changes
    - Add audit triggers for all new tables
    - Ensures all changes are logged for compliance
    
  2. Security
    - Maintains audit trail for all operations
    - Uses existing log_audit_event function
*/

CREATE TRIGGER maintenances_audit
  AFTER INSERT OR UPDATE OR DELETE ON maintenances
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER fines_audit
  AFTER INSERT OR UPDATE OR DELETE ON fines
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trackers_audit
  AFTER INSERT OR UPDATE OR DELETE ON trackers
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER insurances_audit
  AFTER INSERT OR UPDATE OR DELETE ON insurances
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER vehicle_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER tenant_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenant_documents
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER suppliers_audit
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER expenses_audit
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();