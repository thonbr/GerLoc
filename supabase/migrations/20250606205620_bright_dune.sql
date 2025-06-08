-- Add policy to allow company users to update vehicles for their company
CREATE POLICY "Company users can update vehicles for their company"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id IS NOT NULL
    )
  );

-- Add policy to allow company users to delete vehicles for their company
CREATE POLICY "Company users can delete vehicles for their company"
  ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id IS NOT NULL
    )
  );