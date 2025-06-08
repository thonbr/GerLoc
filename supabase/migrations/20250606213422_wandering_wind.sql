/*
  # Create expenses table

  1. New Tables
    - `expenses`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `company_id` (uuid, foreign key)
      - `date` (timestamp)
      - `amount` (numeric)
      - `description` (text)
      - `category` (text)
      - `notes` (text)
      - `vehicle_id` (uuid, foreign key, optional)
      - `contract_id` (uuid, foreign key, optional)

  2. Security
    - Enable RLS on expenses table
    - Add policies for company access
    - Add policies for platform admin access
*/

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  description TEXT,
  category TEXT NOT NULL,
  notes TEXT,
  vehicle_id UUID REFERENCES vehicles(id),
  contract_id UUID REFERENCES contracts(id)
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Company admins can manage expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = expenses.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'company_admin' AND profiles.company_id = expenses.company_id));

CREATE POLICY "Platform admins have full access to expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE INDEX idx_expenses_company_id ON expenses(company_id);
CREATE INDEX idx_expenses_vehicle_id ON expenses(vehicle_id);
CREATE INDEX idx_expenses_contract_id ON expenses(contract_id);