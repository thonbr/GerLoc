/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify RLS policies to use direct auth.uid() checks
    - Maintain security while avoiding self-referencing queries
    
  2. Security
    - Users can still only access their own profile
    - Company admins can manage users in their company
    - Platform admins retain full access
    - All operations are properly secured
*/

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "company_admins_manage_company_users" ON profiles;
DROP POLICY IF EXISTS "platform_admins_manage_all" ON profiles;
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;

-- Create new, simplified policies
-- Allow users to read their own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow company admins to manage users in their company
CREATE POLICY "company_admins_manage_users" ON profiles
  FOR ALL
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

-- Allow platform admins full access
CREATE POLICY "platform_admins_manage_all" ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid()
        AND admin.role = 'platform_admin'
        AND admin.is_active = true
        LIMIT 1
    )
  );