# Tech stack and decisions

## Runtime used for verification

- Node.js `22.18.0`
- npm `10.9.3`
- TypeScript `6.0.3`

## Main packages

| Concern                 | Implementation                       | Resolved version                            |
| ----------------------- | ------------------------------------ | ------------------------------------------- |
| App/build               | Vite, React, React DOM               | Vite 8.3.5; React 19.3.1                    |
| Navigation              | React Router                         | 7.18.5                                      |
| Styling                 | Tailwind CSS + Vite plugin           | 4.3.3                                       |
| Server state foundation | TanStack Query                       | 5.105.1                                     |
| Forms/schema            | React Hook Form, Zod, resolver       | 7.91.0; 4.6.7; 7.0.1                        |
| Accessible primitives   | Radix UI                             | per-package versions in `package-lock.json` |
| Icons                   | Lucide React                         | 1.66.0                                      |
| Fonts                   | Fontsource Manrope and Source Sans 3 | 5.3.0; 5.3.1                                |
| Unit tests              | Vitest, Testing Library, jsdom       | 5.0.5; 16.3.3; 29.1.1                       |
| Browser/a11y tests      | Playwright, axe-core Playwright      | 1.64.1; 4.14.0                              |
| Lint/format             | ESLint, typescript-eslint, Prettier  | 10.14.0; 8.72.1; 3.9.10                     |

## Decisions

- **React Router 7:** the available runtime is Node 22.18.0; the checked Router 8 release line required a newer Node 22 patch. Router 7.18.5 is installed and the development showcase is declarative. Recheck runtime and router compatibility during dependency upgrades. [React Router changelog](https://reactrouter.com/changelog)
- **TypeScript 6:** selected to fit the installed typescript-eslint peer range and keep strict checking enabled. `baseUrl` was removed because TypeScript 6 reports its deprecation as an error; `paths` keeps the `@/*` alias.
- **Tailwind 4:** theme values are declared in CSS with `@theme inline`; there is no JavaScript Tailwind config. [Tailwind Vite installation](https://tailwindcss.com/docs/installation/using-vite)
- **Radix:** dialog, alert dialog, sheet, accordion, tabs, select, menu, tooltip, popover, checkbox, radio, switch, and progress use semantic, keyboard-aware primitives. Project components own visual styling and public APIs.
- **Local fonts:** Manrope and Source Sans 3 are imported from Fontsource packages, avoiding third-party font requests at runtime.
- **No API client implementation:** QueryClient is installed as an app-level provider with retry disabled and a 30-second stale time, but no query, DTO, endpoint, or API transport was invented.
- **Dev/prod split:** `src/main.tsx` dynamically imports the dev app only when `import.meta.env.DEV` is true. Production imports a separate fallback, allowing Rollup to remove showcase modules from the production output.
- **Dependency audit:** `minimatch` is overridden to `^11.0.1` to clear the moderate advisory in the ESLint dependency tree. Lint, unit, build, and `npm audit` were rerun successfully after this override.

The package lock is the authoritative resolved dependency list. Vite’s release requirements are documented at [Vite releases](https://vite.dev/releases).
