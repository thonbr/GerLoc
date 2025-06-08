/*
  # Create fines table

  1. New Tables
    - `fines`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `vehicle_id` (uuid, foreign key)
      - `date` (timestamp)
      - `amount` (numeric)
      - `description` (text)
      - `payment_status` (text)
      - `company_id` (uuid, foreign key)

  2. Security
    - Enable RLS on fines table
    - Add policies for company access
    - Add policies for platform admin access
*/

CREATE TABLE IF NOT EXISTS fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  description TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'disputed')),
  company_id UUID NOT NULL REFERENCES companies(id)
);

ALTER TABLE fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their vehicle fines"
  ON fines
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Company admins can manage vehicle fines"
  ON fines
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = fines.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = fines.company_id));

CREATE POLICY "Platform admins have full access to fines"
  ON fines
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE INDEX idx_fines_vehicle_id ON fines(vehicle_id);
CREATE INDEX idx_fines_company_id ON fines(company_id);