<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions

Unless stated otherwise, paths in this document are relative to `src/`.

## Source organization

- Place user-facing views and shared UI in `components/`.
- Place reusable client hooks in `hooks/`.
- Place non-React formatting and styling helpers in `lib/`.

## UI components

- When implementing a supplied design, include only the elements shown or required by the request. Do not invent navigation items, actions, panels, or copy.
- Reuse existing components from `components/ui/` before creating new primitives.
- Before building a missing primitive, check whether shadcn/ui provides it. If it does, add it with `bunx --bun shadcn@latest add <component>`.
- If shadcn/ui does not provide the component, compose existing primitives first. Create a custom component only when composition is insufficient.
- Keep generated and reusable primitives in `components/ui/`; keep feature-specific composition in `components/`.
- Use the configured shadcn theme tokens and Tailwind utilities instead of hardcoded colors or duplicated design tokens.
- Use Tailwind's canonical utility syntax when an equivalent exists; avoid arbitrary-value forms that trigger `suggestCanonicalClasses` diagnostics (for example, use `min-w-350` instead of `min-w-[1400px]`).
- Use `cn` from `lib/utils.ts` for conditional class names and Remix Icon components for icons.
- Preserve keyboard behavior, focus states, labels, and other accessibility semantics when wrapping or extending primitives.

## Forms and validation

- Use TanStack Form for form state and submission handling.
- Define reusable Zod form schemas in `schema/` and pass them directly as Standard Schema validators where possible.

## API and server state

- Keep the Axios instance in `lib/api.ts`.
- Keep validated request functions in `lib/api-requests.ts`.
- Keep Zod request and response schemas in `schema/`.
- Keep React Query keys in `lib/query-keys.ts`.
- Keep React Query hooks in `queries/index.ts` and mutations in `mutations/index.ts`.
- Define shared paging fields in `PaginationRequestSchema` and extend it for endpoint-specific request schemas instead of redefining `page` and `pageSize`.
- Pass query parameters to React Query hooks as one typed object, normalize them with the endpoint request schema, and include the normalized object in the query key.
- Store HTTP server state in React Query. Do not duplicate query data, loading state, or error state with `useState`.
- Use the global React Query mutation error handler for Sonner toasts. Keep contextual inline errors where useful; do not duplicate toast callbacks in individual mutations.
- Implement each new feature through the complete applicable flow. For server-backed features, add or update Zod schemas, validated request functions, query keys, and React Query hooks or mutations before wiring the UI.

## Data sources

- Prefer backend-backed data.
- Mark unavoidable temporary data with `TODO: HARDCODED` and state how it will be replaced with backend data.
- When a backend is not ready, keep temporary server data in `lib/api-requests.ts`; do not declare it in routes or components.
- Keep temporary API mocks inline in the existing request function: comment out the `api.*` call, add the mock response immediately below it, and mark it with `TODO: HARDCODED`. Do not create separate mock functions or abstractions.

## Implementation

- Prefer the smallest direct implementation that satisfies the current requirement.
- Reuse existing helpers, hooks, components, and installed dependencies before adding new abstractions or packages.
- Keep components focused; move reusable non-React logic out of components and into `lib/`.
