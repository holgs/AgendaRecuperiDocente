# Piano Implementazione Sistema Pianificazione Recuperi

> **Data creazione**: 2025-10-02
> **Progetto**: Sistema Tracking Recupero Moduli Docenti
> **Funzionalità**: Navigazione, Dashboard Reale, Pianificazione Calendario

---

## 📋 REQUISITI RACCOLTI

### Moduli Orari
- **10 moduli per giorno**: denominati 1°, 2°, 3°, ... 10° modulo
- Fissi per tutti i giorni della settimana
- Nessun orario specifico, solo numero progressivo

### Stati Attività
- **Da pianificare**: nessun record DB (solo budget disponibile)
- **Pianificati**: status = "planned" (data futura, non ancora svolti)
- **Recuperati**: status = "completed" (attività svolte)

### Calendario
- **Doppia vista**: settimanale E mensile (switch tra le due)
- **Navigazione**: possibilità di scorrere settimane/mesi
- **Info celle**: nome docente + colore sfondo per tipo recupero
- **Drag & Drop**: permesso, MA non per attività passate

### Permessi
- **Admin**: può modificare tutto
- **Docenti**: possono modificare solo proprie attività non passate

### Campo Classe
- **Input libero** (validazione opzionale futura)
- Formato libero per ora

### Dashboard Settimanale
- Vista **compatta**: docente + nome attività

---

## 🔧 MODIFICHE DATABASE

### 1. Schema Prisma Aggiornato ✅

```prisma
model RecoveryActivity {
  // Campi aggiunti:
  moduleNumber Int?       @map("module_number")  // 1-10
  className    String?     @map("class_name")

  // Status modificato:
  status String? @default("planned") // "planned" | "completed" | "cancelled"
}
```

### 2. Migration
- Creare migration per aggiungere campi `module_number` e `class_name`
- Modificare default status da "completed" a "planned"

---

## 📁 STRUTTURA FILE DA CREARE/MODIFICARE

### API Routes (nuove)
1. `src/app/api/teachers/[id]/budget/route.ts` - GET budget specifico docente
2. `src/app/api/activities/weekly/route.ts` - GET attività settimana corrente
3. `src/app/api/activities/calendar/route.ts` - GET attività per periodo

### Pagine (nuove)
1. `src/app/(dashboard)/teachers/page.tsx` - Lista docenti
2. `src/app/(dashboard)/teachers/[id]/page.tsx` - Dettaglio docente
3. `src/app/(dashboard)/teachers/[id]/calendar/page.tsx` - Calendario pianificazione
4. `src/app/(dashboard)/activities/page.tsx` - Lista attività (già esiste, aggiornare)

### Componenti (nuovi)
1. `src/components/calendar/week-calendar.tsx` - Vista settimanale
2. `src/components/calendar/month-calendar.tsx` - Vista mensile
3. `src/components/calendar/calendar-cell.tsx` - Cella calendario con drag&drop
4. `src/components/calendar/activity-modal.tsx` - Modal dettaglio/edit attività
5. `src/components/teachers/teacher-detail-card.tsx` - Card riepilogo docente
6. `src/components/dashboard/weekly-overview.tsx` - Vista settimanale dashboard

### Utilities
1. `src/lib/calendar-utils.ts` - Helper per calcoli date/settimane
2. `src/lib/activity-validators.ts` - Validazioni business logic

---

## 🎯 FUNZIONALITÀ DA IMPLEMENTARE

### 1. Navigazione Completa
- ✅ Fix link sidebar per navigazione corretta
- ✅ Breadcrumb per tracking posizione
- ✅ Back button contestuale

### 2. Dashboard con Dati Reali
- ✅ Collegare API `/api/reports/overview` alla dashboard
- ✅ Mostrare statistiche reali da DB:
  - Totale docenti
  - Attività da pianificare (budget disponibile senza attività)
  - Attività pianificate (status="planned")
  - Attività recuperate (status="completed")
- ✅ Aggiungere componente vista settimanale

### 3. Pagina Lista Docenti
- ✅ Tabella con tutti i docenti
- ✅ Colonne: Nome, Cognome, Email, Moduli disponibili, Moduli usati
- ✅ Click su riga → dettaglio docente

### 4. Pagina Dettaglio Docente
- ✅ Card riepilogo:
  - Moduli totali da recuperare
  - Moduli da pianificare
  - Moduli pianificati
  - Moduli recuperati
