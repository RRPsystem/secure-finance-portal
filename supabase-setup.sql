-- Secure Finance Portal - Database Setup
-- Run this SQL in Supabase SQL Editor

-- Users table (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('accountant', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Accountants can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'accountant')
  );

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  kvk_number TEXT,
  btw_number TEXT,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('abonnement', 'per_opdracht')),
  is_active BOOLEAN DEFAULT TRUE,
  completeness_score INTEGER DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own data" ON clients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Accountants can view all clients" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'accountant')
  );

-- Document Categories
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('btw_quarter', 'annual_report', 'payroll', 'tax_return', 'other')),
  year INTEGER NOT NULL,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active categories" ON document_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Accountants can manage categories" ON document_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'accountant')
  );

-- Document Checklists
CREATE TABLE document_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES document_categories(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE document_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view checklists" ON document_checklists
  FOR SELECT USING (TRUE);

CREATE POLICY "Accountants can manage checklists" ON document_checklists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'accountant')
  );

-- Client Documents
CREATE TABLE client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  category_id UUID REFERENCES document_categories(id),
  checklist_item_id UUID REFERENCES document_checklists(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own documents" ON client_documents
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can upload documents" ON client_documents
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Accountants can manage all documents" ON client_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'accountant')
  );

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  category_id UUID REFERENCES document_categories(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'waiting_client', 'waiting_accountant', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'accountant')
  );

CREATE POLICY "Clients can create tickets" ON tickets
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Accountants can manage all tickets" ON tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'accountant')
  );

-- Activity Log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  client_id UUID REFERENCES clients(id),
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can view all activity" ON activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'accountant')
  );

-- Insert default document categories for 2025
INSERT INTO document_categories (name, category_type, year, quarter, sort_order) VALUES
  ('BTW Q1 2025', 'btw_quarter', 2025, 1, 1),
  ('BTW Q2 2025', 'btw_quarter', 2025, 2, 2),
  ('BTW Q3 2025', 'btw_quarter', 2025, 3, 3),
  ('BTW Q4 2025', 'btw_quarter', 2025, 4, 4),
  ('Jaarrekening 2025', 'annual_report', 2025, NULL, 5),
  ('IB Aangifte 2025', 'tax_return', 2025, NULL, 6);

-- Insert default checklist items for BTW Q1
INSERT INTO document_checklists (category_id, item_name, description, is_required, sort_order)
SELECT 
  document_categories.id,
  items.item_name,
  items.description,
  items.is_required,
  items.sort_order
FROM document_categories,
LATERAL (VALUES
  ('Bankafschriften', 'Alle bankafschriften van het kwartaal', TRUE, 1),
  ('Inkoopfacturen', 'Alle inkoopfacturen inclusief BTW', TRUE, 2),
  ('Verkoopfacturen', 'Alle verkoopfacturen inclusief BTW', TRUE, 3),
  ('Kasoverzicht', 'Overzicht van contante betalingen', FALSE, 4),
  ('Overige stukken', 'Eventuele andere relevante documenten', FALSE, 5)
) AS items(item_name, description, is_required, sort_order)
WHERE document_categories.category_type = 'btw_quarter' 
  AND document_categories.quarter = 1 
  AND document_categories.year = 2025;
