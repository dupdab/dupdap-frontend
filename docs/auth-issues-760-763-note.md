# Note to maintainers

## Register confirm-password field (#763)

`src/app/auth/register/page.tsx` already has this on main, so no code change was made:

- A `confirmPassword` input (`id="confirmPassword"`, `type="password"`) registered with react-hook-form.
- The zod schema requires it (`Please confirm your password`) and a `.refine` on the object compares it with `password`, reporting `Passwords do not match` on the `confirmPassword` path.
- The error renders inline under the field (`id="confirmPassword-error"`, `role="alert"`), is wired up through `aria-invalid` / `aria-describedby`, and is included in the error summary.
- `register.test.tsx` already submits with matching and mismatching confirmation values.
- Only `password` is sent to `authApi.register`; the confirmation value is never submitted.

The same branch adds `autocomplete="new-password"` to both password inputs (#762).
