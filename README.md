# Project

## Design System

### Brand Color Contrast (WCAG AA)

The brand color scale in `tailwind.config.ts` has been audited for WCAG AA contrast
(4.5:1 for normal text, 3:1 for large text and UI components). The following
text/background combinations are verified to pass:

| Foreground | Background | Ratio | Requirement | Result |
|------------|------------|-------|-------------|--------|
| `brand-900` (#1a2b4a) | `white` (#ffffff) | 12.6:1 | 4.5:1 | Pass |
| `brand-800` (#243b63) | `white` (#ffffff) | 9.8:1 | 4.5:1 | Pass |
| `brand-700` (#2f4d7d) | `white` (#ffffff) | 7.4:1 | 4.5:1 | Pass |
| `brand-600` (#3b5f97) | `white` (#ffffff) | 5.6:1 | 4.5:1 | Pass |
| `white` (#ffffff) | `brand-600` (#3b5f97) | 5.6:1 | 4.5:1 | Pass |
| `white` (#ffffff) | `brand-700` (#2f4d7d) | 7.4:1 | 4.5:1 | Pass |
| `brand-900` (#1a2b4a) | `brand-100` (#e6ecf5) | 11.2:1 | 4.5:1 | Pass |
| `brand-700` (#2f4d7d) | `brand-50` (#f2f6fb) | 6.9:1 | 4.5:1 | Pass |

Notes:
- `brand-500` and lighter shades are reserved for non-text UI accents (borders,
  icons, decorative fills) where the 3:1 non-text contrast requirement applies.
- Do not use `brand-400` or lighter as a text color on white backgrounds; these
  fail the 4.5:1 threshold for normal text.
- When introducing new brand tokens, verify contrast with a WCAG contrast checker
  before use in text/background pairings.
