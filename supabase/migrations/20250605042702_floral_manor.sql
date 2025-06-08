/*
  # Create knowledge base table

  1. New Tables
    - `knowledge_base`: Stores support articles, FAQs, and tutorials
      - Articles can be published/unpublished
      - Articles have categories and tags
      - Content stored as text
  
  2. Security
    - Enable RLS
    - All users can view published articles
    - Platform admins can manage articles
*/

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('faq', 'tutorial', 'article')),
  tags text[] DEFAULT '{}'::text[],
  is_published boolean DEFAULT false,
  author_id uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view published articles"
ON knowledge_base
FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Platform admins can manage knowledge base"
ON knowledge_base
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'platform_admin')
WITH CHECK (get_user_role(auth.uid()) = 'platform_admin');

-- Create indexes
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_knowledge_base_is_published ON knowledge_base(is_published);
CREATE INDEX idx_knowledge_base_tags ON knowledge_base USING gin(tags);