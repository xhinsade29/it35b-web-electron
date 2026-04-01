# PHP Migration to React + Supabase

This project is a migration from PHP to a modern React + TypeScript + Vite stack with Supabase as the cloud database.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite with HMR

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (free tier available at [supabase.com](https://supabase.com))

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key from Project Settings > API
   - Update `.env` file:
     ```
     VITE_SUPABASE_URL=your_project_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
  lib/
    supabase.ts          # Supabase client configuration
    database.types.ts    # TypeScript types for your tables
  hooks/
    useDatabase.ts       # Database query hooks
  App.tsx               # Main app component
  App.css               # App-specific styles
  index.css             # Global styles
  main.tsx              # Entry point
```

## Migration Guide

When migrating your PHP tables to Supabase:

1. Create tables in Supabase Dashboard (SQL Editor)
2. Update `src/lib/database.types.ts` with your table interfaces
3. Create hooks in `src/hooks/` for data fetching
4. Replace PHP pages with React components

## Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Learn More

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

