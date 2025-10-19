# Google OAuth Configuration Guide

This guide explains how to configure Google Workspace authentication for teacher access in the AgendaRecuperiDocente system.

## Prerequisites

- Access to Supabase Dashboard
- Google Workspace admin account for piaggia.it domain
- Supabase project URL and keys

## Step 1: Configure Google Cloud Console

### 1.1 Create OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Select **Internal** (for Google Workspace users only)
5. Fill in the required fields:
   - **App name**: AgendaRecuperiDocente
   - **User support email**: your-email@piaggia.it
   - **Developer contact**: your-email@piaggia.it
6. Click **Save and Continue**

### 1.2 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Web application**
4. Configure:
   - **Name**: AgendaRecuperiDocente Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://your-production-domain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback` (development)
     - `https://your-production-domain.com/auth/callback` (production)
     - `https://ziytqufymrbkchbbonra.supabase.co/auth/v1/callback` (Supabase callback)
5. Click **Create**
6. **Save** the **Client ID** and **Client Secret** (you'll need these next)
   - Note: Store these credentials securely - they should not be committed to version control

## Step 2: Configure Supabase Authentication

### 2.1 Enable Google Provider

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click **Enable**

### 2.2 Configure Google Provider Settings

1. Enter the credentials from Step 1.2:
   - **Client ID**: Paste your Google OAuth Client ID here
   - **Client Secret**: Paste your Google OAuth Client Secret here
2. **Redirect URL**: Il sistema mostrerà automaticamente:
   - **Redirect URL**: Copy the value shown (e.g., `https://<project-ref>.supabase.co/auth/v1/callback`)

   - Assicurati che questo URL sia presente nella lista degli **Authorized redirect URIs** in Google Cloud Console (Step 1.2)
3. Click **Save**

**IMPORTANTE**: Il parametro `hd=piaggia.it` per restringere l'accesso al solo dominio @piaggia.it **NON si configura nel Supabase Dashboard**. Questo parametro verrà configurato direttamente nel codice dell'applicazione (vedi Step 4 qui sotto).

## Step 3: Configure Environment Variables

Le variabili di ambiente sono già configurate correttamente in `.env.local`. Non è necessario modificare nulla:

```env
# Supabase Configuration (già configurato)
NEXT_PUBLIC_SUPABASE_URL=https://ziytqufymrbkchbbonra.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Cambierà in produzione
```

**Nota**: Le credenziali Google OAuth (Client ID e Secret) sono già state configurate nel Supabase Dashboard (Step 2.2), quindi non è necessario aggiungerle come variabili d'ambiente.

## Step 4: Aggiungere il pulsante "Accedi con Google" nella Login Page

Il parametro `hd=piaggia.it` per restringere l'accesso al dominio @piaggia.it viene configurato nel codice quando si chiama `signInWithOAuth`.

Modifica il file `app/login/page.tsx` aggiungendo il pulsante Google:

```typescript
// Aggiungi questa funzione nel componente LoginPage
async function handleGoogleLogin() {
  setIsLoading(true)
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: 'piaggia.it'  // ← Restringe al dominio @piaggia.it
        }
      }
    })

    if (error) throw error
  } catch (error: any) {
    toast({
      variant: "destructive",
      title: "Errore",
      description: error.message || "Errore durante l'accesso con Google"
    })
  } finally {
    setIsLoading(false)
  }
}

// Aggiungi questo pulsante DOPO il form di login esistente (dopo il </form>)
<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">
      Oppure
    </span>
  </div>
</div>

<Button
  type="button"
  variant="outline"
  className="w-full"
  disabled={isLoading}
  onClick={handleGoogleLogin}
>
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
  Accedi con Google (Docenti)
</Button>
```

**Spiegazione**:
- Il parametro `queryParams: { hd: 'piaggia.it' }` indica a Google di mostrare solo gli account del dominio piaggia.it
- La validazione lato server (in `app/auth/callback/route.ts`) controlla che l'email finisca con `@piaggia.it`
- Questo offre una doppia protezione: client-side (UX migliore) + server-side (sicurezza)

## Step 5: Test Authentication

### 5.1 Run Database Migration

First, apply the database migration to add role constraints and indexes:

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Manually run the migration SQL
# Copy contents of supabase/migrations/20250113_teacher_auth_setup.sql
# Execute in Supabase Dashboard → SQL Editor
```

### 5.2 Verify Teacher Email Data

Before enabling teacher access, ensure all teachers have valid emails:

```sql
-- Check for teachers without email
SELECT id, cognome, nome, email
FROM teachers
WHERE email IS NULL OR email = '';

-- Check for non-@piaggia.it emails
SELECT id, cognome, nome, email
FROM teachers
WHERE email NOT LIKE '%@piaggia.it';
```

If any teachers are missing emails, update them manually or via CSV import.

### 5.3 Test Login Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`

3. Click **"Accedi con Google"** button

4. You should be redirected to Google's consent screen

5. Select your @piaggia.it account

6. Grant permissions

7. You'll be redirected back to the app

### 5.4 Expected Behavior

**Scenario A: First-time teacher login (with existing teacher record)**
- User logs in with Google (@piaggia.it)
- System finds matching teacher record by email
- Creates `users` record with role='teacher'
- Links `teachers.user_id` to new user
- Redirects to `/dashboard/teacher`

**Scenario B: Non-piaggia.it email**
- Google login proceeds but email domain is wrong
- System denies access
- Redirects to `/access-denied` with error message

**Scenario C: No teacher record found**
- Google login succeeds but no matching teacher in database
- Redirects to `/access-denied` with message to contact admin

**Scenario D: Admin login**
- Admin uses email/password login (existing flow)
- Redirects to `/dashboard` (admin area)

## Step 6: Security Verification

### 6.1 Domain Restriction Test

Try logging in with a non-@piaggia.it Google account. You should see an error message.

### 6.2 Role Separation Test

1. Log in as teacher → Verify redirect to `/dashboard/teacher`
2. Try accessing `/dashboard` (admin area) → Should see 403/redirect
3. Log out and log in as admin → Verify redirect to `/dashboard`
4. Try accessing `/dashboard/teacher` → Should see 403/404

### 6.3 Data Isolation Test

1. Log in as Teacher A
2. Call `GET /api/teachers/me/activities`
3. Verify only Teacher A's activities are returned
4. Try accessing `/api/teachers/me/activities?teacher_id=other-id`
5. Should still only see Teacher A's activities (teacher_id param ignored)

## Troubleshooting

### Issue: "Redirect URI mismatch" error

**Solution**: Ensure all redirect URIs in Google Cloud Console match exactly (including http/https and trailing slashes):
- Supabase callback: `https://<project-ref>.supabase.co/auth/v1/callback`
- App callback: `http://localhost:3000/auth/callback` or `https://yourdomain.com/auth/callback`

### Issue: "Access denied" after successful Google login

**Possible causes**:
1. **No matching teacher record**: Check if teacher email exists in database
2. **Email mismatch**: Google account email ≠ teacher.email in database
3. **No budget loaded**: Teacher record exists but no budget for active school year

**Debug steps**:
```sql
-- Check if teacher exists with this email
SELECT * FROM teachers WHERE email = 'teacher.email@piaggia.it';

-- Check if teacher has budget for active school year
SELECT tb.*, sy.name, sy.is_active
FROM teacher_budgets tb
JOIN school_years sy ON sy.id = tb.school_year_id
WHERE tb.teacher_id = 'teacher-uuid-here'
AND sy.is_active = true;
```

### Issue: Teacher can access admin routes

**Solution**: Clear browser cache and cookies, then re-login. Verify middleware is checking roles correctly.

### Issue: "Invalid grant" error from Google

**Solution**:
1. Revoke app access in Google Account settings
2. Clear browser cookies
3. Try logging in again

## Production Deployment Checklist

- [ ] Google Cloud Console configured with production redirect URIs
- [ ] Supabase Google provider enabled and configured
- [ ] Environment variables set in hosting platform (Vercel, etc.)
- [ ] Database migration applied to production database
- [ ] All teachers have valid @piaggia.it emails in database
- [ ] Security tests passed (domain restriction, role separation)
- [ ] Monitoring/logging configured for auth failures

## Next Steps

After successful OAuth configuration:

1. **User Provisioning**: Test automatic user creation on first teacher login
2. **Teacher Dashboard**: Build the teacher dashboard UI (`/dashboard/teacher`)
3. **Activity Management**: Implement teacher API endpoints (`/api/teachers/me/*`)
4. **Budget Display**: Show teacher's budget status in dashboard
5. **Testing**: Create E2E tests for complete teacher flow

## Support

If you encounter issues:
1. Check Supabase Dashboard → Authentication → Logs for auth errors
2. Review browser console for client-side errors
3. Check Next.js server logs for API errors
4. Verify environment variables are correctly set

For Google Workspace-specific issues, contact your organization's Google Workspace admin.
