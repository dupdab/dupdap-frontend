# Next.js App Router conventions

This project uses the Next.js App Router (`src/app`). This document describes how routes are organised and when to use each file or component type.

## `layout.tsx` vs `page.tsx`

- `page.tsx` renders the UI that is unique to a route and makes the route publicly addressable. A folder without a `page.tsx` is not a route.
- `layout.tsx` wraps a route segment and all of its children. It persists across navigation between child routes (state is preserved, it does not re-mount), so put shared chrome there: for example `src/app/dashboard/layout.tsx` holds the dashboard sidebar and mobile drawer, and `src/app/layout.tsx` holds the root HTML shell, fonts and global providers.
- Layouts receive `children` and must not fetch per-page data. Per-page data and state belong in `page.tsx` (or components it renders).
- Several auth routes (`auth/login`, `auth/register`, ...) have a small `layout.tsx` whose only job is to export route-specific `metadata`, because `page.tsx` is a client component and cannot export it.

## Server vs client components

- Components are server components by default. Add `'use client'` only when the file needs state, effects, event handlers, browser APIs, or client-only libraries.
- Almost all dashboard pages are client components because they use hooks (`useState`, `useEffect`) and the axios client in `src/lib/api.ts`.
- Keep the `'use client'` boundary as low in the tree as possible. Prefer extracting a small interactive component over marking an entire page as client.
- Heavy browser-only libraries (recharts) are loaded with `next/dynamic` and `ssr: false`, see `src/app/dashboard/analytics/page.tsx`.
- Metadata (`export const metadata`) can only be exported from server components.

## Route groups

Route groups are folders wrapped in parentheses, e.g. `(marketing)`. They organise routes or give a subset of routes a shared layout without changing the URL. This project does not currently use any; if one is introduced, document its purpose here. Nesting by real segment (`dashboard/settings`) is used when the URL should change.

## Dynamic segments

Folders in square brackets map to URL params, e.g. `src/app/pay/[paymentId]/page.tsx` and `src/app/dashboard/settlements/[settlementId]/page.tsx`. Read them with `useParams()` in client components.

## Parallel routes

Parallel routes (`@slot` folders rendered as props of the parent layout) are not used in this project. Reach for them only when a layout must render several independent sections that load or fail separately, or for modal-over-page patterns together with intercepting routes. Otherwise use ordinary components.

## Related conventions

- Tests sit next to the code (`*.test.tsx`) or in `src/__tests__`.
- Next.js navigation hooks are mocked through `src/__mocks__/next/navigation.ts`.
- Shared hooks and helpers live in `src/lib`; shared UI in `src/components`.
- Modals and dialogs must trap focus with `useFocusTrap` (`src/lib/useFocusTrap.ts`), see below.

## Note to maintainers on the focus trap (#597)

`useFocusTrap` already exists in `src/lib/useFocusTrap.ts` and is used by `Modal`, `ConfirmDialog` and the dashboard mobile drawer. It implements initial focus, Tab / Shift+Tab cycling and focus restore with a built-in selector, so the `tabbable` dependency was not added.
