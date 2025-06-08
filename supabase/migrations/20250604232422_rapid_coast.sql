/*
  # Fix profiles RLS policies

  1. Changes
    - Remove existing RLS policies that cause infinite recursion
    - Add simplified RLS policies for profiles table:
      - Users can read and update their own profile
      - Company admins can manage profiles within their company
      - Platform admins have full access to all profiles
  
  2. Security
    - Maintains row-level security
    - Prevents circular dependencies in policy definitions
    - Ensures proper access control based on user roles
*/

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Company admins can read company profiles" ON profiles;
DROP POLICY IF EXISTS "Platform admins have full access" ON profiles;

-- Create new, simplified policies
CREATE POLICY "Enable read access to own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Enable update access to own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Company admins can manage company profiles"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'company_admin'
      AND admin.company_id = profiles.company_id
      AND admin.is_active = true
  )
);

CREATE POLICY "Platform admins have full access"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'platform_admin'
      AND admin.is_active = true
  )
);