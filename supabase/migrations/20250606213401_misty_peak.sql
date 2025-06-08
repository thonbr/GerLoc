/*
  # Create trackers table

  1. New Tables
    - `trackers`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `vehicle_id` (uuid, foreign key)
      - `serial_number` (text)
      - `provider` (text)
      - `status` (text)
      - `company_id` (uuid, foreign key)

  2. Security
    - Enable RLS on trackers table
    - Add policies for company access
    - Add policies for platform admin access
*/

CREATE TABLE IF NOT EXISTS trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL UNIQUE,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  company_id UUID NOT NULL REFERENCES companies(id)
);

ALTER TABLE trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their vehicle trackers"
  ON trackers
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Company admins can manage vehicle trackers"
  ON trackers
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = trackers.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = trackers.company_id));

CREATE POLICY "Platform admins have full access to trackers"
  ON trackers
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE INDEX idx_trackers_vehicle_id ON trackers(vehicle_id);
CREATE INDEX idx_trackers_company_id ON trackers(company_id);