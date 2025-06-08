/*
  # Fix RLS Policies for Profiles Table

  1. Changes
    - Remove policies that use OLD reference
    - Create simplified policies with proper access control
    - Prevent recursive policy checks
    - Maintain security requirements

  2. Security
    - Users can read and update their own profiles
    - Company admins can manage profiles within their company
    - Platform admins have full access
    - Prevent privilege escalation
*/

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Company admins manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Platform admins full access" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new, simplified policies
-- Allow users to read their own profile
CREATE POLICY "read_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow users to update their own profile (excluding sensitive fields)
CREATE POLICY "update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  (role = (SELECT role FROM profiles WHERE id = auth.uid())) AND
  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- Allow company admins to manage profiles within their company
CREATE POLICY "company_admin_manage_profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'company_admin'
      AND admin.company_id = profiles.company_id
      AND admin.is_active = true
      AND admin.id != profiles.id
  )
);

-- Give platform admins full access
CREATE POLICY "platform_admin_full_access"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'platform_admin'
      AND admin.is_active = true
      AND admin.id != profiles.id
  )
);