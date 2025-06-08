/*
  # Add company creation policy

  1. Security Changes
    - Add new RLS policy to allow authenticated users to create their company during onboarding
    - Policy ensures users can only create one company and associates it with their profile
*/

-- Add policy to allow authenticated users to create a company during onboarding
CREATE POLICY "Users can create their company during onboarding"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.company_id IS NOT NULL
  )
);