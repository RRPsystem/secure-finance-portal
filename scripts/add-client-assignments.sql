-- Client Document Assignments: koppelt document categorieën aan klanten
-- Voer dit uit in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS client_document_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  category_id UUID REFERENCES document_categories(id) ON DELETE CASCADE,
  deadline TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, category_id)
);

ALTER TABLE client_document_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage assignments" ON client_document_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'accountant')
  );

CREATE POLICY "Clients can view own assignments" ON client_document_assignments
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON client_document_assignments TO authenticated;

-- Voeg ook BTW categorieën voor 2026 toe
INSERT INTO document_categories (name, category_type, year, quarter, sort_order) VALUES
  ('BTW Q1 2026', 'btw_quarter', 2026, 1, 1),
  ('BTW Q2 2026', 'btw_quarter', 2026, 2, 2),
  ('BTW Q3 2026', 'btw_quarter', 2026, 3, 3),
  ('BTW Q4 2026', 'btw_quarter', 2026, 4, 4),
  ('Jaarrekening 2026', 'annual_report', 2026, NULL, 5),
  ('IB Aangifte 2026', 'tax_return', 2026, NULL, 6)
ON CONFLICT DO NOTHING;
