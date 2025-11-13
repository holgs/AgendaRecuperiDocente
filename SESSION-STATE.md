# Session State: Teacher Self-Service Implementation

**Date**: 2025-01-13
**Session ID**: teacher-self-service-implementation
**Current Phase**: ✅ Phase 3 Complete + Deployed → Phase 4 Ready
**Progress**: Backend 100% ✅ | Frontend 0%
**Branch**: `feature/teacher-self-service`
**GitHub**: ✅ Pushed (commit 5cdcc83)
**Database**: ✅ Migration applied to Supabase

## 🎯 Project Goal

Implement Google Workspace SSO authentication for teachers (@piaggia.it domain) to enable self-service activity planning and tracking.

## 🎉 Phase 3 - Backend Implementation: COMPLETE ✅

All 13 backend tasks completed successfully in this session!

## ✅ Completed Work (Session Summary)

### 1. Planning & Architecture (100% Complete)
- ✅ Product specification document created at `docs/product-specs/teacher-self-service.md`
- ✅ Technical architecture designed at `docs/architecture/teacher-authentication.md`
- ✅ 14 sections covering user stories, flows, API contracts, security
- ✅ 8 implementation phases defined with timelines

### 2. Database Foundation (100% Complete)
**File**: `supabase/migrations/20250113_teacher_auth_setup.sql`
- ✅ Added role constraint: `CHECK (role IN ('admin', 'teacher'))`
- ✅ Created indexes:
  - `idx_teachers_email` for OAuth provisioning
  - `idx_teachers_user_id` for reverse lookups
  - `idx_users_email` for authentication
- ✅ Documented RLS policies (commented out, for future use)
- **Action Required**: Run this migration in Supabase Dashboard

### 3. Google OAuth Setup (100% Complete)
**File**: `docs/setup/google-oauth-setup.md`
- ✅ Complete guide for Google Cloud Console configuration
- ✅ Supabase provider setup instructions
- ✅ Environment variables documentation
- ✅ Testing procedures and troubleshooting
- **Action Required by School IT**:
  - Create OAuth Client ID/Secret in Google Cloud Console
  - Configure redirect URIs
  - Enable Google provider in Supabase Dashboard

### 4. Authentication Utilities (100% Complete)
**File**: `lib/auth/roles.ts` (420 lines)
- ✅ `getAuthenticatedUser()` - Returns ExtendedUser with role + teacher linkage
- ✅ `isAdmin()` / `isTeacher()` - Role checks
- ✅ `getCurrentTeacherId()` - Extract teacher ID from auth user
- ✅ `requireAdmin()` / `requireTeacher()` - API route protection (throws on unauthorized)
- ✅ `provisionTeacherUser(email)` - Auto-create user on first Google login
  - Validates @piaggia.it domain
  - Finds matching teacher by email
  - Creates user record with role='teacher'
  - Links via `teachers.user_id`
- ✅ `teacherHasBudget(teacherId)` - Check if budget exists for active school year
- ✅ `getRoleBasedDashboardPath(role)` - Returns '/dashboard' or '/dashboard/teacher'

### 5. OAuth Callback Handler (100% Complete)
**File**: `app/auth/callback/route.ts`
- ✅ Exchanges OAuth code for Supabase session
- ✅ Validates email domain (@piaggia.it only)
- ✅ Calls `provisionTeacherUser()` on first login
- ✅ Checks teacher has budget for active school year
- ✅ Redirects to role-appropriate dashboard
- ✅ Error handling with descriptive redirects to `/access-denied`

### 6. Access Denied Page (100% Complete)
**File**: `app/access-denied/page.tsx`
- ✅ Handles 4 denial scenarios via query param `?reason=`
  - `invalid_domain` - Non-@piaggia.it email used
  - `no_teacher_profile` - Email not found in teachers table
  - `no_budget` - Teacher exists but no budget for active year
  - `unauthorized` - Generic access denial
- ✅ User-friendly error messages in Italian
- ✅ Admin contact information (admin@piaggia.it)
- ✅ Link back to login page

### 7. Enhanced Middleware (100% Complete)
**File**: `lib/supabase/middleware.ts`
- ✅ Extracts user role from database after auth check
- ✅ Role-based route protection:
  - Teachers: Redirect from `/dashboard` to `/dashboard/teacher`
  - Admins: Redirect from `/dashboard/teacher` to `/dashboard`
- ✅ Login page redirect: Teachers → `/dashboard/teacher`, Admins → `/dashboard`
- ✅ Maintains existing auth checks for protected routes

