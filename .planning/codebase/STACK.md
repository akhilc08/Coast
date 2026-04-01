# Technology Stack

**Analysis Date:** 2026-04-01

## Languages

**Primary:**
- TypeScript 5.9 - All application code (`app/`, `lib/`, `components/`)
- TSX - React component files throughout `app/` and `components/`

**Secondary:**
- JavaScript - Config files (`prettier.config.js`)

## Runtime

**Environment:**
- Node.js (target ES2017, bundler module resolution)

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.1 (App Router) - Full-stack framework, SSR, API routes, Server Actions
- React 19.2 - UI library
- React DOM 19.2 - DOM rendering

**Testing:**
- Vitest 4.0 - Unit test runner, config at `vitest.config.ts`, tests in `tests/**/*.test.{ts,tsx}`
- Playwright 1.58 - E2E tests, config at `playwright.config.ts`, tests in `tests/**/*.spec.ts`
- @vitejs/plugin-react 5.1 - Vite React plugin for Vitest

**Build/Dev:**
- Turbopack - Dev server (via `next dev`, Next.js 16 default)
- TypeScript 5.9 - Type checking, config at `tsconfig.json` (strict mode enabled)
- ESLint 9.39 + eslint-config-next 16.1 - Linting
- Prettier 3.8 + prettier-plugin-tailwindcss 0.7 - Formatting, config at `prettier.config.js`

## Key Dependencies

**UI:**
- Tailwind CSS 4.2 + @tailwindcss/postcss 4.2 - Utility-first CSS, config via `postcss.config.mjs`
- shadcn 4.0 - Component scaffolding (shadcn/ui primitives)
- @base-ui/react 1.2 - Headless UI components
- lucide-react 0.577 - Icon library
- class-variance-authority 0.7, clsx 2.1, tailwind-merge 3.5 - Class name utilities
- tw-animate-css 1.4 - Animation utilities
- next-themes 0.4 - Dark/light theme management
- sonner 2.0 - Toast notifications
- yet-another-react-lightbox 3.29 - Image lightbox
- @dnd-kit/core 6.3, @dnd-kit/sortable 10.0, @dnd-kit/utilities 3.2 - Drag-and-drop
- react-dropzone 15.0 - File upload drag-and-drop

**Forms:**
- react-hook-form 7.71 - Form state management
- @hookform/resolvers 5.2 - Zod schema integration for forms
- zod 4.3 - Schema validation

**Data & URL:**
- nuqs 2.8 - Type-safe URL query string state management

**Server-side:**
- pdfkit 0.17 - PDF generation (`lib/pdf/purchase-agreement.ts`, `lib/pdf/bill-of-sale.ts`)
- @react-email/components 1.0 - Transactional email templates (`lib/email/`)

**Analytics:**
- @vercel/analytics 2.0 - Vercel web analytics

## Configuration

**TypeScript:**
- `tsconfig.json` - strict mode, ES2017 target, bundler resolution, path alias `@/*` maps to project root

**Build:**
- `next.config.ts` - Minimal config; remote image patterns whitelisted for `*.supabase.co` Storage URLs
- `postcss.config.mjs` - PostCSS with `@tailwindcss/postcss`
- `prettier.config.js` - No semicolons, single quotes, ES5 trailing commas, Tailwind class sorting

**Testing:**
- `vitest.config.ts` - Node environment, globals enabled, `@` alias to project root, includes `tests/**/*.test.*`
- `playwright.config.ts` - Chromium only, serial execution (workers: 1), base URL from `PLAYWRIGHT_BASE_URL` env var, starts `next dev` as web server

**Environment:**
- No `.env.example` present in repository
- Required env vars determined by source code (see INTEGRATIONS.md)

## Platform Requirements

**Development:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version`)
- npm

**Production:**
- Vercel (`.vercel/` project config present)
- Vercel `after()` API used in `app/api/webhooks/stripe/route.ts` for extended post-response execution

---

*Stack analysis: 2026-04-01*
