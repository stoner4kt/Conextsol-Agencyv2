-- ====================================================================
-- CONEXTSOL AGENCY CLIENT & PROJECT MANAGEMENT PORTAL
-- Database Schema for Supabase PostgreSQL
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing tables if executing reset (Optional)
-- DROP TABLE IF EXISTS documents_and_notes CASCADE;
-- DROP TABLE IF EXISTS retainers CASCADE;
-- DROP TABLE IF EXISTS projects CASCADE;
-- DROP TABLE IF EXISTS clients CASCADE;

-- 1. CLIENTS TABLE
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    primary_contact_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for scanning client statuses and emails
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_email ON clients(email);

-- 2. PROJECTS TABLE
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    invoiced_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    short_note TEXT,
    staging_url TEXT,
    production_url TEXT,
    github_url TEXT,
    services_listed JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of specific services delivered
    associated_emails JSONB NOT NULL DEFAULT '[]'::jsonb, -- Emails tied to managing services
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching project deadlines and foreign keys
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_end_date ON projects(end_date);

-- 3. RETAINERS TABLE
CREATE TABLE retainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('web hosting', 'web maintenance', 'SEO', 'Google Ads')),
    billing_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    billing_cycle_day INTEGER NOT NULL CHECK (billing_cycle_day >= 1 AND billing_cycle_day <= 31),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up active retainers by billing cycle day
CREATE INDEX idx_retainers_client_id ON retainers(client_id);
CREATE INDEX idx_retainers_billing_active ON retainers(billing_cycle_day) WHERE is_active = TRUE;

-- 4. DOCUMENTS AND NOTES TABLE
CREATE TABLE documents_and_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Supports Markdown or Rich Text notes
    file_references TEXT[] NOT NULL DEFAULT '{}', -- Array of URLs/paths for files uploaded to Storage
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast document lookups by project
CREATE INDEX idx_documents_project_id ON documents_and_notes(project_id);


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_and_notes ENABLE ROW LEVEL SECURITY;

-- Assuming two roles: 
-- 1. Agency Admins (full read/write access)
-- 2. Client Users (limited read-only access to their own projects)

-- Admin policy for clients
CREATE POLICY "Admins have full access to clients" 
ON clients 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com');

-- Admin policy for projects
CREATE POLICY "Admins have full access to projects" 
ON projects 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com');

-- Admin policy for retainers
CREATE POLICY "Admins have full access to retainers" 
ON retainers 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com');

-- Admin policy for documents (ONLY admins can write/edit, as requested)
CREATE POLICY "Admins have full access to documents" 
ON documents_and_notes 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com');

-- Read-only client policies based on associated emails
CREATE POLICY "Clients can view their own projects"
ON projects
FOR SELECT
TO authenticated
USING (
  associated_emails @> jsonb_build_array(auth.jwt() ->> 'email')
);

CREATE POLICY "Clients can view their own client profiles"
ON clients
FOR SELECT
TO authenticated
USING (
  email = auth.jwt() ->> 'email' OR 
  id IN (SELECT client_id FROM projects WHERE associated_emails @> jsonb_build_array(auth.jwt() ->> 'email'))
);

CREATE POLICY "Clients can view documents tied to their projects"
ON documents_and_notes
FOR SELECT
TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE associated_emails @> jsonb_build_array(auth.jwt() ->> 'email'))
);


-- ====================================================================
-- AUTOMATIC TIMESTAMPS TRIGGER
-- ====================================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_retainers_modtime BEFORE UPDATE ON retainers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON documents_and_notes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- ====================================================================
-- SAMPLE SEED DATA (For local Supabase testing)
-- ====================================================================

-- Insert sample clients
INSERT INTO clients (id, company_name, primary_contact_name, email, phone, status) VALUES
('c1111111-1111-1111-1111-111111111111', 'Acme Corp Solutions', 'Sarah Jenkins', 'sarah.j@acmecorp.com', '+1 (555) 019-2834', 'active'),
('c2222222-2222-2222-2222-222222222222', 'Zenith Retail Group', 'Marcus Chen', 'm.chen@zenithretail.co', '+1 (555) 438-9012', 'active');

-- Insert sample projects
INSERT INTO projects (id, client_id, project_name, start_date, end_date, invoiced_amount, short_note, staging_url, production_url, github_url, services_listed, associated_emails) VALUES
('p1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Acme E-Commerce Platform Redesign', '2026-06-01', '2026-07-17', 18500.00, 'Complete overhaul of core B2B purchasing funnel and Tailwind design upgrade.', 'https://acme-staging.conextsol.dev', 'https://b2b.acmesolutions.com', 'https://github.com/conextsol-agency/acme-b2b-redesign', '["UI/UX Redesign", "Next.js 14 Development", "Stripe Multi-vendor Billing"]'::jsonb, '["sarah.j@acmecorp.com", "billing@acmecorp.com"]'::jsonb),
('p2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Zenith Inventory Dashboard & Mobile App', '2026-04-10', '2026-08-30', 24000.00, 'Warehouse real-time stock sync with barcode scanner API.', 'https://zenith-inventory-stage.conextsol.dev', NULL, 'https://github.com/conextsol-agency/zenith-inventory-core', '["Tailwind UI Dashboard", "React Native App"]'::jsonb, '["m.chen@zenithretail.co"]'::jsonb);

-- Insert sample retainers
INSERT INTO retainers (id, client_id, service_type, billing_amount, billing_cycle_day, is_active) VALUES
('r1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'web maintenance', 1200.00, 15, TRUE),
('r2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Google Ads', 2500.00, 1, TRUE),
('r3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'SEO', 1800.00, 15, TRUE);

-- Insert sample documents
INSERT INTO documents_and_notes (id, project_id, title, content, file_references) VALUES
('d1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'Acme Stripe Webhook Key Rotation Guide', '### Stripe Integration Production Setup\n\nThis document outlines the webhook signing keys rotation for **Acme Corp Solutions**.\n\n#### 1. Endpoint Configuration\n- **Production URL:** https://b2b.acmesolutions.com/api/webhooks/stripe\n\n#### 2. Environment Variables Required\n```env\nSTRIPE_SECRET_KEY=sk_live_...\nSTRIPE_WEBHOOK_SECRET=whsec_...\n```', '{"/storage/acme_stripe_spec.pdf", "https://stripe.com/docs/api"}');
