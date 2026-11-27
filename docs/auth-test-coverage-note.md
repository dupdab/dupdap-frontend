# Note to maintainers: auth page test coverage

## Reset-password page (#766)

`src/app/auth/reset-password/reset-password.test.tsx` already exists and covers
the acceptance criteria of #766:

- Renders with valid token: "form rendering" describe block (both password
  inputs, submit button, back link).
- Expired/invalid token: "no token (invalid link)" block renders the
  "Invalid reset link" guard; "does not redirect when API returns an error"
  covers a rejected `Token expired` response.
- Submits new password and redirects to login: "submit flow" block asserts
  `authApi.resetPassword({ token, password })` and `router.push('/auth/login')`.
- Password confirmation match: "validation" block asserts the
  "Passwords do not match" message and the disabled/enabled submit button.

No test changes were needed, so this note is the only change for #766.
