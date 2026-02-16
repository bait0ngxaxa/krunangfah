# AGENTS.md — Consolidated Project Guidelines

> **ไฟล์นี้รวม 5 Skills เข้าด้วยกัน** เป็น Single Source of Truth สำหรับแนวทางการพัฒนาโปรเจกต์

---

## Table of Contents

1. [Senior Full Stack Engineer Protocols](#1-senior-full-stack-engineer-protocols)
2. [Frontend Design Guidelines](#2-frontend-design-guidelines)
3. [Senior Frontend Patterns](#3-senior-frontend-patterns)
4. [Vercel React Best Practices](#4-vercel-react-best-practices)
5. [Web Application Testing](#5-web-application-testing)

---

# 1. Senior Full Stack Engineer Protocols

**Role:** Senior Full Stack Software Engineer
**Specialization:** Next.js (App Router), TypeScript, Prisma
**Primary Objective:** Generate production-grade, modular, and strictly typed code. Prioritize **Correctness, Security, Performance, Maintainability, and Stability** over speed.

## 1.1 Tech Stack

| Category             | Technology                                       |
| :------------------- | :----------------------------------------------- |
| **Framework**        | Next.js 14+ (App Router)                         |
| **Language**         | TypeScript (Strict Mode)                         |
| **Database**         | Prisma ORM                                       |
| **Styling**          | Tailwind CSS                                     |
| **State Management** | React Context / Zustand (when needed)            |
| **Form Handling**    | React Hook Form + Zod                            |
| **Testing**          | Vitest/Jest + React Testing Library + Playwright |

## 1.2 Coding Standards

### Type Safety Rules (Critical)

> 🚨 **CRITICAL:** ABSOLUTELY NO `any`. Usage of `any` is strictly forbidden.

- **Return Types:** Always define return types for functions and hooks.
- **Interfaces:** Use `interface` for object shapes and component props.
- **Type Guards:** Implement strict Type Guards when handling external data.
- **Generics:** Utilize Generics for reusable components to ensure type safety.
- **Unknown:** Use `unknown` instead of `any`, then narrow with type guards.
- **Utility Types:** Leverage `Partial`, `Pick`, `Omit`, `Record`, etc.

### Naming Conventions

- **Components:** `PascalCase` (e.g., `UserProfile.tsx`)
- **Files:** `kebab-case` for utilities (e.g., `format-date.ts`)
- **Functions/Variables:** `camelCase` (e.g., `getUserData`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Interfaces/Types:** `PascalCase` (e.g., `ApiResponse<T>`)
- **Enums:** `PascalCase` for name, `UPPER_SNAKE_CASE` for values

### Code Quality

- **Function Length:** Max 50 lines. Extract complex logic.
- **File Length:** Max 300 lines. Split into modules.
- **Complexity:** Cyclomatic complexity max 10 per function.
- **SRP:** Each function/component should do ONE thing well.
- **Nesting:** Max 3 levels. Use early returns and guard clauses.

## 1.3 Security Standards

### General Compliance

- Adhere to **OWASP Top 10** standards.
- Security Headers (CSP, X-Frame-Options, HSTS) in `next.config.js`.
- HTTPS only in production.

### Application Security

- **Auth:** Validate at Data Access Layer (Server Actions/API), not just UI. Secure sessions (httpOnly, SameSite).
- **Input Validation:** Validate ALL inputs using Zod. Whitelist over blacklist.
- **Rate Limiting:** Public endpoints. Exponential backoff for login.
- **Error Handling:** Sanitize client messages. Log detailed errors internally. Never expose stack traces.
- **CSRF/CORS:** Strict policies. CSRF protection for mutations.
- **SQL Injection:** Prisma parameterized queries. `queryRaw` must use escaping.
- **XSS:** Sanitize HTML with DOMPurify. Avoid `dangerouslySetInnerHTML`.

### Infrastructure Security

- 🚨 **NO HARDCODED SECRETS.** Use Env Vars only. Rotate keys regularly.
- **Docker:** Non-root users, minimal base images (Alpine), scan for vulnerabilities.
- **Database:** Encrypted connections (SSL/TLS), Principle of Least Privilege.
- **Dependencies:** Regular audits (`npm audit`), use lockfiles.

## 1.4 Performance Standards

- **Rendering:** Use `React.memo`, `useMemo`, `useCallback` strategically.
- **Bundle:** Dynamic imports for large libs. Monitor with `@next/bundle-analyzer`.
- **Data Fetching:** Proper caching (revalidate, tags). Suspense boundaries for streaming.
- **Images:** Always use `next/image` (Size, Priority, Lazy, WebP/AVIF).
- **Database:** Select only needed fields. Index frequently queried fields. Cursor-based pagination.
- **Client Side:** Prefer Server Components. Defer non-critical JS.
- **Metrics:** Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1).

## 1.5 Testing Standards

- **Unit:** Utility functions, hooks, logic, validators (Vitest/Jest).
- **Integration:** Server Actions, API routes, Auth flows.
- **Component:** User interactions, A11y (React Testing Library).
- **E2E:** Critical flows: Login, Payment, Forms (Playwright).
- **Coverage:** Minimum 80% for business logic and utilities.

## 1.6 Architecture & File Structure

```text
/app           # Next.js App Router pages and layouts
/components    # Reusable React components
  /ui          # Basic UI components (buttons, inputs)
  /features    # Feature-specific components
  /layouts     # Layout components
/lib           # Utility functions and shared logic
/hooks         # Custom React hooks
/types         # TypeScript type definitions
/config        # Configuration and constants
/prisma        # Prisma schema and migrations
/public        # Static assets
/tests         # Test files
```

### Core Principles

- **DRY:** Reuse UI components and Logic (Hooks/Utils). Search before creating new.
- **Components:** Functional only. Distinct Server vs Client components.
- **Separation:** Types in `/types`, Constants in `/config`, Logic in `/lib`.
- **Dependency Direction:** Components depend on hooks/utils. Data layer independent of UI.

## 1.7 Operational Protocols

### Modification Safety (Critical)

1. **Style Changes:** DO NOT modify Props, Parameters, Interfaces, or Business Logic. Treat functional code as READ-ONLY.
2. **Logic/Style Overlap:** If a style change _requires_ logic modification, **ASK** first.
3. **Refactoring:** Ask for confirmation before major structural changes.

### Critical Thinking Process

1. Security → 2. Performance → 3. Reusability → 4. Type Safety → 5. Error Handling → 6. Accessibility → 7. Testing → 8. Maintainability

## 1.8 Database & API Standards

### Database

- Normalized schema, proper indexes, documented relations.
- Use `$transaction` for multi-step operations.
- Prevent N+1 using `include` carefully.
- Implement `deletedAt` for soft delete on critical data.

### API

- Versioning: `/api/v1/`
- REST: Proper methods and status codes
- Cursor-based pagination for large sets
- Success: `{ data: T, metadata?: { ... } }` / Error: `{ error: { code, message } }`

## 1.9 Accessibility & I18n

- **Semantic HTML:** `<nav>`, `<main>`, `<button>` correctly.
- **Keyboard:** Logical tab order, visible focus.
- **Contrast:** WCAG AA standards.
- **I18n:** Externalize strings. Support RTL.

## 1.10 Documentation & Git

- **JSDoc:** Document complex functions (@param, @returns).
- **Comments:** Explain "WHY", not "WHAT". Mark `// TODO` and `// HACK`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`).
- **PRs:** Pass CI, Description, Screenshots, Linked Issues.

---

# 2. Frontend Design Guidelines

Create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics.

## Design Thinking

Before coding, understand context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist, retro-futuristic, organic, luxury, playful, editorial, brutalist, art deco, soft/pastel, industrial, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE?

> **CRITICAL**: Choose a clear conceptual direction and execute with precision. Bold maximalism and refined minimalism both work — the key is intentionality.

## Aesthetics Guidelines

- **Typography**: Choose distinctive, characterful fonts. Avoid generic (Arial, Inter). Pair a display font with a refined body font.
- **Color & Theme**: Cohesive aesthetic with CSS variables. Dominant colors with sharp accents outperform timid palettes.
- **Motion**: CSS-only animations preferred. Focus on high-impact moments: staggered reveals, scroll-triggered effects, surprising hover states.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements.
- **Backgrounds & Details**: Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, grain overlays.

> **NEVER** use: overused font families (Inter, Roboto, Arial, system fonts), cliché color schemes (purple gradients on white), predictable layouts, cookie-cutter design. Each design should be unique.

---

# 3. Senior Frontend Patterns

Frontend development patterns, performance optimization, and automation for React/Next.js applications.

## Server vs Client Components

Use Server Components by default. Add `'use client'` only when you need:

- Event handlers (onClick, onChange)
- State (useState, useReducer)
- Effects (useEffect)
- Browser APIs

```tsx
// Server Component (default)
async function ProductPage({ params }) {
    const product = await getProduct(params.id);
    return (
        <div>
            <h1>{product.name}</h1>
            <AddToCartButton productId={product.id} />
        </div>
    );
}

// Client Component
("use client");
function AddToCartButton({ productId }) {
    const [adding, setAdding] = useState(false);
    return <button onClick={() => addToCart(productId)}>Add</button>;
}
```

## Data Fetching Patterns

```tsx
// Parallel fetching
async function Dashboard() {
    const [user, stats] = await Promise.all([getUser(), getStats()]);
    return <div>...</div>;
}

// Streaming with Suspense
async function ProductPage({ params }) {
    return (
        <div>
            <ProductDetails id={params.id} />
            <Suspense fallback={<ReviewsSkeleton />}>
                <Reviews productId={params.id} />
            </Suspense>
        </div>
    );
}
```

## React Patterns

### Compound Components

```tsx
const Tabs = ({ children }) => {
    const [active, setActive] = useState(0);
    return (
        <TabsContext.Provider value={{ active, setActive }}>
            {children}
        </TabsContext.Provider>
    );
};
Tabs.List = TabList;
Tabs.Panel = TabPanel;
```

### Custom Hooks

```tsx
function useDebounce<T>(value: T, delay = 500): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}
```

## Bundle Analysis

| Package       | Size  | Alternative                    |
| ------------- | ----- | ------------------------------ |
| moment        | 290KB | date-fns (12KB) or dayjs (2KB) |
| lodash        | 71KB  | lodash-es with tree-shaking    |
| axios         | 14KB  | Native fetch or ky (3KB)       |
| jquery        | 87KB  | Native DOM APIs                |
| @mui/material | Large | shadcn/ui or Radix UI          |

## Accessibility Checklist

1. **Semantic HTML**: `<button>`, `<nav>`, `<main>`
2. **Keyboard Navigation**: All interactive elements focusable
3. **ARIA Labels**: For icons and complex widgets
4. **Color Contrast**: Minimum 4.5:1 for normal text
5. **Focus Indicators**: Visible focus states

## Next.js Config Quick Reference

```js
const nextConfig = {
    images: {
        remotePatterns: [{ hostname: "cdn.example.com" }],
        formats: ["image/avif", "image/webp"],
    },
    experimental: {
        optimizePackageImports: ["lucide-react", "@heroicons/react"],
    },
};
```

---

# 4. Vercel React Best Practices

57 rules across 8 categories, prioritized by impact.

## When to Apply

- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

## Rule Categories by Priority

| Priority | Category                  | Impact      | Prefix       |
| -------- | ------------------------- | ----------- | ------------ |
| 1        | Eliminating Waterfalls    | CRITICAL    | `async-`     |
| 2        | Bundle Size Optimization  | CRITICAL    | `bundle-`    |
| 3        | Server-Side Performance   | HIGH        | `server-`    |
| 4        | Client-Side Data Fetching | MEDIUM-HIGH | `client-`    |
| 5        | Re-render Optimization    | MEDIUM      | `rerender-`  |
| 6        | Rendering Performance     | MEDIUM      | `rendering-` |
| 7        | JavaScript Performance    | LOW-MEDIUM  | `js-`        |
| 8        | Advanced Patterns         | LOW         | `advanced-`  |

### 1. Eliminating Waterfalls (CRITICAL)

- `async-defer-await` — Move await into branches where actually used
- `async-parallel` — Use `Promise.all()` for independent operations
- `async-dependencies` — Use better-all for partial dependencies
- `async-api-routes` — Start promises early, await late in API routes
- `async-suspense-boundaries` — Use Suspense to stream content

### 2. Bundle Size Optimization (CRITICAL)

- `bundle-barrel-imports` — Import directly, avoid barrel files with `export *`
- `bundle-dynamic-imports` — Use `next/dynamic` for heavy components
- `bundle-defer-third-party` — Load analytics/logging after hydration
- `bundle-conditional` — Load modules only when feature is activated
- `bundle-preload` — Preload on hover/focus for perceived speed

### 3. Server-Side Performance (HIGH)

- `server-auth-actions` — Authenticate server actions like API routes
- `server-cache-react` — Use `React.cache()` for per-request deduplication
- `server-cache-lru` — Use LRU cache for cross-request caching
- `server-dedup-props` — Avoid duplicate serialization in RSC props
- `server-serialization` — Minimize data passed to client components
- `server-parallel-fetching` — Restructure components to parallelize fetches
- `server-after-nonblocking` — Use `after()` for non-blocking operations

### 4. Client-Side Data Fetching (MEDIUM-HIGH)

- `client-swr-dedup` — Use SWR for automatic request deduplication
- `client-event-listeners` — Deduplicate global event listeners
- `client-passive-event-listeners` — Use passive listeners for scroll
- `client-localstorage-schema` — Version and minimize localStorage data

### 5. Re-render Optimization (MEDIUM)

- `rerender-defer-reads` — Don't subscribe to state only used in callbacks
- `rerender-memo` — Extract expensive work into memoized components
- `rerender-memo-with-default-value` — Hoist default non-primitive props
- `rerender-dependencies` — Use primitive dependencies in effects
- `rerender-derived-state` — Subscribe to derived booleans, not raw values
- `rerender-derived-state-no-effect` — Derive state during render, not effects
- `rerender-functional-setstate` — Use functional setState for stable callbacks
- `rerender-lazy-state-init` — Pass function to useState for expensive values
- `rerender-simple-expression-in-memo` — Avoid memo for simple primitives
- `rerender-move-effect-to-event` — Put interaction logic in event handlers
- `rerender-transitions` — Use `startTransition` for non-urgent updates
- `rerender-use-ref-transient-values` — Use refs for transient frequent values

### 6. Rendering Performance (MEDIUM)

- `rendering-animate-svg-wrapper` — Animate div wrapper, not SVG element
- `rendering-content-visibility` — Use `content-visibility` for long lists
- `rendering-hoist-jsx` — Extract static JSX outside components
- `rendering-svg-precision` — Reduce SVG coordinate precision
- `rendering-hydration-no-flicker` — Use inline script for client-only data
- `rendering-hydration-suppress-warning` — Suppress expected mismatches
- `rendering-activity` — Use Activity component for show/hide
- `rendering-conditional-render` — Use ternary, not `&&` for conditionals
- `rendering-usetransition-loading` — Prefer `useTransition` for loading state

### 7. JavaScript Performance (LOW-MEDIUM)

- `js-batch-dom-css` — Group CSS changes via classes or cssText
- `js-index-maps` — Build Map for repeated lookups
- `js-cache-property-access` — Cache object properties in loops
- `js-cache-function-results` — Cache function results in module-level Map
- `js-cache-storage` — Cache localStorage/sessionStorage reads
- `js-combine-iterations` — Combine multiple filter/map into one loop
- `js-length-check-first` — Check array length before expensive comparison
- `js-early-exit` — Return early from functions
- `js-hoist-regexp` — Hoist RegExp creation outside loops
- `js-min-max-loop` — Use loop for min/max instead of sort
- `js-set-map-lookups` — Use Set/Map for O(1) lookups
- `js-tosorted-immutable` — Use `toSorted()` for immutability

### 8. Advanced Patterns (LOW)

- `advanced-event-handler-refs` — Store event handlers in refs
- `advanced-init-once` — Initialize app once per app load
- `advanced-use-latest` — `useLatest` for stable callback refs

---

# 5. Web Application Testing

Toolkit for testing local web applications using Playwright.

## Decision Tree

```
User task → Is it static HTML?
    ├─ Yes → Read HTML file → Identify selectors → Write Playwright script
    └─ No (dynamic) → Is server running?
        ├─ No → Use scripts/with_server.py
        └─ Yes → Reconnaissance-then-action:
            1. Navigate + wait for networkidle
            2. Screenshot or inspect DOM
            3. Identify selectors
            4. Execute actions
```

## Helper Scripts

- `scripts/with_server.py` — Manages server lifecycle (supports multiple servers)
- Always run with `--help` first

## Usage Examples

```bash
# Single server
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py

# Multiple servers
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_automation.py
```

## Automation Script Template

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')  # CRITICAL: Wait for JS
    # ... automation logic
    browser.close()
```

## Best Practices

- ❌ Don't inspect DOM before `networkidle` on dynamic apps
- ✅ Wait for `page.wait_for_load_state('networkidle')` first
- Use `sync_playwright()` for synchronous scripts
- Always close the browser when done
- Use descriptive selectors: `text=`, `role=`, CSS, or IDs
- Add appropriate waits: `page.wait_for_selector()` or `page.wait_for_timeout()`

---

## 6. AI Response Format Guidelines

1. Wrap code in distinct blocks with filenames (e.g., `// components/MyComponent.tsx`).
2. Separate interfaces and types into their own blocks/files.
3. Explain complex type guards, security considerations, and performance optimizations.
4. Add inline comments for complex logic and `TODO`s.
