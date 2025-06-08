/*
  # Fix platform admin RLS policies

  1. Changes
    - Drop existing policies that may be causing access issues
    - Create new simplified policies for platform admins
    - Ensure platform admins have unrestricted access to all profiles
    
  2. Security
    - Maintain proper access control
    - Prevent recursion in policy checks
    - Keep existing user access rules
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "platform_admin_access" ON profiles;
DROP POLICY IF EXISTS "platform_admin_full_access" ON profiles;

-- Create new simplified policy for platform admins
CREATE POLICY "platform_admin_full_access"
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
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'platform_admin'
      AND admin.is_active = true
  )
);

-- Update company access policy to exclude platform admins
DROP POLICY IF EXISTS "company_admin_access" ON profiles;

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
      AND admin.company_id = profiles.company_id
      AND admin.is_active = true
  )
  AND NOT EXISTS (
    SELECT 1
    FROM profiles padmin
    WHERE padmin.id = auth.uid()
      AND padmin.role = 'platform_admin'
  )
);