### 8. Teacher Profile API (100% Complete)
**File**: `app/api/teachers/me/route.ts`
- ✅ GET endpoint: Returns teacher profile + current budget
- ✅ Uses `requireTeacher()` for authentication
- ✅ Fetches teacher data from database
- ✅ Queries budget for active school year
- ✅ Calculates:
  - `minutes_remaining` = annual - used
  - `modules_remaining` = annual - used
  - `percentage_used` = (used / annual) * 100
- ✅ Handles missing budget gracefully (returns null with message)

### 9. Documentation (100% Complete)
**Files**:
- ✅ `docs/implementation-progress.md` - Detailed progress tracking
- ✅ `docs/product-specs/teacher-self-service.md` - Full product spec
- ✅ `docs/architecture/teacher-authentication.md` - Technical architecture
- ✅ `docs/setup/google-oauth-setup.md` - OAuth configuration guide

### 10. Teacher Activities API Endpoints (100% Complete) ✅
**Files Created**:
- ✅ `app/api/teachers/me/activities/route.ts` (GET, POST methods)
- ✅ `app/api/teachers/me/activities/[id]/route.ts` (PATCH, DELETE methods)
- ✅ `app/api/teachers/me/activities/[id]/complete/route.ts` (PATCH method)

**Endpoints Implemented**:
1. ✅ **GET /api/teachers/me/activities** - List teacher's activities
   - Query params: school_year_id, status (planned/completed/all)
   - Returns activities with recovery_type and school_year joins
   - Includes summary statistics (total, planned, completed, modules)

2. ✅ **POST /api/teachers/me/activities** - Create activity
   - Budget validation (checks available modules)
   - Overlap detection: Teacher (blocks), Class (warning only)
   - Automatic budget deduction
   - Atomic operation with rollback on failure

3. ✅ **PATCH /api/teachers/me/activities/[id]** - Update planned activity
   - Allows: date, module_number, class_name, description
   - Blocks editing completed activities (immutable)
   - Re-validates overlaps if date/module changed
   - Ownership verification

4. ✅ **DELETE /api/teachers/me/activities/[id]** - Delete planned activity
   - Blocks deleting completed activities
   - Automatic budget refund (modules + minutes)
   - Returns refunded amounts

5. ✅ **PATCH /api/teachers/me/activities/[id]/complete** - Toggle completion
   - Request: `{ "completed": true/false }`
   - No budget changes (already deducted at creation)
   - Idempotent operation

**Business Logic Implemented**:
- Budget enforcement: 1 module = 50 minutes (configurable)
- Overlap rules: Teacher-blocking, Class-warning
- Activity lifecycle: planned → editable/deletable | completed → immutable
- Security: requireTeacher() auth, ownership verification, scoped queries

---

## 🚧 Next Tasks: Phase 4 - Frontend Implementation

### Task 1: Update Login Page with Google SSO
**File to modify**: `app/login/page.tsx`
**Requirements**:
- Use `requireTeacher()` for auth
- Query `recovery_activities` filtered by `teacher_id` (from auth user)
- Join with `recovery_types` for type name and color
- Join with `school_years` for year context
- Support query params:
  - `school_year_id` (optional, defaults to active year)
  - `status` (optional: 'planned' | 'completed' | 'all')
- Return JSON:
  ```typescript
  {
    activities: Array<{
      id: string
      date: string (ISO 8601)
      module_number: number
      class_name: string
      title: string
      duration_minutes: number
      status: 'planned' | 'completed'
      recovery_type: {
        id: string
        name: string
        color: string
      }
      school_year: {
        id: string
        name: string
      }
    }>
    summary: {
      total_activities: number
      total_modules: number
      planned: number
      completed: number
    }
  }
  ```

#### Priority 2: POST /api/teachers/me/activities
**File to create**: `app/api/teachers/me/activities/route.ts` (same file, POST method)
**Purpose**: Create new recovery activity with budget validation
**Requirements**:
- Use `requireTeacher()` for auth
- Validate request body (Zod schema):
  ```typescript
  {
    date: string (ISO 8601 date)
    module_number: number (1-6 typically)
    class_name: string
    recovery_type_id: string (UUID)
    school_year_id: string (UUID)
    description?: string (optional)
  }
  ```
