# Sistema Tracking Recupero Moduli Docenti

Sistema web per il monitoraggio e tracking delle attività di recupero moduli svolte dai docenti.

## Stack Tecnologico

- **Framework**: Next.js 14 con App Router
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: Supabase Authentication
- **UI**: Tailwind CSS
- **Language**: TypeScript

## Setup

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run development server
npm run dev
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
```

## API Endpoints

- `GET /api/health` - Health check
- `GET/POST /api/teachers` - Teachers management
- `GET /api/budgets` - Get budgets
- `POST /api/budgets/import` - Import CSV budgets

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # TypeScript check
npm run lint         # ESLint check
```