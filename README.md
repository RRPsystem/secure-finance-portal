# Secure Finance Portal

Een modern klantportaal en ticketcenter voor Secure Finance administratiekantoor.

## 🎯 Wat doet dit systeem?

Dit is **geen boekhoudsysteem**, maar een slim documentportaal dat:
- Klanten helpt om documenten gestructureerd aan te leveren
- Automatische herinneringen stuurt voor ontbrekende stukken
- Communicatie centraliseert via tickets (geen losse WhatsApp/mails meer)
- De boekhouder een overzicht geeft van alle klanten en hun status

## 🚀 Features

### Voor Klanten
- ✅ Dashboard met overzicht van alle documenten
- 📤 Upload documenten per categorie (BTW Q1-Q4, Jaarrekening, etc.)
- 📋 Checklist per periode - zie direct wat nog ontbreekt
- 🎫 Tickets aanmaken voor vragen
- 📊 Volledigheidsscore - zie je voortgang

### Voor Boekhouder
- 👥 Overzicht van alle klanten met status (rood/geel/groen)
- ✅ Documenten goedkeuren/afkeuren
- 🎫 Ticket management
- ⚙️ Reminder instellingen configureren
- 📈 Dashboard met statistieken

### Automatisering
- 🔔 Automatische herinneringen op basis van deadlines
- 📧 Wekelijkse mail naar abonnement-klanten met ontbrekende stukken
- ⚠️ Waarschuwing over €25 herinneringsfee na 3e herinnering
- 📊 Automatische berekening van volledigheidsscore

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router v6

## 📦 Installatie

1. Clone het project
2. Installeer dependencies:
```bash
npm install
```

3. Maak een `.env` bestand aan (kopieer van `.env.example`):
```bash
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. Start de dev server:
```bash
npm run dev
```

## 🗄️ Database Setup

Zie `DATABASE_SCHEMA.md` voor het volledige database schema.
Zie `NEXT_STEPS.md` voor stap-voor-stap setup instructies.

## 🎨 Branding

De kleuren zijn afgestemd op securefinance.nl:
- Primary: Blauw (#0ea5e9)
- Accent: Goud/Geel (#f59e0b)

## 📞 Contact

Voor vragen: info@securefinance.nl

---

© 2025 Secure Finance. Alle rechten voorbehouden. 
