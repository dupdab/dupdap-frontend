# Note to maintainers

## Footer copyright year (#584)

The landing page footer in `src/app/page.tsx` already renders the copyright year
with `new Date().getFullYear()`, so there is no hardcoded `2025` left in `src/`.
The page is a server component, so the year is computed during server rendering
and does not depend on hydration. It is the only footer in the app.
