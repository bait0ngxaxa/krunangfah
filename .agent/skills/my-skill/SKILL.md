# AGENTS.md — Universal AI Coding Agent Rules

> **Purpose:** Framework-agnostic, language-agnostic rules for AI coding agents.
> Drop this file into any project root. Override specifics in a `PROJECT.md` alongside it.

---

## Table of Contents

1. [Agent Behavior & Protocols](#1-agent-behavior--protocols)
2. [Code Quality Standards](#2-code-quality-standards)
3. [Type Safety & Language Discipline](#3-type-safety--language-discipline)
4. [Security Standards](#4-security-standards)
5. [Architecture Principles](#5-architecture-principles)
6. [Performance Standards](#6-performance-standards)
7. [Testing Standards](#7-testing-standards)
8. [Frontend Patterns](#8-frontend-patterns)
9. [Backend & API Patterns](#9-backend--api-patterns)
10. [Database Standards](#10-database-standards)
11. [DevOps & Infrastructure](#11-devops--infrastructure)
12. [Documentation & Git](#12-documentation--git)
13. [Defensive Coding — Edge-Case Prevention](#13-defensive-coding--edge-case-prevention)
14. [AI Response Format](#14-ai-response-format)

---

# 1. Agent Behavior & Protocols

## Role

Act as a **Senior Software Engineer**. Generate production-grade, modular, strictly typed code.
Prioritize: **Correctness > Security > Performance > Maintainability > Speed**.

## Critical Thinking Order

For every decision, evaluate in this order:

1. Security → 2. Performance → 3. Reusability → 4. Type Safety → 5. Error Handling → 6. Accessibility → 7. Testing → 8. Maintainability

## Modification Safety

1. **Style-only changes:** DO NOT modify props, parameters, interfaces, or business logic. Treat functional code as READ-ONLY.
2. **Logic/Style overlap:** If a style change _requires_ logic modification, **ASK** before proceeding.
3. **Refactoring:** Ask for confirmation before major structural changes.
4. **Deletions:** Never remove code without explicit confirmation. Comment with `// DEPRECATED:` if uncertain.

## Search Before Create

Before creating any new type, constant, validation, utility, or component:

1. **Search** the codebase for existing definitions
2. **Reuse** if it exists — extend or compose as needed
3. **Create** only if no prior definition exists, and place it in the canonical location

---

# 2. Code Quality Standards

## Naming Conventions

| Element            | Convention                               | Example           |
| :----------------- | :--------------------------------------- | :---------------- |
| Components/Classes | `PascalCase`                             | `UserProfile`     |
| Files (utilities)  | `kebab-case`                             | `format-date.ts`  |
| Functions/Vars     | `camelCase`                              | `getUserData`     |
| Constants          | `UPPER_SNAKE_CASE`                       | `MAX_RETRY_COUNT` |
| Interfaces/Types   | `PascalCase`                             | `ApiResponse<T>`  |
| Enums              | `PascalCase` + `UPPER_SNAKE_CASE` values | `Role.ADMIN`      |
| Database tables    | `snake_case`                             | `user_sessions`   |
| Environment vars   | `UPPER_SNAKE_CASE`                       | `DATABASE_URL`    |

## Code Metrics

| Metric                | Limit    | Action                               |
| :-------------------- | :------- | :----------------------------------- |
| Function length       | 50 LOC   | Extract helper functions             |
| File length           | 300 LOC  | Split into modules                   |
| Cyclomatic complexity | 10       | Simplify or decompose                |
| Nesting depth         | 3 levels | Use early returns & guard clauses    |
| Parameters per fn     | 4        | Use an options/config object instead |

## Core Principles

- **SRP:** Each function/component does ONE thing well.
- **DRY:** Reuse components and logic. Search before creating new.
- **KISS:** Prefer the simplest solution that works correctly.
- **Early Returns:** Reduce nesting with guard clauses.
- **Immutability:** Prefer immutable data. Mutate only when performance requires it.
- **Pure Functions:** Prefer pure functions. Isolate side effects.

---

# 3. Type Safety & Language Discipline

> These rules apply to any statically-typed language (TypeScript, Rust, Go, Java, C#, etc.).
> For dynamically-typed languages (Python, Ruby, JS), use type hints / annotations where available.

### Universal Rules

- **Ban `any` / `object` / `dynamic` escape hatches.** Use `unknown` + type narrowing.
- **Always define return types** for functions, methods, and hooks.
- **Interfaces/Structs** for object shapes and public contracts.
- **Type Guards / Assertions** when handling external data (API, user input, file I/O).
- **Generics** for reusable abstractions.
- **Utility Types:** Leverage language-native utility types (`Partial`, `Pick`, `Omit`, `Record`, etc.).

### TypeScript-Specific

```
@typescript-eslint/no-explicit-any    → error
@typescript-eslint/ban-ts-comment     → error
@typescript-eslint/no-non-null-assertion → warn
eqeqeq                                → error
```

### Python-Specific

- Use type hints on all function signatures.
- Use `mypy --strict` or `pyright` in CI.
- Prefer `dataclass` / `pydantic.BaseModel` for structured data.

---

# 4. Security Standards

## OWASP Top 10 Compliance (Mandatory)

Every project MUST address:

| Threat                    | Mitigation                                                  |
| :------------------------ | :---------------------------------------------------------- |
| Injection (SQL/NoSQL/Cmd) | Parameterized queries only. Never concatenate user input.   |
| Broken Auth               | Validate at data access layer, not just UI/middleware.      |
| Sensitive Data Exposure   | Encrypt at rest + in transit. Sanitize error messages.      |
| XSS                       | Sanitize HTML output. Avoid raw HTML injection.             |
| Broken Access Control     | Verify ownership/permissions server-side on every mutation. |
| Security Misconfiguration | Security headers, disable debug in prod, least privilege.   |
| CSRF                      | Token-based protection for all state-changing operations.   |
| SSRF                      | Validate/whitelist URLs for server-side requests.           |

## Secrets Management

> 🚨 **NO HARDCODED SECRETS. EVER.**

- Use environment variables or a secrets manager (Vault, AWS Secrets Manager, etc.).
- Never commit `.env` files. Use `.env.example` with placeholder values.
- Rotate keys regularly. Automate rotation where possible.
- Separate secrets per environment (dev/staging/prod).

## Input Validation

- Validate ALL inputs at the boundary (API entry, form submission, file upload).
- Use schema validation (Zod, Joi, Pydantic, JSON Schema, etc.).
- Whitelist over blacklist.
- Normalize before save: trim, collapse spaces, strip zero-width characters.

## Error Handling

- **NEVER** expose stack traces, SQL errors, internal IDs, or ORM details to clients.
- Return format: `{ success: boolean, error?: { code: string, message: string } }`
- Log detailed errors internally. Show opaque messages to users.
- Wrap all entry points in `try/catch` (or language equivalent).

## Security Headers (Production)

| Header                      | Recommended Value                              |
| :-------------------------- | :--------------------------------------------- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options`           | `SAMEORIGIN`                                   |
| `X-Content-Type-Options`    | `nosniff`                                      |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`     |
| `Content-Security-Policy`   | Restrictive, tailored to app context           |
| `X-Powered-By`              | Remove / suppress                              |

## Rate Limiting

- Apply to all public endpoints.
- Use exponential backoff for authentication endpoints.
- Use Redis or external store for distributed environments (in-memory resets on restart).
- Log warnings when IP headers (`x-forwarded-for`) are missing.

## File Upload Security

| Concern            | Rule                                                              |
| :----------------- | :---------------------------------------------------------------- |
| Extension spoofing | Validate magic bytes AND extension whitelist together.            |
| Size limits        | Enforce max file size and max files per entity.                   |
| ZIP-based formats  | XLSX/DOCX/PPTX share PK header — pair magic bytes with extension. |
| Compression        | If compressed > original, return original.                        |
| Storage abuse      | Per-record cap to prevent unbounded growth.                       |

## Password Policy (NIST SP 800-63B)

- Minimum 8 characters.
- Reject passwords matching user email/username.
- Consider checking against common password lists (e.g., Have I Been Pwned top 100k).

---

# 5. Architecture Principles

## Single Source of Truth (SSOT)

> 🚨 Every piece of knowledge in the codebase must have exactly ONE authoritative source.

| Artifact           | Rule                                                                  |
| :----------------- | :-------------------------------------------------------------------- |
| Types/Interfaces   | Define once. Import everywhere. Never redeclare.                      |
| Constants          | Define in ONE config file. Never hardcode inline.                     |
| Validation schemas | ONE schema per entity. Reuse on client and server.                    |
| Business logic     | Centralize in service/action layer. UI calls these, never implements. |
| Design tokens      | Define in ONE place (CSS vars / theme config). No magic values.       |

### Anti-Patterns (NEVER Do)

- Duplicating types across files (they WILL drift).
- Hardcoding the same constant in multiple files.
- Implementing validation logic differently on client vs server.

## Recommended Directory Structure (Adapt to Framework)

```
/src (or /app)
  /components        # Reusable UI components
    /ui              # Atomic components (Button, Input, Modal)
    /features        # Feature-specific components
    /layouts         # Layout wrappers
  /lib (or /services)# Business logic, utilities, API clients
  /hooks             # Custom hooks (React) / composables (Vue)
  /types             # Type definitions (single source)
  /config            # Constants, feature flags, env wrappers
  /validations       # Schema definitions (Zod, Joi, Pydantic)
  /tests             # Test files (mirror src structure)
/prisma (or /db)     # Database schema, migrations, seeds
/scripts             # Build, deploy, automation scripts
/docs                # Architecture decisions, API docs
```

## Dependency Direction

```
UI Components → Hooks/Composables → Services/Lib → Data Layer
     ↓                                    ↓
   Types ← ← ← ← ← ← ← ← ← ← ← ← Types
```

- Components depend on hooks/utils. Never the reverse.
- Data layer is independent of UI.
- Types flow outward; they do not import implementation.

---

# 6. Performance Standards

## Universal Rules

| Category      | Rules                                                              |
| :------------ | :----------------------------------------------------------------- |
| Data Fetching | Parallel fetches (`Promise.all`). Proper caching/revalidation.     |
| Bundle Size   | Tree-shake imports. Dynamic import heavy modules. Analyze bundles. |
| Images/Assets | Compress. Use modern formats (WebP/AVIF). Lazy load below fold.    |
| Database      | Select only needed fields. Index query columns. Cursor pagination. |
| Caching       | Cache aggressively at every layer: CDN, app, DB query cache.       |

## Web Vitals Targets

| Metric  | Target  |
| :------ | :------ |
| LCP     | < 2.5s  |
| FID/INP | < 100ms |
| CLS     | < 0.1   |

## Frontend Performance Priorities (by Impact)

| Priority | Category               | Key Techniques                                                |
| :------- | :--------------------- | :------------------------------------------------------------ |
| CRITICAL | Eliminating Waterfalls | Parallel fetches, deferred awaits, Suspense/streaming         |
| CRITICAL | Bundle Size            | Direct imports (no barrels), dynamic imports, defer 3rd-party |
| HIGH     | Server-side            | Request dedup, LRU caching, minimize serialization            |
| MEDIUM   | Re-render Optimization | Memoization, derived state, functional setState, refs         |
| MEDIUM   | Rendering              | `content-visibility`, stable keys, conditional render         |
| LOW      | JS Micro-optimizations | Map/Set lookups, early exits, hoisted regex, batched DOM      |

## Common Bloated Dependencies

| Package       | Size  | Lighter Alternative              |
| :------------ | :---- | :------------------------------- |
| moment        | 290KB | date-fns (12KB) / dayjs (2KB)    |
| lodash        | 71KB  | lodash-es + tree-shaking         |
| axios         | 14KB  | Native fetch / ky (3KB)          |
| jquery        | 87KB  | Native DOM APIs                  |
| Heavy UI libs | Large | Headless UI (Radix, Headless UI) |

---

# 7. Testing Standards

## Testing Pyramid

| Layer       | Scope                                         | Tool Examples                 | Coverage Target     |
| :---------- | :-------------------------------------------- | :---------------------------- | :------------------ |
| Unit        | Functions, hooks, validators, utilities       | Vitest, Jest, pytest, Go test | 80%+ business logic |
| Integration | API routes, service layer, auth flows         | Supertest, httpx, Playwright  | Critical paths      |
| Component   | UI interactions, accessibility                | Testing Library, Storybook    | User-facing         |
| E2E         | Critical user journeys (login, payment, CRUD) | Playwright, Cypress           | Happy + error paths |

## Testing Principles

- Test behavior, not implementation.
- Each test should be independent and idempotent.
- Use factories/fixtures for test data. Never depend on production data.
- Mock external services. Never make real network calls in unit tests.
- Test error paths and edge cases, not just happy paths.

## Web App Testing Workflow

```
Task → Static HTML?
  ├─ Yes → Read HTML → Identify selectors → Write test script
  └─ No (dynamic) → Server running?
      ├─ No → Start server first (use helper script or docker-compose)
      └─ Yes → Reconnaissance-then-action:
          1. Navigate + wait for network idle
          2. Screenshot or inspect DOM
          3. Identify selectors
          4. Execute actions + assert
```

---

# 8. Frontend Patterns

> Skip this section if your project has no frontend.

## Server vs Client Components (React/Next.js)

**Default to Server Components.** Use Client Components only when you need:

- Event handlers (`onClick`, `onChange`)
- State (`useState`, `useReducer`)
- Effects (`useEffect`)
- Browser APIs (`window`, `localStorage`)

## Data Fetching

- **Parallel:** `Promise.all([fetchA(), fetchB()])` — never sequential when independent.
- **Streaming:** Use Suspense boundaries for non-critical data.
- **Deduplication:** `React.cache()` for per-request dedup on the server. SWR/React Query on client.

## Component Patterns

- **Compound Components:** Share state via Context between related sub-components.
- **Custom Hooks:** Extract reusable stateful logic (debounce, media queries, form state).
- **Render Props / HOCs:** Use sparingly. Prefer hooks.
- **Functional Components only.** No class components.

## Accessibility Checklist

1. **Semantic HTML:** `<button>`, `<nav>`, `<main>`, `<section>`, `<article>` — used correctly.
2. **Keyboard Navigation:** All interactive elements focusable. Logical tab order.
3. **ARIA Labels:** For icons, complex widgets, and dynamic content.
4. **Color Contrast:** Minimum 4.5:1 for normal text (WCAG AA).
5. **Focus Indicators:** Visible focus states on all interactive elements.
6. **I18n:** Externalize strings. Support RTL where needed.

## Design Principles (for UI Generation)

- **Purpose first:** Understand what problem the interface solves before designing.
- **Intentionality:** Bold maximalism and refined minimalism both work — the key is deliberate aesthetic direction.
- **Typography:** Distinctive, characterful font pairings. Avoid generic defaults.
- **Color:** Cohesive palette with CSS variables. Strong dominant + sharp accents.
- **Motion:** CSS-only preferred. High-impact moments: reveals, hover states, transitions.
- **Layout:** Unexpected compositions. Asymmetry, overlap, grid-breaking when appropriate.

---

# 9. Backend & API Patterns

## Server Action / Mutation Architecture

Every server-side mutation MUST follow this execution order:

```
1. Rate Limit      → Check BEFORE anything else (prevents brute-force + timing attacks)
2. Input Validate  → Parse with schema validation (NEVER trust client data)
3. Auth Check      → Verify identity at the data access layer
4. Access Control  → Verify user owns or has permission to access the resource
5. Business Logic  → Execute query/mutation
6. Cache Revalidate→ Invalidate affected caches on success
7. Return Result   → { success: boolean, message: string } — NEVER expose internals
```

> 🚨 Rate limiting MUST precede validation to prevent timing attacks.

## API Design

| Principle        | Rule                                                       |
| :--------------- | :--------------------------------------------------------- |
| Versioning       | `/api/v1/` prefix. Never break existing contracts.         |
| Methods          | Correct HTTP methods + status codes.                       |
| Pagination       | Cursor-based for large datasets. Offset OK for small sets. |
| Success response | `{ data: T, metadata?: { ... } }`                          |
| Error response   | `{ error: { code: string, message: string } }`             |
| Idempotency      | All mutations should be safe to retry.                     |
| Timeouts         | Set explicit timeouts on all external calls.               |

## Session & Auth

| Concern               | Rule                                                                        |
| :-------------------- | :-------------------------------------------------------------------------- |
| Stale JWT             | Re-check roles server-side on every mutation. Never trust JWT claims alone. |
| Session fixation      | Short-lived tokens (≤1h) + idle timeout (≤30min). Rotate on role changes.   |
| Race conditions       | Idempotent updates for concurrent request safety.                           |
| Privilege escalation  | Validate permissions at data access layer, not just UI/middleware.          |
| Session deduplication | Cache auth calls per-request to avoid redundant lookups.                    |

---

# 10. Database Standards

## Schema Design

- Normalized schema with proper indexes and documented relations.
- Use transactions (`$transaction`, `BEGIN/COMMIT`) for multi-step operations.
- Prevent N+1 queries — use eager loading carefully.
- Implement soft delete (`deleted_at`) on critical data.
- Use migrations for all schema changes. Never modify schema manually in production.

## Query Safety

- **Parameterized queries only.** Raw SQL must use proper escaping.
- Select only needed fields. Avoid `SELECT *`.
- Index frequently queried / filtered / sorted columns.
- Monitor slow queries. Set up query logging in development.

---

# 11. DevOps & Infrastructure

## Environment Management

- Separate configs per environment: `development`, `staging`, `production`.
- Use `.env.example` with placeholder values. Never commit real `.env` files.
- Validate all required env vars at app startup (fail fast).

## Container Security (Docker)

- Non-root users in containers.
- Minimal base images (Alpine, distroless).
- Scan for vulnerabilities in CI (`trivy`, `snyk`).
- Pin dependency versions. Use lockfiles.

## CI/CD Checklist

- [ ] Linting passes
- [ ] Type checking passes
- [ ] Unit tests pass
- [ ] Security audit (`npm audit`, `pip audit`, etc.)
- [ ] Build succeeds
- [ ] E2E tests pass (on staging)
- [ ] No new `any` / `ts-ignore` / `eslint-disable` without justification

## Dependency Management

- Regular audits: `npm audit`, `pip audit`, `cargo audit`.
- Use lockfiles. Pin major versions.
- Review changelogs before major upgrades.
- Remove unused dependencies proactively.

---

# 12. Documentation & Git

## Code Documentation

- **JSDoc / Docstrings:** Document complex functions (`@param`, `@returns`, `@throws`).
- **Inline Comments:** Explain "WHY", not "WHAT". Mark `// TODO:` and `// HACK:` with context.
- **README:** Every project needs setup instructions, architecture overview, and common commands.
- **ADRs:** Document significant architectural decisions in `/docs/adr/`.

## Git Conventions

- **Commits:** Conventional Commits format.
    ```
    feat: add user authentication
    fix: resolve race condition in session refresh
    chore: update dependencies
    refactor: extract validation logic to shared module
    docs: add API endpoint documentation
    test: add integration tests for payment flow
    perf: optimize database query for user search
    ```
- **Branches:** `feature/`, `fix/`, `chore/`, `release/` prefixes.
- **PRs:** Must pass CI. Include description, screenshots (UI), and linked issues.
- **No force push** on shared branches.

---

# 13. Defensive Coding — Edge-Case Prevention

## Authentication & Authorization

| Edge Case                   | Rule                                                                   |
| :-------------------------- | :--------------------------------------------------------------------- |
| Stale JWT role              | Always re-check roles server-side on every mutation.                   |
| Session fixation            | Short-lived JWT (≤1h) + idle timeout (≤30min). Rotate on role changes. |
| Race condition on role sync | Use idempotent updates for concurrent request safety.                  |
| Privilege escalation        | Validate permissions at data access layer, not just UI/middleware.     |

## Input & Data Validation

| Edge Case                     | Rule                                                                   |
| :---------------------------- | :--------------------------------------------------------------------- | ---------------------------------- |
| Invalid numeric range         | If clamping, MUST push a visible warning. Never silently clamp.        |
| Duplicate IDs in batch import | Check duplicates within file AND against database before insert.       |
| Optional fields = undefined   | Downstream code MUST handle `null                                      | undefined`. Never assume presence. |
| User input normalization      | Normalize before save (trim, collapse spaces, strip zero-width chars). |
| File extension spoofing       | Validate magic bytes AND extension whitelist together.                 |

## Error Handling

| Edge Case                    | Rule                                                                |
| :--------------------------- | :------------------------------------------------------------------ |
| Unhandled promise rejection  | Wrap all async operations in try/catch. Set global handlers.        |
| Timeout on external calls    | Set explicit timeouts. Implement circuit breaker for critical deps. |
| Partial failure in batch ops | Return per-item results. Never silent partial success.              |
| Retry storms                 | Exponential backoff + jitter. Cap max retries.                      |

## Rate Limiting Edge Cases

| Edge Case          | Rule                                                              |
| :----------------- | :---------------------------------------------------------------- |
| In-memory store    | Resets on restart, no cross-instance sharing. Use Redis at scale. |
| Missing IP headers | All requests share one bucket. Log a warning.                     |
| Cleanup in tests   | Call `.unref()` on intervals to prevent hanging test processes.   |

---

# 14. AI Response Format

When generating code as an AI agent:

1. **File context:** Wrap code in blocks with filenames (e.g., `// src/components/UserProfile.tsx`).
2. **Type separation:** Put interfaces and types in their own files under `/types`.
3. **Explain critical decisions:** Security considerations, performance trade-offs, architectural choices.
4. **Inline comments:** For complex logic, `TODO` items, and non-obvious patterns.
5. **No placeholders:** Generate complete, runnable code. Never use `// ... rest of the code`.
6. **Diff-friendly:** When modifying existing files, show only the changed sections with enough context to locate them.
7. **One concern per block:** Don't mix unrelated changes in a single code block.

---

# Appendix: Project-Specific Overrides

Create a `PROJECT.md` alongside this file to specify:

```markdown
# PROJECT.md — Project-Specific Configuration

## Tech Stack

- Framework: [e.g., Next.js 14, Django 5, Rails 7]
- Language: [e.g., TypeScript, Python 3.12, Ruby 3.3]
- Database: [e.g., PostgreSQL + Prisma, MongoDB + Mongoose]
- Styling: [e.g., Tailwind CSS, CSS Modules, styled-components]
- Testing: [e.g., Vitest + Playwright, pytest + Selenium]

## Additional Rules

- [Project-specific conventions, overrides, or extensions]

## Disabled Sections

- [List any sections from AGENTS.md that don't apply]
```

---

> **Version:** 2.0 — Universal Edition
> **Last Updated:** 2025
> **License:** Use freely in any project.
