/*
  # Create suppliers table

  1. New Tables
    - `suppliers`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `company_id` (uuid, foreign key)
      - `name` (text)
      - `contact_person` (text)
      - `phone` (text)
      - `email` (text)
      - `address` (text)
      - `services_provided` (text)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on suppliers table
    - Add policies for company access
    - Add policies for platform admin access
*/

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  services_provided TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their suppliers"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Company admins can manage suppliers"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = suppliers.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = suppliers.company_id));

CREATE POLICY "Platform admins have full access to suppliers"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE INDEX idx_suppliers_company_id ON suppliers(company_id);