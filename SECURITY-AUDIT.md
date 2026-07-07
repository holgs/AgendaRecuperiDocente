# Security Audit — AgendaRecuperiDocente

**Data audit:** 2026-07-06
**Ambiente analizzato:** produzione (Vercel + Supabase progetto `ziytqufymrbkchbbonra`)
**Autore:** Claude (Punto 1 del piano di lavoro)

> Questo documento riporta i risultati dell'audit di sicurezza. Le severità seguono la scala
> **Critica / Alta / Media / Bassa**. Ogni voce indica dove si trova il problema, l'impatto e la
> correzione consigliata. Le azioni che richiedono la console Supabase/Vercel sono marcate
> **[AZIONE UTENTE]** perché non ho le credenziali per eseguirle.

---

## Riepilogo esecutivo

| # | Severità | Problema | Stato |
|---|----------|----------|-------|
| C1 | **CRITICA** | RLS assente/permissiva su tutte le tabelle: la anon key (pubblica) legge e scrive tutti i dati | Aperto — richiede intervento DB |
| C2 | **CRITICA** | Segreti nella history pubblica del repo (password DB, password admin) | Mitigato in parte (Punto 0) — **rotazione obbligatoria** |
| H1 | **Alta** | Auto-provisioning assegna ruolo `admin` a qualsiasi utente autenticato | Aperto |
| H2 | **Alta** | Endpoint di debug `test-activity` in produzione (crea utenti admin, leaka stack) | Aperto |
| H3 | **Alta** | Endpoint di mutazione senza controllo di ruolo admin (broken access control) | Aperto |
| H4 | **Alta** | Vulnerabilità dipendenze: Next.js (1 critica) + 7 high | Aperto |
| H5 | **Alta** | Messaggi d'errore espongono stack trace e dettagli interni DB | Aperto |
| M1 | Media | Nessun rate limiting su login ed export | Aperto |
| M2 | Media | `console.log` con PII e payload completi in produzione | Aperto |
| M3 | Media | Lookup ruolo per `email` invece che per `id` (identità mutabile) | Aperto |
| M4 | Media | `getCurrentUser` usa un ruolo `viewer` inesistente come default | Aperto |
| L1 | Bassa | `NEXTAUTH_SECRET` placeholder / config NextAuth morta | Aperto |
| L2 | Bassa | `.select('*')` restituisce colonne non necessarie | Aperto |

---

## C1 — [CRITICA] Row Level Security assente o permissiva su tutte le tabelle

**Dove:** database Supabase (tutte le tabelle: `users`, `teachers`, `recovery_activities`,
`teacher_budgets`, `school_years`, `recovery_types`, `activity_logs`, `system_configs`).

**Evidenza (test live contro la produzione, usando solo la anon key pubblica):**

```
GET /rest/v1/users?select=id            → 200, content-range 0-138/139   (139 utenti)
GET /rest/v1/recovery_activities        → 200, content-range 0-999/2172  (2172 attività)
GET /rest/v1/teachers|teacher_budgets|activity_logs|system_configs → 200 con dati
PATCH /rest/v1/recovery_types?id=eq...  → 204 (scrittura consentita)
DELETE /rest/v1/recovery_types?id=eq... → 204 (cancellazione consentita)
```

