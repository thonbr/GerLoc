/*
  # Create plans table and initial data

  1. New Tables
    - `plans`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `name` (text)
      - `description` (text, nullable)
      - `price` (numeric)
      - `features` (text array)
      - `limits` (jsonb)
      - `is_active` (boolean)
      - `stripe_price_id` (text, nullable)

  2. Security
    - Enable RLS on plans table
    - Add policies for platform admins and authenticated users

  3. Data
    - Insert initial subscription plans
*/

-- Create plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  features text[] DEFAULT '{}'::text[],
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  stripe_price_id text
);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Platform admins can manage plans" ON plans;
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;

-- Create policies for plans
CREATE POLICY "Platform admins can manage plans"
  ON plans
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Anyone can view active plans"
  ON plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert initial plans
INSERT INTO plans (name, description, price, features, limits, is_active) VALUES
  (
    'Basic',
    'Perfect for small rental businesses',
    49.99,
    ARRAY[
      'Up to 10 vehicles',
      'Up to 3 users',
      'Basic analytics',
      'Email support'
    ],
    '{"maxUsers": 3, "maxVehicles": 10, "maxContracts": 50}'::jsonb,
    true
  ),
  (
    'Premium',
    'Ideal for growing businesses',
    99.99,
    ARRAY[
      'Up to 25 vehicles',
      'Up to 10 users',
      'Advanced analytics',
      'Priority support',
      'Custom reports'
    ],
    '{"maxUsers": 10, "maxVehicles": 25, "maxContracts": 200}'::jsonb,
    true
  ),
  (
    'Enterprise',
    'For large-scale operations',
    199.99,
    ARRAY[
      'Unlimited vehicles',
      'Unlimited users',
      'Advanced analytics',
      '24/7 Priority support',
      'Custom reports',
      'API access',
      'Custom integrations'
    ],
    '{"maxUsers": -1, "maxVehicles": -1, "maxContracts": -1}'::jsonb,
    true
  );