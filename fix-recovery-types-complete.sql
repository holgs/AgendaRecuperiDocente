-- ============================================================
-- SCRIPT COMPLETO PER RISOLVERE IL PROBLEMA RECOVERY TYPES
-- Esegui questo script nel SQL Editor di Supabase
-- ============================================================

-- STEP 1: Verifica lo stato attuale del campo default_duration
-- ============================================================
SELECT
    'BEFORE FIX - default_duration status' as check_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'recovery_types' AND column_name = 'default_duration';

-- STEP 2: Applica la migrazione per rendere default_duration nullable
-- ============================================================
ALTER TABLE recovery_types
ALTER COLUMN default_duration DROP NOT NULL;

-- STEP 3: Verifica che la migrazione sia stata applicata
-- ============================================================
SELECT
    'AFTER FIX - default_duration status' as check_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'recovery_types' AND column_name = 'default_duration';
-- Se is_nullable = 'YES', la migrazione è OK ✅

-- STEP 4: Crea utente di test per sviluppo locale (se non esiste)
-- ============================================================
-- IMPORTANTE: Prima crea l'utente in Authentication > Users nella Dashboard
-- Email: test@localhost.dev
-- Password: test123456
-- Auto Confirm User: ✅ ABILITATO

-- Trova l'UUID dell'utente di test
SELECT
    'Test user in auth.users' as check_name,
    id,
    email,
    confirmed_at
FROM auth.users
WHERE email = 'test@localhost.dev';

-- Se l'utente esiste in auth.users, aggiungi alla tabella users
-- SOSTITUISCI 'UUID_FROM_ABOVE' con l'UUID reale dall'output sopra
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Prendi l'UUID dell'utente di test
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = 'test@localhost.dev';

    IF test_user_id IS NOT NULL THEN
        -- Inserisci o aggiorna nella tabella users
        INSERT INTO users (id, email, role, name, created_at, updated_at)
        VALUES (
            test_user_id,
            'test@localhost.dev',
            'admin',
            'Test User Local Dev',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin',
            email = 'test@localhost.dev',
            updated_at = NOW();

        RAISE NOTICE '✅ Test user configured successfully with ID: %', test_user_id;
    ELSE
        RAISE NOTICE '⚠️  Test user not found in auth.users. Create it via Dashboard > Authentication > Users';
    END IF;
END $$;

-- STEP 5: Verifica l'utente di test
-- ============================================================
SELECT
    'Test user in users table' as check_name,
    u.id,
    u.email,
    u.role,
    u.name,
    CASE
        WHEN au.id IS NOT NULL THEN '✅ Exists in auth.users'
        ELSE '❌ Missing in auth.users'
    END as auth_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'test@localhost.dev';

-- STEP 6: Verifica i permessi RLS (Row Level Security)
-- ============================================================
SELECT
    'RLS policies for recovery_types' as check_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'recovery_types';

-- STEP 7: Test insert (questo dovrebbe funzionare dopo le fix)
-- ============================================================
-- NOTA: Commenta questo se non vuoi inserire dati di test
-- Questo è solo per verificare che l'inserimento funzioni

DO $$
DECLARE
    test_user_id uuid;
    new_recovery_type_id uuid;
BEGIN
    -- Prendi l'UUID dell'utente di test
    SELECT id INTO test_user_id
    FROM users
    WHERE email = 'test@localhost.dev';

    IF test_user_id IS NOT NULL THEN
        -- Prova a inserire una tipologia di test
        INSERT INTO recovery_types (
            name,
            description,
            color,
            default_duration,  -- questo può essere NULL ora
            requires_approval,
            is_active,
            created_by
        ) VALUES (
            'TEST - Sportello ' || NOW()::text,
            'Tipologia di test creata dallo script',
            '#FF5733',
            NULL,  -- Testiamo con NULL
            false,
            true,
            test_user_id
        )
        RETURNING id INTO new_recovery_type_id;

        RAISE NOTICE '✅ Test recovery type created successfully with ID: %', new_recovery_type_id;

        -- Pulisci il test (opzionale)
        -- DELETE FROM recovery_types WHERE id = new_recovery_type_id;
    ELSE
        RAISE NOTICE '⚠️  Cannot test insert: test user not found';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test insert failed: % - %', SQLERRM, SQLSTATE;
END $$;

-- STEP 8: Mostra tutte le tipologie esistenti
-- ============================================================
SELECT
    'Existing recovery types' as check_name,
    id,
    name,
    default_duration,
    is_active,
    created_at
FROM recovery_types
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- FINE SCRIPT - Controlla i risultati sopra
-- ============================================================
-- Se vedi "✅" accanto a tutti i check, tutto è configurato correttamente!
-- Ora riavvia il server Next.js (npm run dev) e prova a creare una tipologia
