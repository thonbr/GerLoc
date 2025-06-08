-- Criar função SECURITY DEFINER para obter a role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$;

-- Revogar todas as políticas existentes
DROP POLICY IF EXISTS "View own profile" ON profiles;
DROP POLICY IF EXISTS "Update own profile" ON profiles;
DROP POLICY IF EXISTS "Company admins view company users" ON profiles;
DROP POLICY IF EXISTS "Company admins manage company users" ON profiles;
DROP POLICY IF EXISTS "Platform admins full access" ON profiles;

-- Criar novas políticas usando a função get_user_role
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
    AND public.get_user_role(auth.uid()) = 'company_admin'
  )
);

CREATE POLICY "Company admins manage company users"
ON profiles
FOR ALL
TO authenticated
USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND public.get_user_role(auth.uid()) = 'company_admin'
)
WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND public.get_user_role(auth.uid()) = 'company_admin'
);

CREATE POLICY "Platform admins full access"
ON profiles
FOR ALL
TO authenticated
USING (public.get_user_role(auth.uid()) = 'platform_admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'platform_admin');

-- Atualizar políticas da tabela companies
DROP POLICY IF EXISTS "Platform admins can manage all companies" ON companies;
DROP POLICY IF EXISTS "Company users can view their own company" ON companies;

CREATE POLICY "Platform admins can manage all companies"
ON companies
TO authenticated
USING (public.get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Company users can view their own company"
ON companies
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT company_id FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Atualizar políticas da tabela plans
DROP POLICY IF EXISTS "Platform admins can manage all plans" ON plans;
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;

CREATE POLICY "Platform admins can manage all plans"
ON plans
TO authenticated
USING (public.get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Anyone can view active plans"
ON plans
FOR SELECT
TO authenticated
USING (is_active = true);