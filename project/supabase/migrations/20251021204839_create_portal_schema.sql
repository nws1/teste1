/*
  # Create Portal Schema

  ## Overview
  Creates the database schema for the CNAB portal with access token authentication and contact message storage.

  ## New Tables
  
  ### `access_tokens`
  - `id` (uuid, primary key) - Unique identifier
  - `token` (text, unique) - 20-character alphanumeric access token
  - `description` (text) - Optional description for the token
  - `is_active` (boolean) - Whether the token is active
  - `created_at` (timestamptz) - Creation timestamp
  - `last_used_at` (timestamptz, nullable) - Last usage timestamp
  
  ### `contact_messages`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Contact name
  - `company` (text) - Company name
  - `fidc` (text, nullable) - FIDC affiliation (optional)
  - `email` (text) - Contact email
  - `whatsapp` (text, nullable) - WhatsApp number (optional)
  - `message` (text) - Message content (max 5000 characters)
  - `created_at` (timestamptz) - Submission timestamp

  ## Security
  - Enable RLS on both tables
  - `access_tokens`: No public access, admin only
  - `contact_messages`: Allow authenticated users to insert their own messages
*/

-- Create access_tokens table
CREATE TABLE IF NOT EXISTS access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  CONSTRAINT token_length CHECK (char_length(token) = 20)
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  fidc text,
  email text NOT NULL,
  whatsapp text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT message_length CHECK (char_length(message) <= 5000)
);

-- Enable RLS
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Policies for access_tokens (restrictive - no public access)
CREATE POLICY "No public access to tokens"
  ON access_tokens
  FOR SELECT
  TO anon
  USING (false);

-- Policies for contact_messages (allow anonymous inserts for contact form)
CREATE POLICY "Anyone can insert contact messages"
  ON contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create function to validate token
CREATE OR REPLACE FUNCTION validate_access_token(token_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if token exists and is active
  RETURN EXISTS (
    SELECT 1 
    FROM access_tokens 
    WHERE token = token_input 
    AND is_active = true
  );
END;
$$;

-- Create function to update last_used_at
CREATE OR REPLACE FUNCTION update_token_usage(token_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE access_tokens 
  SET last_used_at = now() 
  WHERE token = token_input 
  AND is_active = true;
END;
$$;

-- Insert a sample token for testing (remove in production)
INSERT INTO access_tokens (token, description) 
VALUES ('ABC123DEF456GHI789JK', 'Sample access token for testing')
ON CONFLICT (token) DO NOTHING;