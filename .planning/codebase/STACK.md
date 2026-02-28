# Technology Stack

**Analysis Date:** 2026-02-24

## Languages

**Primary:**
- TypeScript 5.x - All source code in `src/` directory; strict mode enabled
- JavaScript (ES2017 target) - Runtime and config files

**Secondary:**
- JSON - Persistent data files in `data/` directory

## Runtime

**Environment:**
- Node.js (version not pinned; inferred from Next.js 16 requirements: v18+)

**Package Manager:**
- npm (with package-lock.json present)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack framework with App Router, API routes at `src/app/api/`, server-side rendering
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering

**UI & Visualization:**
- @xyflow/react 12.10.1 - Interactive graph visualization for concept maps
- Tailwind CSS 4.x - Utility-first CSS framework
- Framer Motion 12.34.3 - Animation library for UI transitions
- Lucide React 0.575.0 - SVG icon library

**Testing:**
- None currently configured

**Build/Dev:**
- ESLint 9.x - Linting (config: `eslint.config.mjs`)
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind
- TypeScript 5.x - Type checking and compilation
- tsx 4.21.0 - TypeScript executor for Node scripts

## Key Dependencies

**Critical:**
- @ai-sdk/openai 3.0.31 - Vercel AI SDK's OpenAI-compatible provider (used to connect MiniMax)
- ai 6.0.97 - Vercel AI SDK core library for streaming, tool calling, and generateText/streamText
- @prisma/client 7.4.1 - ORM client (exists but unused; replaced by JSON file store at `src/lib/db.ts`)
- Zod 4.3.6 - Schema validation library for API inputs and LLM outputs
- Zustand 5.0.11 - Client state management
- UUID 13.0.0 - UUID generation for record IDs
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.5.0 - Tailwind CSS class merging
- dagre 0.8.5 - DAG layout algorithm for concept graph visualization

**Infrastructure:**
- prisma 7.4.1 (devDependency) - ORM CLI (seed script uses this)

## Configuration

**Environment:**
- `.env.local` - Required environment variables:
  - `MINIMAX_API_KEY` - MiniMax API key for LLM calls (format: `sk-*`)
- No environment validation framework; checks done inline in `src/lib/minimax.ts` and `src/app/api/health/route.ts`

**Build:**
- `tsconfig.json` - TypeScript compiler options with strict mode, path alias `@/*` mapping to `src/*`
- `next.config.ts` - Next.js configuration (currently empty stub)
- `eslint.config.mjs` - ESLint configuration file

**TypeScript:**
- Strict mode enabled
- Target: ES2017
- Module resolution: bundler
- Path alias: `@/*` → `./src/*` (used throughout codebase)
- Node types included

## Platform Requirements

**Development:**
- Node.js 18+ (inferred; not pinned)
- npm (any recent version)
- SQLite driver (if upgrading from JSON file store)
- No Docker configured

**Production:**
- Node.js 18+
- Environment: `NODE_ENV=production` (checked in `src/app/api/health/route.ts`)
- Database: Currently JSON files in `data/` directory (hackathon mode); production would use PostgreSQL per README

## Build & Run Commands

```bash
npm run dev              # Start dev server with Turbopack on http://localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run seed             # Seed database using prisma/seed.ts
```

## Key File Paths

- `package.json` - Dependency manifest and scripts
- `tsconfig.json` - TypeScript configuration with path aliases
- `next.config.ts` - Next.js configuration
- `.env.local` - Environment variables (must include MINIMAX_API_KEY)
- `.env.local.example` - Example env template
- `src/lib/minimax.ts` - MiniMax client initialization using Vercel AI SDK
- `src/lib/db.ts` - JSON file-based persistence layer (replaces Prisma for hackathon)
- `src/lib/config.ts` - App-wide constants and configuration values
- `prisma/schema.prisma` - Data schema (defines all models but uses SQLite; hackathon uses JSON)
- `prisma/seed.ts` - Seed script for initializing data

---

*Stack analysis: 2026-02-24*
