/*
  # Fix profiles RLS policies

  1. Changes
    - Drop existing problematic policies
    - Create new, simplified RLS policies for profiles table
    
  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Users can read their own profile
      - Company admins can read profiles in their company
      - Platform admins have full access
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Company admins manage company users" ON profiles;
DROP POLICY IF EXISTS "Company admins view company users" ON profiles;
DROP POLICY IF EXISTS "Platform admins full access" ON profiles;
DROP POLICY IF EXISTS "Update own profile" ON profiles;
DROP POLICY IF EXISTS "View own profile" ON profiles;

-- Create new simplified policies
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Company admins can read company profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'company_admin'
    AND admin.company_id = profiles.company_id
  )
);

CREATE POLICY "Company admins can manage company profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'company_admin'
    AND admin.company_id = profiles.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'company_admin'
    AND admin.company_id = profiles.company_id
  )
);

CREATE POLICY "Platform admins have full access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'platform_admin'
  )
);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);