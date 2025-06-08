/*
  # Create audit logs table

  1. New Tables
    - `audit_logs`: Stores system-wide audit events
      - User actions (login, logout, etc)
      - Resource changes (create, update, delete)
      - System events
  
  2. Security
    - Enable RLS
    - Company users can view their company's logs
    - Platform admins have full access
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles(id),
  company_id uuid REFERENCES companies(id),
  action_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  
  -- Add constraint to ensure either user_id or company_id is present
  CONSTRAINT audit_logs_actor_check CHECK (user_id IS NOT NULL OR company_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Company users can view their company's logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Platform admins have full access to audit logs"
ON audit_logs
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'platform_admin')
WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

-- Create indexes
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);