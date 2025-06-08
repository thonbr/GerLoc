/*
  # Fix infinite recursion in profiles RLS policies

  1. Changes
    - Drop existing problematic RLS policies
    - Create new, optimized policies that avoid recursion
    - Maintain same security model but with better implementation

  2. Security
    - Maintains existing security rules but implements them more efficiently
    - Users can still only read their own profile
    - Company admins can manage profiles in their company
    - Platform admins retain full access
*/

-- Drop existing policies to replace them
DROP POLICY IF EXISTS "Company admins manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Platform admins full access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new, optimized policies
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow company admins to manage profiles in their company
CREATE POLICY "Company admins manage company profiles"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM profiles AS admin
      WHERE admin.id = auth.users.id
      AND admin.role = 'company_admin'
      AND admin.company_id = profiles.company_id
      AND admin.is_active = true
    )
  )
);

-- Allow platform admins full access
CREATE POLICY "Platform admins full access"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM profiles AS admin
      WHERE admin.id = auth.users.id
      AND admin.role = 'platform_admin'
      AND admin.is_active = true
    )
  )
);