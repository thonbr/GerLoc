/*
  # Add new columns to vehicles and profiles tables

  1. Changes
    - Add chassi, color, purchase_value to vehicles table
    - Add rg, cnh, phone to profiles table
    
  2. Security
    - No RLS changes needed as existing policies will cover new columns
*/

-- Add new columns to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS chassi TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS purchase_value NUMERIC;

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS cnh TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;