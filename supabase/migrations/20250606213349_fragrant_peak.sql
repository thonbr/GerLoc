/*
  # Create maintenances table

  1. New Tables
    - `maintenances`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `vehicle_id` (uuid, foreign key)
      - `maintenance_type` (text)
      - `date` (timestamp)
      - `cost` (numeric)
      - `description` (text)
      - `supplier_id` (uuid, foreign key)
      - `parts_used` (jsonb)
      - `company_id` (uuid, foreign key)

  2. Security
    - Enable RLS on maintenances table
    - Add policies for company access
    - Add policies for platform admin access
*/

CREATE TABLE IF NOT EXISTS maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  cost NUMERIC,
  description TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  parts_used JSONB DEFAULT '{}'::jsonb,
  company_id UUID NOT NULL REFERENCES companies(id)
);

ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their vehicle maintenances"
  ON maintenances
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Company admins can manage vehicle maintenances"
  ON maintenances
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = maintenances.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = maintenances.company_id));

CREATE POLICY "Platform admins have full access to maintenances"
  ON maintenances
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE INDEX idx_maintenances_vehicle_id ON maintenances(vehicle_id);
CREATE INDEX idx_maintenances_company_id ON maintenances(company_id);