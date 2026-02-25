-- Document sets: herbruikbare sjablonen voor documentverzoeken
-- Voer dit uit in Supabase SQL Editor

-- Sets tabel (bijv. "IB Aangifte", "BTW Kwartaal")
CREATE TABLE IF NOT EXISTS document_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items binnen een set (bijv. "Jaaropgave bank", "WOZ-beschikking")
CREATE TABLE IF NOT EXISTS document_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID REFERENCES document_sets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0
);

ALTER TABLE document_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage sets" ON document_sets
  FOR ALL USING (get_my_role() = 'accountant');

CREATE POLICY "Accountants can manage set items" ON document_set_items
  FOR ALL USING (get_my_role() = 'accountant');

GRANT SELECT, INSERT, UPDATE, DELETE ON document_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_set_items TO authenticated;
