/*
  # Add payments table and audit logging triggers

  1. New Tables
    - `payments`: Store payment transactions
    - Add triggers for audit logging on key tables
    
  2. Security
    - Enable RLS on payments table
    - Add policies for company access
    - Add policies for platform admin access
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  company_id uuid NOT NULL REFERENCES companies(id),
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text NOT NULL,
  stripe_payment_id text,
  stripe_invoice_id text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Create policies for payments table
CREATE POLICY "Company users can view their payments"
ON payments
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Platform admins have full access to payments"
ON payments
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'platform_admin')
WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

-- Create audit log triggers
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  user_id uuid;
  company_id uuid;
  details jsonb;
BEGIN
  -- Get current user ID from auth.uid()
  user_id := auth.uid();
  
  -- Get company_id based on the table
  IF TG_TABLE_NAME = 'companies' THEN
    company_id := NEW.id;
  ELSIF TG_TABLE_NAME IN ('vehicles', 'contracts', 'payments') THEN
    company_id := NEW.company_id;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    company_id := NEW.company_id;
  END IF;

  -- Build details JSON based on operation
  IF (TG_OP = 'DELETE') THEN
    details := jsonb_build_object('old_data', row_to_json(OLD)::jsonb);
  ELSIF (TG_OP = 'UPDATE') THEN
    details := jsonb_build_object(
      'old_data', row_to_json(OLD)::jsonb,
      'new_data', row_to_json(NEW)::jsonb,
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_to_json(NEW)::jsonb)
        WHERE NOT row_to_json(OLD)::jsonb ? key
           OR row_to_json(OLD)::jsonb->key != value
      )
    );
  ELSE
    details := jsonb_build_object('new_data', row_to_json(NEW)::jsonb);
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    company_id,
    action_type,
    resource_id,
    details
  ) VALUES (
    user_id,
    company_id,
    CASE
      WHEN TG_OP = 'INSERT' THEN TG_TABLE_NAME || '_created'
      WHEN TG_OP = 'UPDATE' THEN TG_TABLE_NAME || '_updated'
      WHEN TG_OP = 'DELETE' THEN TG_TABLE_NAME || '_deleted'
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    details
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;