- **Business Logic**:
  1. Get teacher's budget for specified school_year_id
  2. Check budget availability: `modules_used + 1 <= modules_annual`
  3. Check teacher overlap: Same teacher, same date, same module_number → BLOCK
  4. Check class overlap: Same class_name, same date, same module_number → WARN (allow)
  5. Calculate: `duration_minutes = 50`, `modules_equivalent = 1`
  6. Insert activity with:
     - `teacher_id` = current user's teacher_id
     - `status` = 'planned'
     - `created_by` = current user's id
  7. Update budget: `modules_used += 1`, `minutes_used += 50`
- Return JSON:
  ```typescript
  {
    activity: {...} // full activity object
    warning?: string // if class overlap detected
  }
  ```
- Error codes:
  - 400: Invalid input, budget exhausted, teacher overlap
  - 404: Budget not found, recovery type not found

#### Priority 3: PATCH /api/teachers/me/activities/[id]
**File to create**: `app/api/teachers/me/activities/[id]/route.ts`
**Purpose**: Edit teacher's own planned activity
**Requirements**:
- Use `requireTeacher()` for auth
- Validate: Activity belongs to current teacher
- Validate: Activity status is 'planned' (completed activities are immutable)
- Allow updating:
  - `date`
  - `module_number`
  - `class_name`
  - `description`
- **Business Logic**:
  1. Fetch existing activity, verify ownership
  2. If date or module_number changed, re-check overlaps
  3. Update activity record
- Return updated activity object
- Error codes:
  - 400: Activity is completed (cannot edit)
  - 403: Activity belongs to different teacher
  - 404: Activity not found

#### Priority 4: DELETE /api/teachers/me/activities/[id]
**File to create**: `app/api/teachers/me/activities/[id]/route.ts` (same file, DELETE method)
**Purpose**: Delete planned activity and refund budget
**Requirements**:
- Use `requireTeacher()` for auth
- Validate: Activity belongs to current teacher
- Validate: Activity status is 'planned' (completed activities cannot be deleted)
- **Business Logic**:
  1. Fetch activity, verify ownership and status
  2. Delete activity record
  3. Update budget: `modules_used -= 1`, `minutes_used -= duration_minutes`
- Return JSON:
  ```typescript
  {
    message: "Attività eliminata con successo"
    refunded_modules: 1
  }
  ```
- Error codes:
  - 400: Activity is completed (cannot delete)
  - 403: Activity belongs to different teacher
  - 404: Activity not found

#### Priority 5: PATCH /api/teachers/me/activities/[id]/complete
**File to create**: `app/api/teachers/me/activities/[id]/complete/route.ts`
**Purpose**: Toggle activity completion status
**Requirements**:
- Use `requireTeacher()` for auth
- Validate: Activity belongs to current teacher
- Request body:
  ```typescript
  {
    completed: boolean
  }
  ```
- **Business Logic**:
  1. Fetch activity, verify ownership
  2. Update status: 'planned' → 'completed' or 'completed' → 'planned'
  3. No budget changes (budget was already deducted at creation)
- Return updated activity object
- Error codes:
  - 403: Activity belongs to different teacher
  - 404: Activity not found

---

## 📋 Code Patterns to Follow

### 1. API Route Structure
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeacher } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireTeacher()
    const teacherId = user.teacherId!
    const supabase = await createClient()

    // Query logic here

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
```

### 2. Budget Validation Pattern
```typescript
// Check budget availability
const { data: budget, error: budgetError } = await supabase
  .from('teacher_budgets')
  .select('modules_annual, modules_used')
  .eq('teacher_id', teacherId)
  .eq('school_year_id', schoolYearId)
  .single()

if (!budget) {
  return NextResponse.json(
    { error: 'Budget non trovato per questo anno scolastico' },
    { status: 404 }
  )
}

if ((budget.modules_used || 0) >= budget.modules_annual) {
  return NextResponse.json(
    { error: 'Budget esaurito: non ci sono moduli disponibili' },
    { status: 400 }
  )
}
```

### 3. Overlap Detection Pattern
```typescript
// Check teacher overlap (same teacher, date, module)
const { data: teacherOverlap } = await supabase
  .from('recovery_activities')
  .select('id')
  .eq('teacher_id', teacherId)
  .eq('date', date)
  .eq('module_number', moduleNumber)
  .single()

if (teacherOverlap) {
  return NextResponse.json(
    { error: 'Sovrapposizione docente: il modulo è già occupato per questo docente' },
    { status: 400 }
  )
}

// Check class overlap (same class, date, module) - WARNING only
const { data: classOverlap } = await supabase
  .from('recovery_activities')
  .select('id, teachers(nome, cognome)')
  .eq('class_name', className)
  .eq('date', date)
  .eq('module_number', moduleNumber)
  .single()

