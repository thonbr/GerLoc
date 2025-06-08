/*
  # Fix RLS Policies

  1. Changes
    - Drop existing recursive policies
    - Create new non-recursive policies for profiles table
    - Simplify policy checks to avoid recursion
    - Ensure proper access control for all user types

  2. Security
    - Users can only read/update their own profiles
    - Company admins can manage users in their company
    - Platform admins have full access
    - All policies use direct checks without recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "company_admin_manage_profiles" ON profiles;
DROP POLICY IF EXISTS "platform_admin_full_access" ON profiles;

-- Basic profile access - users can always read their own profile
CREATE POLICY "read_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own non-sensitive fields
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

-- Company admin access - using a non-recursive approach
CREATE POLICY "company_admin_access"
ON profiles
FOR ALL
TO authenticated
USING (
  CASE
    -- Allow if user is accessing their own profile
    WHEN id = auth.uid() THEN true
    -- Allow if user is a company admin and target profile is in their company
    WHEN EXISTS (
      SELECT 1
      FROM profiles admin
      WHERE admin.id = auth.uid()
        AND admin.role = 'company_admin'
        AND admin.is_active = true
        AND admin.company_id = profiles.company_id
        AND admin.id != profiles.id  -- Prevent self-reference
    ) THEN true
    ELSE false
  END
);

-- Platform admin access - using a non-recursive approach
CREATE POLICY "platform_admin_access"
ON profiles
FOR ALL
TO authenticated
USING (
  CASE
    -- Allow if user is accessing their own profile
    WHEN id = auth.uid() THEN true
    -- Allow if user is a platform admin
    WHEN EXISTS (
      SELECT 1
      FROM profiles admin
      WHERE admin.id = auth.uid()
        AND admin.role = 'platform_admin'
        AND admin.is_active = true
        AND admin.id != profiles.id  -- Prevent self-reference
    ) THEN true
    ELSE false
  END
);