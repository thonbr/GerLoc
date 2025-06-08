/*
  # Add company address and document fields

  1. Changes
    - Add address fields to companies table
    - Add cpf_cnpj field to companies table
    - Add trial_ends_at field for free trial support
*/

-- Add new columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS address_street text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_state text,
ADD COLUMN IF NOT EXISTS address_zip_code text,
ADD COLUMN IF NOT EXISTS cpf_cnpj text,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Add check constraint for cpf_cnpj format
ALTER TABLE companies
ADD CONSTRAINT companies_cpf_cnpj_format CHECK (
  -- CPF format: 000.000.000-00 or 00000000000
  (cpf_cnpj ~ '^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$' OR cpf_cnpj ~ '^[0-9]{11}$')
  OR
  -- CNPJ format: 00.000.000/0000-00 or 00000000000000
  (cpf_cnpj ~ '^[0-9]{2}\.[0-9]{3}\.[0-9]{3}/[0-9]{4}-[0-9]{2}$' OR cpf_cnpj ~ '^[0-9]{14}$')
);