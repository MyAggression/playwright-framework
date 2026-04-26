# playwright-framework

![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.44+-45ba4b?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)

Production-grade E2E and API automation framework built with Playwright and TypeScript. This repo documents my approach to test architecture — not as a tutorial, but as a reference for how I structure automation in a real team.

## Architecture Overview

Tests split into two layers: UI (Page Object Model over Playwright) and API (Playwright's `APIRequestContext` without a separate tool). The POM layer encapsulates selectors and reusable actions; the API layer covers contract validation, security boundary checks, and data setup for UI tests. A shared fixture system wires both layers together so tests stay independent and readable without repeating setup code.

## Stack

| Layer | Technology |
|-------|-----------|
| Test runner | Playwright 1.44+ |
| Language | TypeScript (strict mode) |
| UI apps | the-internet.herokuapp.com, demoqa.com, demo.playwright.dev/todomvc |
| API apps | reqres.in, jsonplaceholder.typicode.com |
| CI | GitHub Actions — matrix (Chromium + Firefox), 4 parallel workers |
| Reporting | Playwright HTML report + GitHub PR annotations |

## Metrics

| Metric | Value |
|--------|-------|
| Total test scenarios | 45+ |
| E2E UI tests | ~20 |
| API tests | ~25 |
| Parallel workers (CI) | 4 |
| Browsers | Chromium, Firefox |
| Target CI run time | <12 min |
| Retries in CI | 1 |

## Coverage

| Type | What's covered |
|------|---------------|
| E2E UI | Auth flows (data-driven), TodoMVC full CRUD, form validation + file upload |
| API — Functional | CRUD, pagination, schema validation, response time |
| API — Security | IDOR, broken auth, privilege escalation, mass assignment, rate limiting, input validation |
| Data-driven | `test.each` tables in all spec files |

## Key Design Decisions

**1. Playwright for API testing, not a separate tool.**
`APIRequestContext` gives you the same trace viewer, CI integration, and HTML report as UI tests. One runner. One artifact. No context switch between Postman and Selenium.

**2. POM capped at two inheritance levels.**
`BasePage` holds cross-cutting patterns (fill-and-verify, element wait, title check). Subclasses hold page-specific locators and actions. Deeper hierarchies obscure capability and create fragile chains.

**3. Data-driven via `test.each`, not duplicated test blocks.**
A table of `[scenario, input, expected]` makes coverage gaps visible and generates individual report entries per row. Missing a case is obvious in a table; missing a function is not.

**4. Security tests belong in the same pipeline as functional tests.**
IDOR, auth bypass, and mass assignment tests run on every PR. They verify that known boundaries hold — not novel attack paths. Removing a guard silently during a refactor is the failure mode these tests catch.

**5. `forbidOnly: !!process.env.CI` is non-negotiable.**
Prevents `test.only` from shipping in a PR and silently skipping 90% of the suite.

See [docs/architecture.md](docs/architecture.md) for full rationale on every decision.

## How to Run

### Local
```bash
git clone https://github.com/your-name/playwright-framework.git
cd playwright-framework
npm install
npx playwright install --with-deps
npx playwright test
npx playwright show-report
```

### By layer
```bash
npm run test:e2e    # UI tests only
npm run test:api    # API tests only
```

### Single browser
```bash
npx playwright test --project=chromium
```

### Docker
```bash
docker build -t playwright-framework .
docker run --rm playwright-framework npm test
```

## CI/CD

GitHub Actions runs on every push and pull_request to `main`. Matrix strategy: Chromium and Firefox as parallel jobs.

Pipeline per browser:
1. Checkout
2. Setup Node 20
3. `npm ci`
4. Install Playwright browsers (`--with-deps`)
5. Run tests with 4 workers + `--reporter=github` for PR annotations
6. Upload `playwright-report/` artifact on failure (7-day retention)

Job timeout: 15 minutes. Test retries: 1 in CI to absorb transient network errors.

## Project Structure

```
playwright-framework/
├── pages/                   # Page Object Model classes
│   ├── BasePage.ts          # Abstract base: navigate, fill, wait helpers
│   ├── LoginPage.ts         # the-internet.herokuapp.com auth flows
│   ├── TodoPage.ts          # TodoMVC CRUD and filter actions
│   └── FormsPage.ts         # demoqa.com automation practice form
├── tests/
│   ├── e2e/                 # UI end-to-end tests
│   │   ├── auth.spec.ts     # Login: data-driven, session, redirect
│   │   ├── todo.spec.ts     # CRUD, persistence, filters, bulk actions
│   │   └── forms.spec.ts    # Happy path, validation, file upload
│   ├── api/                 # API functional and security tests
│   │   ├── auth-api.spec.ts # POST /login, POST /register — schema + status
│   │   ├── users-api.spec.ts# CRUD, pagination, 404
│   │   └── security.spec.ts # IDOR, broken auth, mass assignment, rate limiting
│   └── fixtures/
│       └── test-fixtures.ts # authenticatedPage, apiContext, cleanupTodos
├── helpers/
│   ├── apiClient.ts         # Typed HTTP wrapper with assertStatus/assertSchema
│   └── testData.ts          # generateUser, generateTodo, payloads, constants
├── test-data/
│   └── users.json           # Parametric user data for data-driven tests
├── docs/
│   └── architecture.md      # Engineering decisions and rationale
├── .github/workflows/
│   └── ci.yml               # GitHub Actions CI pipeline
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

