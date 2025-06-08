/*
  # Add Vehicle Insert Policy for Company Users

  1. Security Changes
    - Add RLS policy to allow company users to insert vehicles for their own company
    - Ensures users can only add vehicles to their own company

  This migration adds a missing INSERT policy for company users on the vehicles table.
  Previously, only company admins could insert vehicles, but regular company users
  should also be able to add vehicles to their company's fleet.
*/

-- Add policy to allow company users to insert vehicles for their own company
CREATE POLICY "Company users can insert vehicles for their company"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id IS NOT NULL
    )
  );