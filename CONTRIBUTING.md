# Contributing

Thanks for your interest in contributing! This guide covers everything you need to get a local development environment running and to land a change.

## Prerequisites

- **Node.js 18+** — the version is pinned in [`.nvmrc`](./.nvmrc). If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` from the repo root.
- **npm** (ships with Node) — the project uses the committed lockfile.
- **A running backend** — the frontend expects the API to be reachable locally. Start it per its own README before running the dev server.
- **Environment variables** — copy the example file and fill in the values:

  ```bash
  cp .env.local.example .env.local
  ```

  See `.env.local.example` for the full list of required variables and their expected values. Never commit `.env.local` or any real secrets.

## Local development setup

1. Clone the repository and move into it:

   ```bash
   git clone <repo-url>
   cd <repo-name>
   ```

2. Use the pinned Node version:

   ```bash
   nvm use
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Configure environment variables (see above):

   ```bash
   cp .env.local.example .env.local
   ```

5. Make sure the backend is running and reachable at the URL configured in `.env.local`.

6. Start the dev server:

   ```bash
   npm run dev
   ```

7. Run the test suite before opening a PR:

   ```bash
   npm test
   ```

## Branch naming convention

Create a branch off `main` using one of these prefixes, followed by a short kebab-case description:

| Prefix      | Use for                                   |
| ----------- | ----------------------------------------- |
| `feat/`     | New features                              |
| `fix/`      | Bug fixes                                 |
| `docs/`     | Documentation-only changes                |
| `refactor/` | Code changes that neither fix nor add     |
| `chore/`    | Tooling, dependencies, maintenance        |
| `test/`     | Adding or updating tests                  |

Examples: `feat/user-profile-page`, `fix/login-redirect-loop`, `docs/contributing-guide`.

## Pull request checklist

Before opening a PR, confirm:

- [ ] The branch is up to date with `main` and named per the convention above.
- [ ] `npm install` and `npm run dev` work from a clean checkout.
- [ ] `npm test` passes locally.
- [ ] New or changed behavior is covered by tests where practical.
- [ ] No secrets, `.env.local`, or credentials are committed.
- [ ] The PR description explains **what** changed and **why**, and links the related issue (e.g. `Closes #123`).
- [ ] Screenshots or recordings are attached for UI changes.
- [ ] The diff is scoped to the issue — unrelated refactors are split into separate PRs.

## Code review expectations

- Every PR requires at least one approving review before merge.
- Reviewers focus on correctness, readability, test coverage, and adherence to existing patterns.
- Address review comments with follow-up commits; resolve conversations once handled.
- Keep PRs small and focused — large PRs are harder to review and slower to merge.
- Be respectful and constructive; assume good intent. See the project's code of conduct if one is provided.
