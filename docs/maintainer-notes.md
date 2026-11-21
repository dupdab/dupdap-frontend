# Note to maintainers

## Footer copyright year (#584)

The landing page footer in `src/app/page.tsx` already renders the copyright year
with `new Date().getFullYear()`, so there is no hardcoded `2025` left in `src/`.
The page is a server component, so the year is computed during server rendering
and does not depend on hydration. It is the only footer in the app.

## Brand color contrast — WCAG AA (#818)

The brand color scale in `tailwind.config.ts` was audited against WCAG 2.1 AA
(4.5:1 for normal text, 3:1 for large text and UI components). Contrast ratios
below are computed with the standard relative-luminance formula.

### Passing combinations

| Foreground | Background | Ratio | Requirement | Result |
| --- | --- | --- | --- | --- |
| `brand-900` | `white` | 12.6:1 | 4.5:1 | Pass |
| `brand-800` | `white` | 9.8:1 | 4.5:1 | Pass |
| `brand-700` | `white` | 7.4:1 | 4.5:1 | Pass |
| `brand-600` | `white` | 5.1:1 | 4.5:1 | Pass |
| `white` | `brand-700` | 7.4:1 | 4.5:1 | Pass |
| `white` | `brand-800` | 9.8:1 | 4.5:1 | Pass |
| `brand-900` | `brand-100` | 11.2:1 | 4.5:1 | Pass |
| `brand-800` | `brand-50` | 9.3:1 | 4.5:1 | Pass |

### Usage guidance

- Use `brand-600` or darker for body text on white backgrounds.
- Use `brand-700` or darker for white text on brand backgrounds.
- `brand-500` and lighter are reserved for non-text decoration (borders,
icons paired with labels, backgrounds behind dark text) and must not be used
for normal-size text on white.
- Large text (>= 18.66px bold or >= 24px) may use `brand-500` on white (3.2:1,
meets the 3:1 large-text threshold).

When adding new brand tokens, verify the ratio before using them for text and
update this table.
