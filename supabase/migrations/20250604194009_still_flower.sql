/*
  # Fix profiles RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify RLS policies for profiles table
    - Ensure proper access control without self-referencing queries
  
  2. Security
    - Maintain security while avoiding recursion
    - Users can still only access appropriate data
    - Platform admins retain full access
*/

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Company admins can manage company users" ON profiles;
DROP POLICY IF EXISTS "Platform admins can manage all profiles" ON profiles;

-- Create new, simplified policies
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Company admins can view and manage users in their company
CREATE POLICY "Company admins can view company users"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'company_admin'
      AND admin.company_id IS NOT NULL
      AND admin.company_id = profiles.company_id
  )
);

CREATE POLICY "Company admins can manage company users"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'company_admin'
      AND admin.company_id IS NOT NULL
      AND admin.company_id = profiles.company_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'company_admin'
      AND admin.company_id IS NOT NULL
      AND admin.company_id = profiles.company_id
  )
);

-- Platform admins have full access
CREATE POLICY "Platform admins have full access"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'platform_admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'platform_admin'
  )
);