/*
  # System Metrics Tables

  1. New Tables
    - `system_metrics`
      - Stores system-wide performance metrics
      - Includes API response times, error rates, etc.
    - `system_incidents`
      - Tracks system incidents and their status
    - `service_status`
      - Tracks individual service health status

  2. Security
    - Enable RLS on all tables
    - Only platform admins can write
    - Authenticated users can read
*/

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create system_incidents table
CREATE TABLE IF NOT EXISTS system_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create service_status table
CREATE TABLE IF NOT EXISTS service_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('operational', 'degraded', 'down')),
  uptime numeric NOT NULL DEFAULT 100,
  latency numeric NOT NULL DEFAULT 0,
  last_check timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_status ENABLE ROW LEVEL SECURITY;

-- Create policies for system_metrics
CREATE POLICY "Platform admins can manage system metrics"
  ON system_metrics
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Authenticated users can view system metrics"
  ON system_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for system_incidents
CREATE POLICY "Platform admins can manage system incidents"
  ON system_incidents
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Authenticated users can view system incidents"
  ON system_incidents
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for service_status
CREATE POLICY "Platform admins can manage service status"
  ON service_status
  TO authenticated
  USING (get_user_role(auth.uid()) = 'platform_admin')
  WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Authenticated users can view service status"
  ON service_status
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial services
INSERT INTO service_status (name, status, uptime, latency) VALUES
  ('API Server', 'operational', 99.99, 145),
  ('Database', 'operational', 99.95, 85),
  ('Email Service', 'operational', 99.90, 220),
  ('Payment Gateway', 'operational', 99.98, 180);