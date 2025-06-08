/*
  # Create tenant_documents table

  1. New Tables
    - `tenant_documents`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `tenant_id` (uuid, foreign key)
      - `document_type` (text)
      - `file_url` (text)
      - `expiration_date` (timestamp)
      - `notes` (text)
      - `company_id` (uuid, foreign key)

  2. Security
    - Enable RLS on tenant_documents table
    - Add policies for company access
    - Add policies for platform admin access
*/

CREATE TABLE IF NOT EXISTS tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  expiration_date TIMESTAMPTZ,
  notes TEXT,
  company_id UUID NOT NULL REFERENCES companies(id)
);

ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their tenant documents"
  ON tenant_documents
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Company admins can manage tenant documents"
  ON tenant_documents
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = tenant_documents.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = tenant_documents.company_id));

CREATE POLICY "Platform admins have full access to tenant documents"
  ON tenant_documents
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE INDEX idx_tenant_documents_tenant_id ON tenant_documents(tenant_id);
CREATE INDEX idx_tenant_documents_company_id ON tenant_documents(company_id);