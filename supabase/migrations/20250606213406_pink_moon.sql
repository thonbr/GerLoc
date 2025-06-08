/*
  # Create insurances table

  1. New Tables
    - `insurances`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `vehicle_id` (uuid, foreign key)
      - `policy_number` (text)
      - `provider` (text)
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `value` (numeric)
      - `company_id` (uuid, foreign key)

  2. Security
    - Enable RLS on insurances table
    - Add policies for company access
    - Add policies for platform admin access
*/

CREATE TABLE IF NOT EXISTS insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL UNIQUE,
  provider TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  value NUMERIC NOT NULL CHECK (value >= 0),
  company_id UUID NOT NULL REFERENCES companies(id)
);

ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their vehicle insurances"
  ON insurances
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Company admins can manage vehicle insurances"
  ON insurances
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = insurances.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = insurances.company_id));

CREATE POLICY "Platform admins have full access to insurances"
  ON insurances
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE INDEX idx_insurances_vehicle_id ON insurances(vehicle_id);
CREATE INDEX idx_insurances_company_id ON insurances(company_id);