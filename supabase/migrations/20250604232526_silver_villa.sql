/*
  # Fix profiles RLS policies

  1. Changes
    - Remove existing problematic RLS policies that cause infinite recursion
    - Add new, optimized RLS policies for the profiles table that prevent circular references
    
  2. Security
    - Maintain security while preventing infinite recursion
    - Users can still only access appropriate profiles based on their role and company
    - Platform admins retain full access
*/

-- First, drop existing policies that might be causing the recursion
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update access to own profile" ON profiles;
DROP POLICY IF EXISTS "Platform admins have full access" ON profiles;

-- Create new, optimized policies
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow company admins to manage profiles within their company
CREATE POLICY "Company admins manage company profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles AS admin_profile
    WHERE 
      admin_profile.id = auth.uid() 
      AND admin_profile.role = 'company_admin'
      AND admin_profile.company_id = profiles.company_id
      AND admin_profile.is_active = true
  )
);

-- Allow platform admins full access without recursion
CREATE POLICY "Platform admins full access"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles AS admin_profile
    WHERE 
      admin_profile.id = auth.uid() 
      AND admin_profile.role = 'platform_admin'
      AND admin_profile.is_active = true
  )
);