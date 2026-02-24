# Secure Finance Portal - Database Schema

## Overzicht
Dit systeem is een klantportaal + ticketcenter voor boekhouder Secure Finance.
**Geen boekhoudsysteem** - alleen documentbeheer, checklists en communicatie.

## Database Tabellen

### 1. `users`
Authenticatie en basis gebruikersinfo (Supabase Auth)
```sql
- id (uuid, primary key, from auth.users)
- email (text)
- role (enum: 'accountant' | 'client')
- created_at (timestamp)
```

### 2. `clients`
Klantgegevens
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key -> users.id)
- company_name (text)
- contact_person (text)
- phone (text)
- address (text)
- postal_code (text)
- city (text)
- kvk_number (text, optional)
- btw_number (text, optional)
- subscription_type (enum: 'abonnement' | 'per_opdracht')
- is_active (boolean, default true)
- completeness_score (integer, 0-100, calculated)
- created_at (timestamp)
- updated_at (timestamp)
```

### 3. `document_categories`
Vaste categorieën voor documenten (BTW Q1-Q4, Jaarrekening, etc.)
```sql
- id (uuid, primary key)
- name (text) - bijv. "BTW Q1 2025"
- category_type (enum: 'btw_quarter' | 'annual_report' | 'payroll' | 'tax_return' | 'other')
- year (integer)
- quarter (integer, nullable) - voor BTW
- sort_order (integer)
- is_active (boolean)
```

### 4. `document_checklists`
Checklist items per categorie (wat moet aangeleverd worden)
```sql
- id (uuid, primary key)
- category_id (uuid, foreign key -> document_categories.id)
- item_name (text) - bijv. "Bankafschriften", "Inkoopfacturen"
- description (text, optional)
- is_required (boolean)
- sort_order (integer)
```

### 5. `client_documents`
Geüploade documenten per klant
```sql
- id (uuid, primary key)
- client_id (uuid, foreign key -> clients.id)
- category_id (uuid, foreign key -> document_categories.id)
- checklist_item_id (uuid, foreign key -> document_checklists.id, nullable)
- file_name (text)
- file_path (text) - Supabase Storage path
- file_size (integer) - bytes
- file_type (text) - mime type
- status (enum: 'pending' | 'approved' | 'rejected')
- rejection_reason (text, nullable)
- uploaded_by (uuid, foreign key -> users.id)
- uploaded_at (timestamp)
- reviewed_by (uuid, foreign key -> users.id, nullable)
- reviewed_at (timestamp, nullable)
- notes (text, nullable)
```

### 6. `tickets`
Communicatie/verzoeken tussen klant en boekhouder
```sql
- id (uuid, primary key)
- client_id (uuid, foreign key -> clients.id)
- category_id (uuid, foreign key -> document_categories.id, nullable)
- subject (text)
- description (text)
- status (enum: 'open' | 'waiting_client' | 'waiting_accountant' | 'closed')
- priority (enum: 'low' | 'normal' | 'high' | 'urgent')
- created_by (uuid, foreign key -> users.id)
- assigned_to (uuid, foreign key -> users.id, nullable)
- deadline (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- closed_at (timestamp, nullable)
```

### 7. `ticket_messages`
Berichten binnen een ticket
```sql
- id (uuid, primary key)
- ticket_id (uuid, foreign key -> tickets.id)
- user_id (uuid, foreign key -> users.id)
- message (text)
- created_at (timestamp)
```

### 8. `ticket_attachments`
Bijlagen bij ticket berichten
```sql
- id (uuid, primary key)
- ticket_id (uuid, foreign key -> tickets.id)
- message_id (uuid, foreign key -> ticket_messages.id, nullable)
- file_name (text)
- file_path (text)
- file_size (integer)
- uploaded_by (uuid, foreign key -> users.id)
- uploaded_at (timestamp)
```

### 9. `reminders`
Automatische herinneringen
```sql
- id (uuid, primary key)
- client_id (uuid, foreign key -> clients.id)
- category_id (uuid, foreign key -> document_categories.id)
- reminder_type (enum: 'before_deadline' | 'on_deadline' | 'after_deadline' | 'final_warning')
- days_offset (integer) - bijv. -7 (7 dagen voor deadline), 0 (op deadline), 7 (7 dagen na)
- sent_at (timestamp, nullable)
- email_subject (text)
- email_body (text)
- is_sent (boolean, default false)
```

### 10. `reminder_settings`
Instellingen voor automatische herinneringen (per categorie)
```sql
- id (uuid, primary key)
- category_id (uuid, foreign key -> document_categories.id)
- days_before_deadline (integer[]) - bijv. [7, 3] = herinner 7 en 3 dagen van tevoren
- days_after_deadline (integer[]) - bijv. [7, 14] = herinner 7 en 14 dagen na deadline
- enable_fee_warning (boolean) - toon waarschuwing over €25 fee
- fee_after_reminders (integer) - na hoeveel herinneringen fee rekenen (default: 3)
```

### 11. `activity_log`
Audit trail van alle acties
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key -> users.id)
- client_id (uuid, foreign key -> clients.id, nullable)
- action_type (text) - bijv. 'document_uploaded', 'ticket_created', 'reminder_sent'
- description (text)
- metadata (jsonb) - extra details
- created_at (timestamp)
```

## Storage Buckets (Supabase Storage)

### `client-documents`
- Folder structuur: `{client_id}/{category_id}/{filename}`
- Access: RLS policies (klant ziet alleen eigen docs, accountant ziet alles)

### `ticket-attachments`
- Folder structuur: `{ticket_id}/{filename}`
- Access: RLS policies (alleen betrokkenen bij ticket)

## Key Features

### ✅ Voor Klanten
- Dashboard met overzicht van alle categorieën en hun status
- Upload documenten per checklist item
- Zie welke documenten nog ontbreken
- Tickets aanmaken voor vragen
- Automatische herinneringen ontvangen

### ✅ Voor Boekhouder
- Dashboard met overzicht van alle klanten
- Status per klant (rood/geel/groen)
- Documenten goedkeuren/afkeuren
- Tickets beheren
- Reminder instellingen configureren
- Activiteiten log

### ✅ Automatisering
- Wekelijkse mail naar abonnement-klanten met ontbrekende stukken
- Herinneringen op basis van deadlines
- Waarschuwing over €25 fee na 3e herinnering
- Berekening van "volledigheidsscore" per klant
