# Architecture & Engineering Decisions

This document explains the *why* behind key design choices — not the structure, but the reasoning. The structure is self-explanatory from the repo; the reasoning is not.

---

## 1. Why Playwright over Selenium

Playwright has three concrete advantages over Selenium that matter at scale:

**Auto-wait.** Playwright waits for elements to be actionable before interacting. Selenium requires explicit `WebDriverWait` or you get `ElementNotInteractableException` at 2 AM. This alone eliminates an entire class of flaky tests.

**Network interception via `route()`.** Playwright can intercept, modify, and mock HTTP requests from within the test process. This is how `security.spec.ts` models auth enforcement without changing the server. In Selenium, you'd need a proxy (BrowserMob, mitmproxy) wired externally.

**Unified API and UI testing.** `APIRequestContext` lets you write API tests in the same framework, with the same reporters, CI integration, and trace viewer. No context switch between Postman collections and your Selenium suite. One `playwright show-report` shows everything.

**Trace viewer.** When a test fails in CI, you get a ZIP with a full trace: screenshots, network calls, console logs, DOM snapshots. Debugging CI failures without this is slow.

---

## 2. Why Page Object Model — and when it's overkill

POM earns its keep when multiple tests interact with the same page. A single `LoginPage` class means selectors are defined once — change the `#username` selector in one place, not in 12 test files.

When POM is overkill: for a one-off API test or a script that runs twice and gets thrown away. Wrapping a three-line API call in a class is premature abstraction.

Rule of thumb: if more than two tests use the same UI element, encapsulate it. If it's a one-time interaction, write it inline.

This framework caps inheritance at two levels: `BasePage → SpecificPage`. Deeper hierarchies obscure what a page can actually do.

---

## 3. Why data-driven via `test.each`, not duplicated test blocks

A table of `[scenario, input, expected]` rows is more readable than five nearly-identical `test` blocks. It also makes coverage gaps visible: a missing row in the table is obvious; a missing test function is not.

`test.each` also generates individual test entries in the HTML report, so you can see which specific input caused a failure without reading the source.

---

## 4. Test isolation strategy

Every test is independent of every other test. This is not a preference — it's what makes `fullyParallel: true` safe.

Concretely:
- `beforeEach` sets up fresh state (new page, new login, new data)
- `afterEach` (or fixture teardown) cleans up
- No shared global variables between tests
- No test depends on another test having run first

For TodoMVC, each test navigates to a fresh page — `localStorage` starts empty in each new Playwright context.

For API tests, each test creates its own resources and doesn't rely on IDs created by other tests.

---

## 5. API testing in Playwright, not a separate tool

The argument for a separate tool (Postman, RestAssured, pytest-requests) is familiarity. The argument against is fragmentation: separate runner, separate reports, separate CI step, separate failure triage.

`APIRequestContext` in Playwright is capable enough for contract testing, security boundary tests, and data setup for UI tests. All results appear in one HTML report, one CI artifact, one trace. The tradeoff is that Playwright is heavier than a pure HTTP library — but in a team running both UI and API tests, that weight is already paid.

---

## 6. Security test approach — QA's job, not just pentesting

Security tests in `security.spec.ts` cover boundary cases that QA should own:

- **IDOR**: does the API enforce ownership? Can user A access user B's data?
- **Broken auth**: are invalid and expired tokens rejected?
- **Mass assignment**: does the API ignore unexpected fields (like `role: "admin"`)?
- **Input validation**: does the API return 4xx (not 5xx) for injected payloads?

These are not penetration testing. A pentester finds novel attack paths; QA verifies that known boundaries hold on every PR. The cost of not running these in CI is that a refactor silently removes a guard and no test catches it until production.

Playwright's `route()` is used to model auth enforcement that reqres.in (a public mock) doesn't implement. The test demonstrates the test STRATEGY: intercept the request, check the authorization header, return 403 if it's missing or wrong. In a real system, you remove the `route()` mock and point at the real API.

---

## 7. CI/CD decisions

**`retries: 1` in CI, `0` locally.** In CI, transient network errors (timeouts to demo.playwright.dev, reqres.in) cause false negatives. One retry absorbs those without masking real failures — a consistently failing test will fail on both attempts. Locally, retries hide problems you should see immediately.

**`workers: 4` in CI, `2` locally.** 4 workers cut the CI runtime roughly in half vs sequential. Locally, 4 workers on a developer laptop can starve other processes; 2 is a reasonable default that doesn't block the machine.

**Matrix: chromium + firefox as separate jobs.** Browser-specific bugs exist. Running both in parallel (via `strategy.matrix`) means the total wall-clock time stays at ~12 minutes rather than doubling to 24.

**`forbidOnly: !!process.env.CI`.** Prevents `test.only` from accidentally shipping in a PR and silently skipping the rest of the suite. This has caught real issues.

**`timeout-minutes: 15` at workflow level.** Playwright's own `globalTimeout` is 10 minutes; the GitHub job timeout is 15 minutes as a safety net if the process hangs before Playwright's timeout fires.
