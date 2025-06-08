/*
  # Create vehicles table and policies

  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `brand` (text)
      - `model` (text)
      - `year` (integer)
      - `plate` (text)
      - `status` (text)
      - `company_id` (uuid, foreign key)
      - `daily_rate` (numeric)
      - `mileage` (integer)
      - `last_maintenance` (timestamp)
      - `next_maintenance` (timestamp)
      - `notes` (text)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS
    - Add policies for company access
    - Add policies for platform admin access

  3. Indexes
    - Create indexes for better query performance
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  plate text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')),
  company_id uuid NOT NULL REFERENCES companies(id),
  daily_rate numeric NOT NULL CHECK (daily_rate >= 0),
  mileage integer DEFAULT 0,
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Add constraint to ensure next_maintenance is after last_maintenance
  CONSTRAINT next_maintenance_after_last CHECK (next_maintenance > last_maintenance)
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Company users can view their company's vehicles"
ON vehicles
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Company admins can manage their company's vehicles"
ON vehicles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'company_admin'
      AND profiles.company_id = vehicles.company_id
  )
);

CREATE POLICY "Platform admins have full access to vehicles"
ON vehicles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
  )
);

-- Create indexes
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);