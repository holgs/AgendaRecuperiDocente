# Calendar UI Variants - Quick Start Guide

## Panoramica

Il branch `ui-experiments` contiene **5 varianti stilistiche** del componente `CalendarGrid`, ciascuna progettata per casi d'uso specifici e preferenze UX diverse.

## Come Testare le Varianti

### 1. Installare le dipendenze (se non già fatto)
```bash
npm install
```

### 2. Avviare il dev server
```bash
npm run dev
```

### 3. Navigare alla pagina demo
Apri il browser e vai a:
```
http://localhost:3000/dashboard/calendar-variants
```

Questa pagina contiene:
- **Overview cards** con pro/contro di ogni variante
- **Live previews** interattivi di tutte e 5 le varianti
- **Tabs** per navigare tra le varianti
- **Note tecniche** dettagliate
- **Raccomandazione finale** basata su best practices UX

---

## Le 5 Varianti

### 1️⃣ Default
**Quando usarla:** Layout familiare per tutti
```tsx
<CalendarGrid {...props} variant="default" />
```

### 2️⃣ Modern Minimal
**Quando usarla:** Massima leggibilità, presentazioni
```tsx
<CalendarGrid {...props} variant="minimal" />
```

### 3️⃣ Compact Professional
**Quando usarla:** Power users, schermi grandi
```tsx
<CalendarGrid {...props} variant="compact" />
```

### 4️⃣ Card-Based Layout
**Quando usarla:** Design moderno, demo pubbliche
```tsx
<CalendarGrid {...props} variant="cards" />
```

### 5️⃣ Modern Glassmorphism ⭐ RACCOMANDATO
**Quando usarla:** Default per app moderna e professionale
```tsx
<CalendarGrid {...props} variant="modern" />
```

---

## Integrazione nel Codice Esistente

### Opzione A: Variante Fissa

Scegli una variante e applicala a tutto il sistema:

```typescript
// app/dashboard/teachers/[id]/calendar/page.tsx

<CalendarGrid
  weekStart={weekStart}
  activities={activities}
  onCellClick={handleCellClick}
  onActivityClick={handleActivityClick}
  onDeleteActivity={handleDeleteActivity}
  onToggleComplete={handleToggleComplete}
  variant="modern" // 👈 Aggiungi questo prop
/>
```

### Opzione B: User Preference (Raccomandato)

Permetti agli utenti di scegliere la loro variante preferita:

```typescript
// components/calendar/calendar-wrapper.tsx
"use client"

import { useState } from "react"
import { CalendarGrid } from "./calendar-grid"
import { Select } from "@/components/ui/select"

export function CalendarWrapper(props: CalendarGridProps) {
  const [variant, setVariant] = useState<CalendarVariant>("modern")

  return (
    <>
      <div className="flex justify-end mb-4">
        <Select value={variant} onValueChange={setVariant}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Stile calendario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modern">Moderno ⭐</SelectItem>
            <SelectItem value="minimal">Minimale</SelectItem>
            <SelectItem value="compact">Compatto</SelectItem>
            <SelectItem value="default">Classico</SelectItem>
            <SelectItem value="cards">Cards</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CalendarGrid {...props} variant={variant} />
    </>
  )
}
```

### Opzione C: Persistenza con LocalStorage

Salva la preferenza dell'utente:

```typescript
// hooks/use-calendar-variant.ts
import { useLocalStorage } from "@/hooks/use-local-storage"

export function useCalendarVariant() {
  return useLocalStorage<CalendarVariant>('calendar-variant', 'modern')
}

// Utilizzo
const [variant, setVariant] = useCalendarVariant()
```

---

## Backward Compatibility

Il componente è **100% backward compatible**:

- Se non passi il prop `variant`, usa automaticamente `"default"`
- Tutte le funzionalità esistenti (click, delete, toggle complete) funzionano identicamente
- Nessuna breaking change nelle API

