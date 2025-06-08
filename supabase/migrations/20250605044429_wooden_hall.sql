/*
  # Add missing RLS policies

  1. Changes
    - Add policy to allow inserting audit logs for authenticated users
    - Add policy to allow creating companies during onboarding
    - Add policy to allow updating profiles during onboarding

  2. Security
    - Maintains existing RLS policies
    - Adds targeted policies for specific operations
    - Ensures users can only create one company
*/

-- Allow authenticated users to insert audit logs
CREATE POLICY "Users can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to create companies during onboarding
CREATE POLICY "Users can create company during onboarding"
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

-- Allow users to update their profile during onboarding
CREATE POLICY "Users can update their profile during onboarding"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());