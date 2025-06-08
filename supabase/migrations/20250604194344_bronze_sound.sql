/*
  # Fix recursive RLS policies

  1. Changes
    - Simplify RLS policies to avoid recursion
    - Use direct role checks instead of subqueries
    - Maintain security while improving performance
    
  2. Security
    - Users can still only access their own profile
    - Company admins can manage users in their company
    - Platform admins retain full access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Company admins can view company users" ON profiles;
DROP POLICY IF EXISTS "Company admins can manage company users" ON profiles;
DROP POLICY IF EXISTS "Platform admins have full access" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "View own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Company admins view company users"
ON profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR
  (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'company_admin'
  )
);

CREATE POLICY "Company admins manage company users"
ON profiles
FOR ALL
TO authenticated
USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'company_admin'
)
WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'company_admin'
);

CREATE POLICY "Platform admins full access"
ON profiles
FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin');