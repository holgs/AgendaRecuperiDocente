# Sistema Tracking Recupero Moduli Docenti

Sistema web modulare per il monitoraggio e tracking delle attività di recupero moduli svolte dai docenti, con gestione utenti autorizzati e configurazione flessibile delle tipologie di recupero.

## Architettura del Sistema

- **Sistema di Calcolo** (esterno): calcola tesoretti da CSV → output: lista docenti con moduli annuali
- **Sistema di Tracking** (questo repo): importa tesoretti → monitora utilizzo → gestisce saldi

## Tech Stack

- **Framework**: Next.js 14 con App Router
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: Supabase Authentication
- **UI**: Tailwind CSS + Shadcn/ui
- **Deploy**: Vercel

## Principi di Design

- **API-First**: tutte le funzioni esposte via REST API
- **Role-Based**: sistema ruoli espandibile (admin, docente, viewer)
- **Configurable**: tipologie recupero gestite dinamicamente
- **Audit Trail**: log completo di tutte le operazioni
- **Integration Ready**: API per import/export con altri sistemi

## Core Features

### Phase 1 (MVP)
- Autenticazione e gestione utenti
- Import tesoretti da sistema di calcolo
- Registrazione attività di recupero
- Dashboard monitoraggio
- Tipologie recupero configurabili

### Phase 2 (Future)
- Accesso docenti
- Approval workflows
- Report avanzati
- Analytics
- Mobile responsive

## Development

```bash
npm run dev              # Next.js development server
npm run build           # Build per produzione
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema a Supabase
```

### Componenti UI condivisi

- **DataTable** (`src/components/core/data-table.tsx`)
  - Ricerca globale e gestione visibilità colonne integrate.
  - Esportazione nativa dei dati visibili in formato CSV, Excel (SheetJS) e PDF (pdfmake) senza necessità di handler esterni.
  - Proprietà opzionali:
    - `exportFileName` per impostare il nome base dei file generati.
    - `enableExport` per disabilitare il selettore di esportazione quando non necessario.
  - Gestione automatica degli stati di caricamento ed errori durante l'esportazione.

## Database Schema

Il sistema utilizza Supabase con le seguenti tabelle principali:
- `users` - Utenti e ruoli
- `teachers` - Anagrafica docenti
- `teacher_budgets` - Tesoretti annuali importati
- `recovery_types` - Tipologie recupero configurabili
- `recovery_activities` - Attività di recupero registrate
- `activity_logs` - Audit trail completo

## Business Logic

### Calcoli Matematici
- **Moduli equivalenti**: duration_minutes / 50
- **Saldi**: minutes_annual - minutes_used ≥ 0
- **Validazioni**: coerenza date, controllo duplicati

### Sicurezza
- Row Level Security (RLS) con Supabase
- Audit trail di tutte le operazioni
- Separazione permessi per ruolo

## License

Private project for educational institution use.