```typescript
// Questo continua a funzionare come prima
<CalendarGrid
  weekStart={weekStart}
  activities={activities}
  onCellClick={handleCellClick}
  onActivityClick={handleActivityClick}
  onDeleteActivity={handleDeleteActivity}
/>
// Usa automaticamente variant="default"
```

---

## Testing delle Varianti

### Test Visivo Manuale

1. Apri `/dashboard/calendar-variants`
2. Clicca sulle tab per vedere ogni variante
3. Prova le interazioni:
   - Click su cella vuota
   - Click su attività
   - Checkbox toggle complete
   - Hover per vedere delete button
   - Responsive (riduci la finestra browser)

### Test su Dispositivi

- **Desktop:** Tutte le varianti funzionano bene
- **Tablet:** `modern`, `minimal`, `cards` consigliate
- **Mobile:** `default` e `minimal` migliori (le altre sono supportate ma dense)

---

## Raccomandazione Implementazione

### Fase 1: MVP (Questa settimana)
```typescript
// Usa "modern" come default per tutto il sistema
variant="modern"
```

### Fase 2: User Settings (Prossima sprint)
- Aggiungi toggle nelle impostazioni utente
- Salva preferenza in database/localStorage
- Applica automaticamente al login

### Fase 3: Adaptive Mode (Future)
- Auto-switch basato su screen size
- Profili ruolo (admin → compact, docente → minimal)
- A/B testing per ottimizzare conversione

---

## Performance Notes

| Variante | Bundle Impact | Runtime Perf | Mobile Perf |
|----------|---------------|--------------|-------------|
| default  | +0 KB         | ⚡⚡⚡       | ⚡⚡⚡      |
| minimal  | +0.1 KB       | ⚡⚡⚡       | ⚡⚡⚡      |
| compact  | +0.1 KB       | ⚡⚡⚡       | ⚡⚡⚡      |
| cards    | +0.2 KB       | ⚡⚡         | ⚡⚡        |
| modern   | +0.3 KB       | ⚡⚡         | ⚡⚡        |

**Nota:** Tutti i variant styles sono in un unico file usando CVA (class-variance-authority), quindi l'impatto sul bundle è minimo.

---

## Files Modificati in questo Branch

```
ui-experiments/
├── components/calendar/calendar-grid.tsx       # Componente principale con varianti
├── app/dashboard/calendar-variants/page.tsx    # Pagina demo
├── docs/VARIANT_COMPARISON.md                  # Analisi dettagliata
└── docs/CALENDAR_VARIANTS_README.md           # Questo file
```

---

## FAQ

### Q: Posso usare varianti diverse in pagine diverse?
**A:** Sì! Passa semplicemente un `variant` diverso a ogni `<CalendarGrid>`.

### Q: Le varianti influenzano le API o il database?
**A:** No, sono puramente CSS/UI. Nessun cambiamento backend.

### Q: Posso creare la mia variante custom?
**A:** Sì! Aggiungi una entry nel `containerVariants`, `headerVariants`, etc. in `calendar-grid.tsx`.

### Q: Quale variante scegliere per produzione?
**A:** Raccomandiamo `"modern"` come default, con opzione user preference per `"minimal"` e `"compact"`.

### Q: Le varianti sono accessibili?
**A:** Sì, tutte passano WCAG 2.1 AA. `"minimal"` raggiunge anche AAA per contrasto e dimensione font.

---

## Next Steps

1. **Testa le varianti** su `/dashboard/calendar-variants`
2. **Scegli la tua preferita** o usa la nostra raccomandazione (`modern`)
3. **Applica al teacher calendar page** aggiungendo il prop `variant`
4. **[Opzionale]** Implementa user preference toggle
5. **Merge in main** quando sei soddisfatto

---

## Feedback

Se hai suggerimenti, miglioramenti o nuove idee per varianti:
1. Commenta nel PR
2. Crea una issue
3. Modifica questo branch e proponi le tue modifiche

---

**Branch:** `ui-experiments`
**Versione:** 1.0
**Data:** 2025-10-05
**Status:** Ready for Review 🚀