- ✅ Pulsante "Pianifica" → calendario

### 5. Calendario Pianificazione
- ✅ Switch vista: settimana/mese
- ✅ Griglia: giorni × 10 moduli
- ✅ Celle colorate per tipo recupero
- ✅ Click cella → modal inserimento attività
- ✅ Drag & Drop attività (solo future)
- ✅ Navigazione prev/next settimana/mese

### 6. Modal Dettaglio Attività
- ✅ Form con campi:
  - Data (auto da cella cliccata)
  - Numero modulo (auto da cella)
  - Tipo attività (select da recovery_types)
  - Classe (input libero)
  - Titolo
  - Descrizione
  - Durata minuti (auto-calcolo moduli)
- ✅ CRUD completo (Create/Update/Delete)
- ✅ Validazioni business logic

### 7. Vista Settimanale Dashboard
- ✅ Card "Attività questa settimana"
- ✅ Lista compatta: docente + attività
- ✅ Click → dettaglio attività

### 8. Permessi e Sicurezza
- ✅ Admin: accesso completo
- ✅ Docente: solo proprie attività future
- ✅ Validazione lato server

---

## 📝 NOTE IMPLEMENTATIVE

### Business Logic
- Calcolo moduli equivalenti: `durationMinutes / 50`
- Validazione saldi: `modulesRemaining >= modulesEquivalent`
- Blocco modifica attività passate (date < oggi)
- Un'attività per cella (giorno + modulo + docente)

### Colori Tipologie
- Usare campo `color` da `recovery_types` per sfondo celle
- Opacity diversa per planned vs completed

### Librerie Necessarie
- `react-beautiful-dnd` o `@dnd-kit/core` per drag&drop
- `date-fns` per gestione date (già disponibile)

---

## 📦 ORDINE IMPLEMENTAZIONE

1. ✅ **Database & API** (base) - Schema aggiornato
2. ✅ **Migration DB** - Completata su Supabase
3. ✅ **Dashboard con dati reali** (quick win) - Completata
4. ✅ **Lista docenti** (semplice) - Completata
5. ⏳ **Dettaglio docente** (medio) - Prossimo
6. ⏳ **Calendario settimanale** (complesso)
7. ⏳ **Calendario mensile** (estensione)
8. ⏳ **Drag & Drop** (avanzato)
9. ⏳ **Vista dashboard settimanale** (finale)

---

## 🔄 CHANGELOG

### 2025-10-02 - Sessione 3: Lista docenti con budgets
- ✅ Creato API endpoint `/api/teachers/list-with-budgets`:
  - JOIN teachers con teacher_budgets per anno attivo
  - Campi calcolati: modulesAvailable, percentageUsed
  - Ordinamento per cognome
- ✅ Aggiornata pagina `/dashboard/teachers`:
  - Client component con fetch da nuova API
  - Tabella con 7 colonne: Cognome, Nome, Email, Moduli (Annuali/Usati/Disponibili), Utilizzo%
  - Search bar con filtro real-time su cognome/nome/email
  - Badge colorati per percentuale utilizzo (verde/giallo/rosso)
  - Click su riga → navigazione a dettaglio docente
  - Loading state e error handling
- ✅ Commit: 31998f1

### 2025-10-02 - Sessione 2: Dashboard con dati reali
- ✅ Creato API endpoint `/api/reports/overview` con statistiche reali
- ✅ Creato API endpoint `/api/activities/weekly` per attività settimanali
- ✅ Dashboard aggiornata con dati reali da Supabase:
  - Totale docenti
  - Moduli da pianificare (disponibili - usati)
  - Moduli pianificati (status='planned')
  - Moduli recuperati (status='completed')
  - Tabella attività settimana corrente con docente, tipo, stato
- ✅ Commits: 3b72026 (dashboard UI), 1c78561 (API endpoints)

### 2025-10-02 - Sessione 1: Database setup
- ✅ Raccolti requisiti completi dall'utente
- ✅ Aggiornato schema Prisma con `module_number`, `class_name`
- ✅ Modificato default status da "completed" a "planned"
- ✅ Applicata migration Supabase con successo
- ✅ Commit: 3cfaa07

---

*Questo documento viene aggiornato durante l'implementazione.*
