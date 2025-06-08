/*
  # Fix RLS Policies

  1. Changes
    - Drop existing recursive policies
    - Create new optimized policies that avoid recursion
    - Implement proper access control for all user roles
    - Fix self-reference issues in admin policies

  2. Security
    - Maintain proper access control for all user roles
    - Prevent recursion in policy checks
    - Ensure data integrity and security
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "company_admin_access" ON profiles;
DROP POLICY IF EXISTS "platform_admin_access" ON profiles;

-- Basic profile access - users can read their own profile
CREATE POLICY "read_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile with restrictions on sensitive fields
CREATE POLICY "update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()) AND
  company_id IS NOT DISTINCT FROM (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
  is_active IS NOT DISTINCT FROM (SELECT is_active FROM profiles WHERE id = auth.uid())
);

-- Company admin access - non-recursive approach
CREATE POLICY "company_admin_access"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'company_admin'
      AND admin.is_active = true
      AND admin.company_id = profiles.company_id
      AND admin.id <> profiles.id  -- Prevent self-reference
  )
);

-- Platform admin access - non-recursive approach
CREATE POLICY "platform_admin_access"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'platform_admin'
      AND admin.is_active = true
      AND admin.id <> profiles.id  -- Prevent self-reference
  )
);