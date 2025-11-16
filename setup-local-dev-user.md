# Setup Utente di Test per Sviluppo Locale

Google OAuth non funziona su localhost. Usa invece l'autenticazione email/password per lo sviluppo locale.

## Metodo 1: Tramite Dashboard Supabase (CONSIGLIATO)

1. **Vai alla Dashboard Supabase**: https://supabase.com/dashboard
2. **Seleziona il tuo progetto**
3. **Vai su Authentication > Users** (nella sidebar sinistra)
4. **Clicca su "Add user"** (pulsante in alto a destra)
5. **Compila il form**:
   - **Email**: `test@localhost.dev` (o qualsiasi email di test)
   - **Password**: `test123456` (o una password a tua scelta)
   - **Auto Confirm User**: ✅ **IMPORTANTE: Abilita questa opzione!**
6. **Clicca su "Create user"**

7. **Aggiungi l'utente alla tabella `users`**:
   - Vai su **SQL Editor**
   - Copia e incolla questo script (sostituisci l'UUID con quello dell'utente creato):

```sql
-- 1. Trova l'UUID dell'utente appena creato
SELECT id, email FROM auth.users WHERE email = 'test@localhost.dev';

-- 2. Copia l'UUID e sostituiscilo qui sotto, poi esegui l'INSERT
INSERT INTO users (id, email, role, name, created_at, updated_at)
VALUES (
  'INSERISCI_QUI_UUID_COPIATO_SOPRA',
  'test@localhost.dev',
  'admin',
  'Test User',
  NOW(),
  NOW()
);

-- 3. Verifica che l'utente sia stato creato correttamente
SELECT * FROM users WHERE email = 'test@localhost.dev';
```

## Metodo 2: Script SQL Automatico

Esegui questo script nel **SQL Editor** di Supabase:

```sql
-- Crea un utente di test (funziona solo se hai i permessi admin)
-- NOTA: Questo script potrebbe non funzionare se non hai accesso a auth.users
-- In quel caso, usa il Metodo 1

DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Controlla se l'utente esiste già in auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = 'test@localhost.dev';

  IF user_id IS NULL THEN
    RAISE NOTICE 'L''utente non esiste in auth.users. Crealo manualmente tramite Dashboard > Authentication > Users';
  ELSE
    -- L'utente esiste, aggiungi o aggiorna nella tabella users
    INSERT INTO users (id, email, role, name, created_at, updated_at)
    VALUES (user_id, 'test@localhost.dev', 'admin', 'Test User', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', updated_at = NOW();

    RAISE NOTICE 'Utente configurato con successo!';
  END IF;
END $$;
```

## Login nell'Applicazione

Dopo aver creato l'utente:

1. Avvia l'applicazione: `npm run dev`
2. Vai su: http://localhost:3000/login
3. **NON cliccare su "Accedi con Google"**
4. Usa il form email/password:
   - **Email**: `test@localhost.dev`
   - **Password**: `test123456` (o quella che hai scelto)
5. Clicca su **"Accedi"**

## Troubleshooting

### Errore: "Email not confirmed"
- Assicurati di aver abilitato **"Auto Confirm User"** quando hai creato l'utente
- Oppure vai su Authentication > Users, trova l'utente e clicca su "Confirm email"

### Errore: "Invalid login credentials"
- Verifica che email e password siano corrette
- Prova a resettare la password dalla dashboard: Users > tre puntini > "Reset password"

### Errore dopo il login
- Verifica che l'utente esista nella tabella `users`:
  ```sql
  SELECT * FROM users WHERE email = 'test@localhost.dev';
  ```
- Se non esiste, esegui l'INSERT dello script al punto 7 del Metodo 1
