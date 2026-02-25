-- Document verzoeken: specifieke documenten die een klant moet inleveren
-- Voer dit uit in Supabase SQL Editor

-- Email kolom op clients (als dat nog niet is gedaan)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;

-- Document verzoeken tabel
CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'received', 'approved', 'rejected')),
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage requests" ON document_requests
  FOR ALL USING (get_my_role() = 'accountant');

CREATE POLICY "Clients can view own requests" ON document_requests
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON document_requests TO authenticated;
