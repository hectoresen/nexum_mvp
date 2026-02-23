# Development Task Validation Flow

## Purpose

Define a strict validation workflow that MUST be executed before any task is marked as completed.

No task can be considered finished without passing this full flow.

---

## 0. Pre-Development Clarification (Mandatory)

Before starting development:

- If requirements are unclear, ask questions.
- Do not assume missing details.
- Confirm acceptance criteria if ambiguous.

Development MUST NOT start with unresolved doubts.

---

## 1. Self-Review Before Running Tests

Before executing tests or builds, reflect:

- Does the implementation actually solve the original problem?
- Are contracts respected? (types, interfaces, API schemas, DTOs)
- Is the solution aligned with SOLID principles?
- Is the change minimal and well-scoped?
- Have edge cases been considered?
- Is backward compatibility preserved?

If any answer is negative, iterate before proceeding.

---

## 2. Existing Test Validation (Regression Safety)

Run the current test suite BEFORE validating the new feature.

### If existing tests FAIL:
1. Fix the failing tests or underlying issue.
2. Re-run all tests.
3. Ensure 100% passing.
4. Only then continue.

### If existing tests PASS:
Proceed to build step.

---

## 3. Build Validation

Run full build for:

- Client
- Server

### If build FAILS:
- Fix errors.
- Re-run tests.
- Re-run build.
- Repeat until clean.

### If build SUCCEEDS:
Proceed to feature test creation.

---

## 4. New Feature Test Enforcement (Mandatory)

Every new feature MUST include:

- Unit tests
- Integration tests (if applicable)
- Contract tests (if applicable)

Steps:
1. Create new tests covering the feature.
2. Run full test suite.
3. Ensure all tests pass (old + new).

No feature is valid without new tests.

---

## 5. Final Verification Loop

After:

- All tests passing
- Client build successful
- Server build successful

Perform final review:

- Any hidden side effects?
- Any broken contracts?
- Any duplicated logic?
- Any violations of architecture boundaries?

If issues are found → fix and repeat validation flow.

---

## 6. Documentation Update (Mandatory)

After successful validation:

### 6.1 Update `Changelog.md`

Append:

- Description of the change
- Type (feature, fix, refactor, test, breaking change)
- Affected modules
- Any migration notes (if needed)

### 6.2 Update `todo.md`

- Locate the related task.
- Mark it as completed if fully resolved.
- If partially completed, update its status clearly.

---

## 7. Completion Criteria

A task is considered DONE only if:

- No open doubts remain
- All previous tests pass
- New tests are added and pass
- Client build succeeds
- Server build succeeds
- `Changelog.md` updated
- `todo.md` updated

If any condition is not satisfied → the task is NOT complete.

---

## Core Rule

Never mark a task as finished without:

Tests + Build + Documentation Updates