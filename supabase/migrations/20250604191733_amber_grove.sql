/*
  # Initial Schema Setup

  1. New Tables
    - `plans`: Subscription plans configuration
    - `companies`: Client companies information
    - `profiles`: Extended user profiles linked to auth.users
  
  2. Security
    - Enable RLS on all tables
    - Add policies for platform admins, company admins, and users
    
  3. Automation
    - Create trigger for automatic profile creation
    - Add performance indexes
*/

-- Create plans table first since it's referenced by companies
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  features text[] DEFAULT '{}',
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  stripe_price_id text
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  plan_id uuid REFERENCES plans(id),
  subscription_status text CHECK (subscription_status IN ('active', 'past_due', 'canceled')),
  subscription_end_date timestamptz,
  stripe_customer_id text,
  settings jsonb DEFAULT '{}'::jsonb
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  avatar_url text,
  company_id uuid REFERENCES companies(id),
  role text NOT NULL DEFAULT 'company_user' CHECK (role IN ('platform_admin', 'company_admin', 'company_user')),
  is_active boolean DEFAULT true,
  last_sign_in_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Plans policies
CREATE POLICY "Platform admins can manage all plans"
  ON plans
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'platform_admin'
  ));

CREATE POLICY "Anyone can view active plans"
  ON plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Companies policies
CREATE POLICY "Platform admins can manage all companies"
  ON companies
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'platform_admin'
  ));

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

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Platform admins can manage all profiles"
  ON profiles
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'platform_admin'
  ));

CREATE POLICY "Company admins can manage company users"
  ON profiles
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'company_admin'
      AND admin.company_id = profiles.company_id
    )
  );

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_plan_id ON companies(plan_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);