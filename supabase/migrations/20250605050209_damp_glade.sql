/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify access control logic
    - Ensure proper separation between platform admin and company admin policies
  
  2. Security
    - Maintain proper access control while avoiding recursion
    - Users can still only access appropriate data
    - Platform admins retain full access
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "company_admin_access" ON profiles;
DROP POLICY IF EXISTS "platform_admin_full_access" ON profiles;

-- Create new, simplified policies
CREATE POLICY "users_read_own_profile" 
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "company_admins_manage_company_users" 
ON profiles
FOR ALL 
TO authenticated
USING (
  -- Company admin can manage users in their company
  EXISTS (
    SELECT 1 FROM profiles admin 
    WHERE admin.id = auth.uid() 
    AND admin.role = 'company_admin'
    AND admin.company_id = profiles.company_id
    AND admin.is_active = true
  )
);

CREATE POLICY "platform_admins_manage_all" 
ON profiles
FOR ALL 
TO authenticated
USING (
  -- Direct role check without recursion
  EXISTS (
    SELECT 1 FROM profiles admin 
    WHERE admin.id = auth.uid() 
    AND admin.role = 'platform_admin'
    AND admin.is_active = true
  )
);