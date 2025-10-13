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
     - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` (Supabase)
5. Click **Create**
6. **Save** the **Client ID** and **Client Secret** (you'll need these next)

## Step 2: Configure Supabase Authentication

### 2.1 Enable Google Provider

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click **Enable**

### 2.2 Configure Google Provider Settings

1. Enter the credentials from Step 1.2:
   - **Client ID**: Paste your Google OAuth Client ID
   - **Client Secret**: Paste your Google OAuth Client Secret
2. Configure additional parameters:
   - **Redirect URL**: Copy the value shown (e.g., `https://<project-ref>.supabase.co/auth/v1/callback`)
   - Add this URL to your Google Cloud Console redirect URIs (if not already done)
3. In **Additional Configuration** → **Advanced Settings**, add:
   ```json
   {
     "hd": "piaggia.it"
   }
   ```
   This restricts authentication to @piaggia.it domain only.
4. Click **Save**

## Step 3: Configure Environment Variables

### 3.1 Update `.env.local`

Add or update the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to production URL in prod

# Google OAuth (Optional - only if direct integration needed)
# These are already configured in Supabase, but you may want them for reference
# GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3.2 Production Environment

For production deployment (e.g., Vercel):

1. Add environment variables in your hosting dashboard
2. Update `NEXT_PUBLIC_APP_URL` to your production domain
3. Ensure Google Cloud Console has production redirect URIs

## Step 4: Test Authentication

### 4.1 Run Database Migration

First, apply the database migration to add role constraints and indexes:

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Manually run the migration SQL
# Copy contents of supabase/migrations/20250113_teacher_auth_setup.sql
# Execute in Supabase Dashboard → SQL Editor
```

### 4.2 Verify Teacher Email Data

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

### 4.3 Test Login Flow

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

### 4.4 Expected Behavior

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

## Step 5: Security Verification

### 5.1 Domain Restriction Test

Try logging in with a non-@piaggia.it Google account. You should see an error message.

### 5.2 Role Separation Test

1. Log in as teacher → Verify redirect to `/dashboard/teacher`
2. Try accessing `/dashboard` (admin area) → Should see 403/redirect
3. Log out and log in as admin → Verify redirect to `/dashboard`
4. Try accessing `/dashboard/teacher` → Should see 403/404

### 5.3 Data Isolation Test

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
