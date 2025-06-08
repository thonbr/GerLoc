/*
  # Update Plans Configuration

  1. Changes
    - Delete existing plans
    - Insert new plans with correct pricing and features
    - Update limits configuration
    
  2. Plans
    - Basic: R$49.99/month
    - Premium: R$99.99/month
    - Empresa: R$199.99/month
*/

-- First, delete existing plans
DELETE FROM plans;

-- Insert updated plans
INSERT INTO plans (name, description, price, features, limits, is_active) VALUES
  (
    'Basic',
    'Até 10 veículos, até 3 usuários',
    49.99,
    ARRAY[
      'Até 10 veículos',
      'Até 3 usuários',
      'Gestão de contratos',
      'Relatórios básicos',
      'Suporte por email'
    ],
    '{
      "maxVehicles": 10,
      "maxUsers": 3,
      "maxContracts": 50
    }'::jsonb,
    true
  ),
  (
    'Premium',
    'Até 25 veículos, Até 10 usuários',
    99.99,
    ARRAY[
      'Até 25 veículos',
      'Até 10 usuários',
      'Gestão de contratos',
      'Relatórios avançados',
      'Suporte prioritário',
      'Análise de desempenho',
      'Alertas personalizados'
    ],
    '{
      "maxVehicles": 25,
      "maxUsers": 10,
      "maxContracts": 200
    }'::jsonb,
    true
  ),
  (
    'Empresa',
    'Veículos ilimitados, usuários ilimitados',
    199.99,
    ARRAY[
      'Veículos ilimitados',
      'Usuários ilimitados',
      'Gestão de contratos',
      'Relatórios avançados',
      'Suporte 24/7',
      'API dedicada',
      'Análise avançada',
      'Integrações personalizadas',
      'Backup dedicado'
    ],
    '{
      "maxVehicles": -1,
      "maxUsers": -1,
      "maxContracts": -1
    }'::jsonb,
    true
  );