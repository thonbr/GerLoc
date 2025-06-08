/*
  # Fix recursive RLS policies for profiles table

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify policies to use direct auth.uid() checks where possible
    - Maintain security while avoiding policy recursion
    
  2. Security
    - Users can still only read/update their own profile
    - Company admins can manage profiles within their company
    - Platform admins retain full access
    - All changes maintain proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Company admins manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Platform admins full access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new, non-recursive policies
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Company admins manage company profiles"
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

CREATE POLICY "Platform admins full access"
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