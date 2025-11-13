# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema Tracking Recupero Moduli Docenti - A web system for monitoring and tracking teacher recovery module activities. This is an Italian educational administration application built with Next.js 14 and Supabase.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma (schema only, migrated to direct Supabase queries)
- **Authentication**: Supabase Authentication
- **UI Framework**: Tailwind CSS + shadcn/ui (Radix UI primitives)
- **Forms**: React Hook Form + Zod validation
- **Language**: TypeScript (strict mode enabled)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Type checking (strict TypeScript)
npm run type-check

# Linting (currently disabled during builds)
npm run lint

# Generate Prisma Client (runs automatically post-install)
npx prisma generate
```

## Architecture Overview

### Database Migration Status
**IMPORTANT**: The project has migrated from Prisma ORM to direct Supabase client queries. The `lib/prisma.ts` file has been removed. All database operations now use `@/lib/supabase/client.ts` (client-side) or `@/lib/supabase/server.ts` (server-side).

### Authentication Flow
- Supabase Auth with session management via middleware
- Middleware at `middleware.ts` uses `@/lib/supabase/middleware.ts` to refresh sessions
- Protected routes redirect to `/login` if unauthenticated
- Server components: use `createClient()` from `@/lib/supabase/server.ts`
- Client components: use `createClient()` from `@/lib/supabase/client.ts`

### Data Model (Prisma Schema)
Core entities in `prisma/schema.prisma`:
- **users**: System users (admins) with role-based access
- **teachers**: Teacher profiles with optional user linkage
- **school_years**: Academic years with active status and week counts
- **teacher_budgets**: Annual budget allocation per teacher (minutes/modules)
- **recovery_types**: Configurable activity types with colors and approval requirements
- **recovery_activities**: Individual recovery sessions with status tracking (planned/completed)
- **activity_logs**: Audit trail for all system actions
- **system_configs**: Key-value configuration storage

Key relationships:
- Teachers have multiple budgets (one per school year)
- Activities link to teacher, school year, and recovery type
- Budgets track weekly/annual minutes and module equivalents (1 module = 50 minutes)

### App Router Structure

```
app/
├── page.tsx                    # Landing page
├── login/                      # Authentication
├── dashboard/                  # Protected admin area
│   ├── layout.tsx             # Sidebar + header layout
│   ├── page.tsx               # Dashboard overview with charts
│   ├── teachers/              # Teacher management
│   │   ├── [id]/              # Teacher detail + calendar view
│   │   └── page.tsx           # Teachers list
│   ├── recovery-types/        # Activity type configuration
│   ├── import/                # CSV budget import
│   └── calendar-variants/     # Calendar planning feature
├── api/
│   ├── health/                # Health check endpoint
│   ├── teachers/              # Teacher CRUD + list-with-budgets
│   ├── budgets/               # Budget management + CSV import
│   ├── activities/            # Recovery activities CRUD + weekly view
│   ├── recovery-types/        # Activity types management
│   ├── school-years/          # School year management
│   └── reports/               # Overview statistics
```

### Key API Patterns

All API routes follow this structure:
1. Auth check via `createClient()` from `@/lib/supabase/server`
2. Direct Supabase queries using `.from()`, `.select()`, `.insert()`, etc.
3. Error handling with appropriate HTTP status codes
4. `export const dynamic = 'force-dynamic'` for SSR routes

Example query with relations:
```typescript
const { data, error } = await supabase
  .from('teachers')
  .select(`
    *,
    teacher_budgets (
      *,
      school_year:school_years (*)
    )
  `)
```

### Component Organization

```
components/
├── ui/                        # shadcn/ui components (Radix primitives)
├── dashboard-nav.tsx          # Main navigation sidebar
├── user-nav.tsx              # User menu dropdown
├── theme-toggle.tsx          # Dark/light mode switch
├── teachers/                 # Teacher-specific components
└── features/                 # Feature-specific components
```

### Utility Libraries

```
lib/
├── supabase/
│   ├── client.ts             # Browser Supabase client
│   ├── server.ts             # Server Supabase client
│   └── middleware.ts         # Session refresh logic
├── csv-parser.ts             # CSV import parsing (papaparse)
├── validations/
│   └── import.ts             # Zod schemas for CSV validation
├── auth-utils.ts             # Auth helper functions
├── db-utils.ts               # Database utility functions
└── utils.ts                  # General utilities (cn, etc.)
```

## CSV Import System

The system supports budget imports via CSV with this format:
```
Docente; Minuti/settimana;Tesoretto annuale (min); Moduli Annui (50min); Saldo (min)
```

- Parser: `lib/csv-parser.ts` with `parseTesorettiCSV()` function
- Validation: Zod schemas in `lib/validations/import.ts`
- API: `POST /api/budgets/import` with school year context
- Returns detailed errors/warnings per row

## Path Aliases

TypeScript paths configured in `tsconfig.json`:
- `@/*` → Root directory (e.g., `@/lib/utils`, `@/components/ui/button`)

## Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url  # For Prisma schema introspection
DIRECT_URL=your_direct_url      # Optional for Prisma
```

## Important Notes

1. **No Prisma Client Usage**: All queries use Supabase client directly
2. **Italian Language**: UI and data use Italian terminology (docente=teacher, recupero=recovery, tesoretto=budget)
3. **Module System**: 1 modulo = 50 minutes of teaching time
4. **Active School Year**: System supports multiple school years but typically operates on one active year
5. **Auth Requirement**: All dashboard and API routes require authentication
6. **TypeScript Strict**: Build will fail on type errors (TypeScript strict mode enabled)

## Common Development Patterns

### Adding a new API endpoint
1. Create route handler in `app/api/[resource]/route.ts`
2. Add auth check with Supabase server client
3. Use direct Supabase queries (no Prisma)
4. Add `export const dynamic = 'force-dynamic'` for dynamic routes
5. Return NextResponse with proper status codes

### Creating a new dashboard page
1. Create page in `app/dashboard/[feature]/page.tsx`
2. Use server components by default for data fetching
3. Authentication is handled by middleware (automatic redirect)
4. Fetch user via `createClient()` from `@/lib/supabase/server` if needed
5. Use client components only when needed (forms, interactions)

### Database queries
```typescript
// Server-side
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client-side
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```
