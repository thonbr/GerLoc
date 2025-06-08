/*
  # Create vehicle_documents table

  1. New Tables
    - `vehicle_documents`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `vehicle_id` (uuid, foreign key)
      - `document_type` (text)
      - `file_url` (text)
      - `expiration_date` (timestamp)
      - `notes` (text)
      - `company_id` (uuid, foreign key)

  2. Security
    - Enable RLS on vehicle_documents table
    - Add policies for company access
    - Add policies for platform admin access
*/

CREATE TABLE IF NOT EXISTS vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  expiration_date TIMESTAMPTZ,
  notes TEXT,
  company_id UUID NOT NULL REFERENCES companies(id)
);

ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their vehicle documents"
  ON vehicle_documents
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Company admins can manage vehicle documents"
  ON vehicle_documents
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = vehicle_documents.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = vehicle_documents.company_id));

CREATE POLICY "Platform admins have full access to vehicle documents"
  ON vehicle_documents
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE INDEX idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_company_id ON vehicle_documents(company_id);