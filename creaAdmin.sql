-- Query per creare/aggiornare utente admin holger.ferrero@piaggia.it
-- Da eseguire nella console SQL di Supabase

-- 1. Prima verifica se l'utente esiste già nella tabella users
SELECT id, email, role, name FROM users WHERE email = 'holger.ferrero@piaggia.it';

-- 2. Se l'utente esiste, aggiorna il ruolo ad admin
UPDATE users
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'holger.ferrero@piaggia.it';

-- 3. Se l'utente NON esiste, crealo (sostituire 'GENERATED_UUID' con un UUID valido)
-- INSERT INTO users (id, email, role, name, created_at, updated_at)
-- VALUES (gen_random_uuid(), 'holger.ferrero@piaggia.it', 'admin', 'Holger Ferrero', NOW(), NOW());

-- 4. Verifica il risultato
SELECT id, email, role, name, created_at, updated_at FROM users WHERE email = 'holger.ferrero@piaggia.it';

-- NOTA: Per impostare la password 'fnfavcb', devi:
-- 1. Andare in Authentication > Users nella dashboard di Supabase
-- 2. Cercare l'utente holger.ferrero@piaggia.it
-- 3. Se non esiste, cliccare "Add user" e inserire email e password
-- 4. Se esiste, cliccare sui tre punti > "Reset password" e impostare la nuova password