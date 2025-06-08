/*
  # Create contracts table

  1. New Tables
    - `contracts`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `tenant_id` (uuid, FK to profiles)
      - `vehicle_id` (uuid, FK to vehicles)
      - `company_id` (uuid, FK to companies)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `status` (text: 'active', 'pending', 'completed', 'canceled')
      - `amount` (numeric)
      - `payment_status` (text: 'paid', 'pending', 'overdue')
      - `notes` (text)

  2. Constraints
    - Primary key on `id`
    - Foreign keys to `profiles`, `vehicles`, and `companies`
    - Check constraints on `status` and `payment_status`
    - `end_date` must be after `start_date`
    - `amount` must be >= 0

  3. Indexes
    - `company_id` for filtering by company
    - `status` for filtering by status
    - `payment_status` for filtering by payment status
    - `tenant_id` for filtering by tenant
    - `vehicle_id` for filtering by vehicle

  4. Security
    - Enable RLS
    - Policies for company users, company admins, and platform admins
*/

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  tenant_id uuid NOT NULL REFERENCES profiles(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'completed', 'canceled')),
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue')),
  notes text,
  CONSTRAINT end_date_after_start_date CHECK (end_date > start_date)
);

-- Enable Row Level Security
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_contracts_company_id ON contracts(company_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_payment_status ON contracts(payment_status);
CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX idx_contracts_vehicle_id ON contracts(vehicle_id);

-- Create policies
-- Company users can view contracts from their company
CREATE POLICY "Company users can view contracts"
ON contracts
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Company admins can manage contracts for their company
CREATE POLICY "Company admins can manage contracts"
ON contracts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'company_admin'
      AND profiles.company_id = contracts.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'company_admin'
      AND profiles.company_id = contracts.company_id
  )
);

-- Platform admins have full access
CREATE POLICY "Platform admins have full access to contracts"
ON contracts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
  )
);