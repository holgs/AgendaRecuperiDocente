# Conteggio dei minuti di recupero

L'app usa Next.js App Router: le pagine in `app/dashboard` chiamano le API in
`app/api`; queste interrogano Supabase con la sessione dell'utente e le relative
regole RLS. Il monte ore è in `teacher_budgets`, le durate e gli stati effettivi
sono in `recovery_activities`. Le durate delle singole attività sono quelle
registrate alla creazione, anche quando la griglia oraria viene modificata.

## Fonte dei totali nelle dashboard

`lib/budgets/usage.ts` legge le attività dell'anno scolastico e del docente,
seguendo la paginazione, e distingue:

- **Recuperato**: somma dei minuti delle sole attività `completed`.
- **Pianificato**: somma dei minuti delle sole attività `planned`.
- **Utilizzo complessivo**: recuperato + pianificato.
- **Da pianificare / disponibile**: monte ore meno utilizzo complessivo.
- **Ancora da recuperare**: monte ore meno recuperato (include i pianificati).

I saldi visualizzati hanno minimo zero; i minuti recuperati effettivi non
vengono troncati al monte ore. La percentuale di utilizzo usa i minuti, non i
moduli arrotondati. Il pulsante di creazione considera i minuti disponibili.

Le API del profilo docente, del dettaglio amministrativo e dell'elenco docenti
usano questa fonte; anche la validazione del budget alla creazione e il report
riepilogativo calcolano dalle attività. Completamento e riapertura aggiornano
sia l'elenco sia il riepilogo docente.

I campi storici `teacher_budgets.minutes_used` e `modules_used` restano per
compatibilità, ma non sono autorevoli per queste viste e validazioni: le RLS
consentono al docente di leggere il budget, non di aggiornarlo. Un UPDATE può
quindi non toccare righe senza segnalare errore. Non servono migrazioni né una
nuova importazione del monte ore per correggere le dashboard esistenti.

## Verifica

`npm test` esegue i test di regressione del calcolo, delle API e della pagina
React. Il caso di riferimento è 1050 minuti annui, due attività completate da
55 e 50 minuti: recuperati 105, pianificati 0, disponibili/residui 945, utilizzo
10%. Sono coperti anche stati misti, completamento/riapertura, rimozione di un
piano, anni precedenti, altri docenti, budget assente, paginazione, errori di
lettura e rifiuto di una nuova attività che supererebbe i minuti disponibili.