let warning = null
if (classOverlap) {
  const teacher = classOverlap.teachers
  warning = `Attenzione: la classe ${className} ha già un'attività in questo modulo con ${teacher.nome} ${teacher.cognome}`
}
```

---

## 📁 Files Created This Session

### Documentation
```
docs/
├── product-specs/
│   └── teacher-self-service.md          # Complete product specification
├── architecture/
│   └── teacher-authentication.md        # Technical architecture design
├── setup/
│   └── google-oauth-setup.md           # OAuth configuration guide
└── implementation-progress.md           # Progress tracking
```

### Database
```
supabase/
└── migrations/
    └── 20250113_teacher_auth_setup.sql  # ✅ Applied to Supabase
```

**Migration Applied Successfully**:
- ✅ Role constraint updated: `users.role IN ('admin', 'teacher')`
- ✅ Index created: `idx_teachers_email` (for OAuth provisioning)
- ✅ Index created: `idx_teachers_user_id` (for reverse lookups)
- ✅ Index created: `idx_users_email` (for authentication)
- ✅ Documentation comments added to columns

### Backend
```
lib/
└── auth/
    └── roles.ts                         # Auth utilities (420 lines)

app/
├── auth/
│   └── callback/
│       └── route.ts                     # OAuth callback handler
├── access-denied/
│   └── page.tsx                         # Access denial page
└── api/
    └── teachers/
        └── me/
            └── route.ts                 # Teacher profile API
```

### Modified Files
```
lib/
└── supabase/
    └── middleware.ts                    # Enhanced with role-based routing
```

---

## 🚀 Deployment Status (2025-01-13)

### ✅ Completed Deployments

1. **GitHub Push**: Successfully pushed to `feature/teacher-self-service` branch
   - Commit: `5cdcc83c02966f330fb792b90596d8f05f596fd3`
   - All backend files uploaded
   - Documentation included
   - Ready for PR review

2. **Database Migration**: Successfully applied to Supabase production
   - Role constraint: `users.role` now accepts 'admin' and 'teacher'
   - Performance indexes created (3 indexes)
   - Column documentation added
   - Verified via SQL query

### 🔧 Configuration Still Required

**IMPORTANT**: Before testing, complete these manual steps:

1. **Google OAuth Setup** (School IT Department)
   - Create OAuth Client ID/Secret in Google Cloud Console
   - Configure redirect URIs
   - Enable Google provider in Supabase Dashboard
   - Follow guide: `docs/setup/google-oauth-setup.md`

2. **Teacher Email Verification** (Admin)
   - Run audit: `SELECT * FROM teachers WHERE email IS NULL OR email NOT LIKE '%@piaggia.it'`
   - Update any missing/invalid emails
   - Ensure all teachers have valid @piaggia.it emails

3. **Environment Variables** (DevOps)
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is set
   - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
   - Add `NEXT_PUBLIC_APP_URL` for OAuth redirect

### 🧪 Testing Checklist

Once configuration is complete:
- [ ] Test Google OAuth login with @piaggia.it account
- [ ] Test domain restriction (non-@piaggia.it rejected)
- [ ] Test teacher provisioning (first login creates user)
- [ ] Test budget gate (teacher without budget → access denied)
- [ ] Test API: GET /api/teachers/me (returns profile + budget)
- [ ] Test API: GET /api/teachers/me/activities (returns activities list)
- [ ] Test API: POST /api/teachers/me/activities (creates activity)
- [ ] Test budget deduction after activity creation
- [ ] Test overlap detection (teacher-blocking, class-warning)
- [ ] Test role-based routing (teacher → /dashboard/teacher)

---

## 🔄 Next Session: Resume From Here

**Phase 4: Frontend Implementation** (0% complete)

**Priority Tasks**:
1. Update login page with Google SSO button
2. Create teacher dashboard layout (`/dashboard/teacher`)
3. Build budget overview widget
4. Implement activities list/calendar view
5. Create activity CRUD forms

**Reference Files**:
- Backend APIs: All 5 endpoints ready in `/api/teachers/me/*`
- Auth utilities: `lib/auth/roles.ts`
- Existing admin UI patterns: `/app/dashboard/*`

---

**Session End**: 2025-01-13
**Status**: Phase 3 Complete + Deployed ✅ | Phase 4 Ready to Start
**Next Action**: Begin frontend implementation or wait for OAuth configuration
