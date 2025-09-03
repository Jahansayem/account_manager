# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages, layouts, and routes (e.g., `accounts/[id]`, `auth/login`).
- `src/components`: Reusable UI and layout primitives (`ui/*`, `layout/*`, `auth/*`, `providers/*`).
- `src/lib`: Integrations and utilities (`supabase.ts`, `onesignal.ts`, `auth/*`, `types/*`).
- `src/hooks`: Custom React hooks.
- `public`: Static assets and service workers.
- Config: `eslint.config.mjs`, `tailwind.config.ts`, `next.config.ts`, `tsconfig.json`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev at http://localhost:3000.
- `npm run dev-turbo`: Dev server using Turbopack.
- `npm run build`: Production build (Turbopack).
- `npm start`: Serve the production build.
- `npm run lint`: Lint TypeScript/React with ESLint.

## Coding Style & Naming Conventions
- TypeScript (strict); 2-space indentation.
- Use `@/*` path alias (see `tsconfig.json`).
- Components export PascalCase; file names use kebab-case in `components/*` and lowercase in `app/*`.
- App Router: lowercase segments; dynamic routes like `accounts/[id]/page.tsx`.
- Styling with Tailwind CSS; prefer utility classes; keep global styles in `src/app/globals.css`.

## Testing Guidelines
- Playwright is available; no tests are committed yet.
- Add e2e specs under `e2e/` or `tests/` named `*.spec.ts[x]`.
- Run after configuring Playwright: `npx playwright test`.
- Cover auth, accounts CRUD, and notifications flows.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (e.g., `feat: add platform chart`, `fix: correct login redirect`).
- PRs: Provide description, linked issues, screenshots for UI, and test steps. Keep scope focused.

## Security & Configuration Tips
- Use `.env.local` (gitignored) for: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ONESIGNAL_APP_ID`, and secrets like `ONESIGNAL_REST_API_KEY`.
- Do not hardcode secrets; access via `process.env`.
- Validate inputs and sanitize data sent to external services.