La anon key è per definizione **pubblica** (è inclusa nel bundle JavaScript client, in
`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Chiunque la estragga dal browser può interrogare PostgREST
direttamente, **bypassando completamente le API Next.js e il middleware**, e:

- leggere nome, cognome ed email di **tutti i 139 utenti** e **134 docenti**;
- leggere tutte le **2172 attività di recupero**, i budget, i log;
- **modificare o cancellare** qualsiasi record.

Le policy nel repo confermano la causa: in `supabase/migrations/20250113_teacher_auth_setup.sql`
**tutte** le policy per `recovery_activities` sono lasciate commentate; per le altre tabelle non
esistono policy restrittive. La migration `20250116_users_rls_policies.sql` definisce solo policy
`auth.uid() = id` sulla tabella `users`, ma la lettura anonima restituisce comunque tutte le righe —
quindi o RLS è **disabilitata** sulle tabelle, o esiste una policy permissiva che la sovrascrive.

**Impatto:** violazione totale di riservatezza e integrità dei dati. Trattandosi di dati personali
di 139 persone accessibili pubblicamente, è anche un potenziale **data breach ai sensi del GDPR**.

**Correzione consigliata:**
1. Abilitare RLS su **ogni** tabella: `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;`
2. Definire policy esplicite:
   - **admin** (`users.role = 'admin'`): accesso completo (SELECT/INSERT/UPDATE/DELETE) su tutte le tabelle;
   - **teacher**: SELECT/gestione solo sulle proprie righe (`teacher_id` collegato al proprio `user_id`);
   - nessun accesso al ruolo `anon`.
3. Verificare che il ruolo `service_role` (usato solo server-side) non sia mai esposto al client.
4. Ripetere il test anonimo qui sopra dopo l'intervento: deve restituire `0` righe / `401`.

> Nota: questa correzione è **prerequisito** per il Punto 2 ("un docente non deve poter leggere i
> dati di altri docenti"): senza RLS corretta, qualsiasi controllo a livello di API è aggirabile.

---

## C2 — [CRITICA] Segreti committati nella history pubblica del repository

**Dove:** history git del repo pubblico `holgs/AgendaRecuperiDocente`.

- `.env.local` (commit `89e2cb3` "Add environment configuration"): contiene in chiaro
  `DATABASE_URL` / `DIRECT_URL` con la **password del database Postgres** e la anon key.
- `creaAdmin.sql`: contiene in chiaro la **password dell'account admin** (`holger.ferrero@piaggia.it`).
- `setup-local-dev-user.md`: contiene una password di sviluppo (`test123456`, basso rischio).

**Stato / mitigazione (Punto 0, già eseguito su branch `security/punto-0-secrets`):**
- `.env.local` era già stato rimosso dal tracking in un commit precedente;
- `creaAdmin.sql` e `setup-local-dev-user.md` rimossi dal tracking (copie locali conservate);
- `.gitignore` corretto e irrobustito.

**Limite importante:** rimuovere un file dal tracking **non lo elimina dalla history**. I segreti
già pushati restano leggibili nella cronologia pubblica finché la history non viene riscritta
(`git filter-repo` / BFG) e forzata — operazione delicata e coordinata. **Indipendentemente da ciò,
i segreti vanno considerati compromessi.**

**[AZIONE UTENTE] obbligatoria:**
1. **Ruotare la password del database** da Supabase → Settings → Database → Reset database password.
2. Aggiornare `DATABASE_URL` / `DIRECT_URL` nelle env di **Vercel** (Production/Preview/Development).
3. **Cambiare la password** dell'account admin `holger.ferrero@piaggia.it` da Supabase → Authentication → Users.
4. (Consigliato) **Rigenerare le API key** Supabase (anon + service_role) da Settings → API, dato che
   la anon key è stata esposta e usata anche per questo audit; aggiornarle poi su Vercel e in locale.
5. (Opzionale ma consigliato) riscrivere la history git per rimuovere i segreti dai commit passati.

---

## H1 — [Alta] Auto-provisioning assegna ruolo `admin` di default

**Dove:**
- `supabase/migrations/20250116_insert_authenticated_users.sql` — inserisce **tutti** gli utenti di
  `auth.users` in `public.users` con `role = 'admin'` hardcoded.
- `app/api/test-activity/route.ts:41` — crea l'utente con `role: 'admin'`.
- Contrasto con `lib/auth/roles.ts::provisionTeacherUser`, che invece assegna `role: 'teacher'`.

**Impatto:** esistono percorsi di provisioning che promuovono automaticamente ad **admin** utenti che
dovrebbero essere docenti (privilege escalation). Attualmente in produzione ci sono 3 admin e 134
teacher, ma la logica hardcoded è un rischio latente ad ogni nuovo accesso non gestito da
`provisionTeacherUser`.

**Correzione consigliata:** un solo percorso di provisioning, default `teacher`; assegnazione admin
solo esplicita e manuale. Rimuovere l'hardcode `'admin'` dalla migration di sync.

---

## H2 — [Alta] Endpoint di debug in produzione: `/api/test-activity`

**Dove:** `app/api/test-activity/route.ts`.

**Problema:** endpoint diagnostico raggiungibile in produzione che (a) **crea automaticamente record
utente con ruolo admin**, (b) scrive attività nel DB, (c) restituisce al client `error.details`,
`error.hint`, `error.code` e `error.stack`. Non è referenziato da alcun componente UI.

**Correzione consigliata:** **eliminare il file**. Nessun endpoint di debug deve esistere in produzione.

---

## H3 — [Alta] Endpoint di mutazione senza controllo di ruolo (broken access control)

**Dove:** la maggior parte delle route in `app/api/**` verifica solo l'autenticazione
(`supabase.auth.getUser()`), **non il ruolo**. Route interessate (mutazioni):
`activities` (POST/PUT/DELETE), `activities/[id]`, `teachers`, `teachers/[id]`,
`recovery-types`, `school-years`, `budgets/import`, `budgets`.

Solo `users`, `users/[id]` e `settings/clear-activities` usano `requireAdmin()`.

**Impatto:** il middleware protegge per ruolo solo le pagine `/dashboard/**` (UI), ma **non** la
logica di business `/api/**`. Un utente con ruolo `teacher` autenticato può chiamare direttamente le
API e creare/modificare/cancellare attività di **qualsiasi** docente, importare budget, modificare
tipi di recupero e anni scolastici. (In combinazione con C1, l'attacco è possibile anche senza login.)

**Correzione consigliata:** applicare `requireAdmin()` a tutte le route amministrative e
`requireTeacher()` + filtro sulle proprie righe alle route self-service. Non affidarsi al middleware
per l'autorizzazione dei dati.

---

## H4 — [Alta] Vulnerabilità nelle dipendenze

**Evidenza:** `npm audit` → 12 vulnerabilità (1 critica, 7 high, 4 moderate).

- **Next.js (CRITICA):** DoS via Server Actions; information exposure nel dev server; cache key
  confusion sull'Image Optimization API.
- **High:** `flatted` (prototype pollution / DoS), `minimatch` (ReDoS), `glob` (command injection via
  CLI), `ws` (memory disclosure / DoS).
- **Moderate:** `ajv`, `brace-expansion`, `js-yaml`.

**Correzione consigliata:**
1. `npm audit fix` per le correzioni non-breaking.
2. Aggiornare **Next.js** all'ultima 14.x/15.x patchata (la critica riguarda il framework in
   produzione). Verificare `npm run build` e `npm run type-check` dopo l'upgrade.
3. `glob`/`eslint-config-next` richiedono un major (`npm audit fix --force`): valutarlo a parte,
   sono dev-dependency.

---

## H5 — [Alta] Esposizione di stack trace e dettagli interni negli errori

**Dove:** `app/api/activities/route.ts` (ritorna `error.message`), `app/api/test-activity/route.ts`
(ritorna `error.stack`, `error.details`, `error.hint`, `error.code`), e pattern
`error instanceof Error ? error.message : ...` in più route.

**Impatto:** information disclosure — struttura del DB, nomi tabelle/colonne, codici errore Postgres
esposti al client, utili a un attaccante per affinare gli attacchi.

**Correzione consigliata:** loggare i dettagli **solo server-side**; restituire al client messaggi
generici (`{ error: "Errore interno" }`, status 500) senza `message`/`stack`/`details` grezzi.

---

## M1 — [Media] Assenza di rate limiting

**Dove:** login (Supabase Auth gestito, ma senza throttling applicativo) ed endpoint di export
(`/api/reports/export-csv`, `/api/reports/activities-export`).

**Impatto:** brute force sul login, scraping massivo dei dati via export.

**Correzione consigliata:** rate limiting (es. Vercel middleware / Upstash) su login ed export;
diventa rilevante soprattutto per gli endpoint di export del Punto 2.

---

## M2 — [Media] `console.log` con PII e payload completi in produzione

**Dove:** `app/api/activities/route.ts` (log di `user.id`, email, body completo della richiesta,
budget, id), `app/api/test-activity/route.ts`. Viola anche la regola di progetto "no console.log in
production code".

**Correzione consigliata:** rimuovere i log di debug o sostituirli con un logger strutturato che non
registri dati personali.

---

## M3 — [Media] Autorizzazione basata su `email` anziché su `id`

**Dove:** `lib/supabase/middleware.ts:44`, `lib/auth-utils.ts:15`, `lib/auth/roles.ts:61` — il ruolo
viene risolto con `.eq('email', user.email)`. L'email è un attributo potenzialmente mutabile.

**Correzione consigliata:** legare l'identità applicativa a `auth.uid()` (`user.id`) come chiave
primaria di join, non all'email.

---

## M4 — [Media] Ruolo di default `viewer` inesistente

**Dove:** `lib/auth-utils.ts:21` — `role: dbUser?.role || 'viewer'`. Il modello prevede solo
`admin` / `teacher` (vincolo `users_role_check`). Un default `viewer` è incoerente e può generare
comportamenti non definiti nei controlli di ruolo.

**Correzione consigliata:** default sicuro (negazione) invece di un ruolo fantasma; unificare su
`lib/auth/roles.ts`, che è la utility più completa (`auth-utils.ts` sembra un duplicato legacy).

---

## L1 — [Bassa] Config NextAuth morta

`.env.local` contiene `NEXTAUTH_SECRET=your_nextauth_secret_here` e `NEXTAUTH_URL`, ma
l'autenticazione usa Supabase Auth. Config inutilizzata e con placeholder: rimuovere per evitare
confusione.

## L2 — [Bassa] `.select('*')` diffuso

Diverse query usano `.select('*')` restituendo tutte le colonne. Selezionare esplicitamente i campi
necessari riduce la superficie di esposizione dati e il payload.

---

## Note metodologiche

- I test dinamici sono stati eseguiti **in lettura** e con mutazioni **no-op** (PATCH/DELETE su un
  UUID inesistente) per non alterare i dati di produzione.
- La conferma della scrittura anonima (204 su no-op) indica che RLS non blocca la mutazione; non è
  stato eseguito alcun INSERT/UPDATE reale per non modificare dati.
- Analisi statica su: middleware, `lib/auth*`, tutte le 25 route API, migration SQL, `npm audit`.

## Priorità di intervento consigliata

1. **C2** — rotazione segreti (immediata, azione utente).
2. **C1** — abilitare RLS con policy admin/teacher (blocca l'esposizione dati).
3. **H1/H2/H3** — provisioning ruoli, rimozione endpoint debug, `requireAdmin` sulle route.
4. **H5/H4** — sanitizzazione errori + upgrade Next.js.
5. **M/L** — hardening progressivo.
