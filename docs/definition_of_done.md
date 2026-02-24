---
# Development Task Validation Flow

## Purpose

Define a strict validation and governance workflow that MUST be executed before any task is marked as completed.

No task can be considered finished without passing this full flow.

This document is optimized for autonomous agent execution and enforces architectural stability, repository governance, and release control.
---

# 0. Pre-Development Clarification (Mandatory)

Before starting development:

- If requirements are unclear, ask questions.
- Do not assume missing details.
- Confirm acceptance criteria if ambiguous.
- Identify impacted modules.
- Identify potential architectural implications.

Development MUST NOT start with unresolved doubts.

---

# 1. Scope & Architectural Boundary Check (Pre-Implementation Gate)

Before writing code:

- Confirm the change is minimal and well-scoped.
- Confirm no unnecessary refactor is being introduced.
- Confirm no architectural boundary is being crossed.
- Confirm no new dependency is required unless strictly justified.

If a new dependency is required:

- Justify why existing tooling cannot solve the problem.
- Prefer standard library or already installed dependencies.
- Avoid dependency inflation.

If any condition fails → STOP and reassess.

---

# 2. Self-Review Before Running Tests

Before executing tests or builds, reflect:

- Does the implementation actually solve the original problem?
- Are contracts respected? (types, interfaces, API schemas, DTOs)
- Are SOLID principles respected?
- Is the solution minimal?
- Are edge cases handled?
- Is backward compatibility preserved?
- Is error handling explicit and deterministic?
- Is behavior predictable under failure conditions?

If any answer is negative, iterate before proceeding.

---

# 3. Existing Test Validation (Regression Safety)

Run the current test suite BEFORE validating the new feature.

### If existing tests FAIL:

1. Fix the failing tests or underlying issue.
2. Re-run all tests.
3. Ensure 100% passing.
4. Only then continue.

### If existing tests PASS:

Proceed to build step.

No regression is acceptable.

---

# 4. Build Validation

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

Build must be clean with zero warnings if possible.

---

# 5. New Feature Test Enforcement (Mandatory)

Every new feature MUST include:

- Unit tests
- Integration tests (if applicable)
- Contract tests (if applicable)

Rules:

- Tests must cover happy path.
- Tests must cover edge cases.
- Tests must cover failure paths.
- Tests must not mock excessively without reason.
- Tests must validate behavior, not implementation details.

Steps:

1. Create new tests covering the feature.
2. Run full test suite.
3. Ensure all tests pass (old + new).

No feature is valid without new tests.

---

# 6. Architectural Drift & Duplication Control

Before completion:

- Check for duplicated logic.
- Check for dead code.
- Check for unused imports.
- Check for unnecessary abstractions.
- Check for leaky layers (e.g., infrastructure logic inside domain).
- Ensure naming consistency.
- Ensure folder structure consistency.

The change must not degrade architectural integrity.

---

# 7. Documentation Update (Mandatory)

After successful validation:

## 7.1 Update `Changelog.md`

Append:

- Description of the change
- Type (feature, fix, refactor, test, breaking change)
- Affected modules
- Any migration notes (if needed)

Entries must be concise and factual.

## 7.2 Update `todo.md`

- Locate the related task.
- Mark it as completed if fully resolved.
- If partially completed, update its status clearly.

---

# 8. Branching & Repository Governance (Mandatory)

## 8.1 Branch Strategy Enforcement

All development MUST follow this branch flow:

```
feature/* → develop → main
```

Rules:

- Work MUST be performed in a `feature/*` branch.
- Feature branches MUST be merged into `develop`.
- Direct commits to `main` are strictly forbidden.
- If the current branch is `main`, development MUST STOP immediately.
- `main` must always remain stable and production-ready.

---

## 8.2 Agent Restrictions

The agent:

- MAY create `feature/*` branches.
- MAY merge `feature/*` into `develop`.

The agent MUST NOT:

- Push directly to `main`
- Modify `main`
- Create git tags
- Create releases
- Modify version numbers
- Modify version fields in any project file
- Perform semantic version bumps
- Rewrite git history
- Force push
- Delete branches

Repository governance is human-controlled.

---

## 8.3 Versioning Policy

- `main` represents the latest stable production-ready state.
- Semantic versioning is applied manually.
- Version increments are decided by a human.
- Git tags are created manually.
- Releases are published manually.

No automated versioning is allowed.

---

## 9. Final Verification Loop

After:

- All tests passing
- Client build successful
- Server build successful
- Documentation updated
- Change merged into `develop`

Perform final review:

- Any hidden side effects?
- Any contract violations?
- Any architectural boundary violations?
- Any accidental dependency introduction?
- Any performance degradation?
- Any security risk introduced?
- Any logging inconsistencies?
- Any missing error handling?

If any issue is found → fix and repeat full validation flow.

---

# 10. Completion Criteria

A task is considered DONE only if:

- No open doubts remain
- Scope is minimal and justified
- No architectural drift introduced
- No unnecessary dependencies added
- All previous tests pass
- New tests are added and pass
- Client build succeeds
- Server build succeeds
- `Changelog.md` updated
- `todo.md` updated
- The change is merged into `develop`
- No direct modification of `main` occurred
- No version/tag/release was created by the agent

If any condition is not satisfied → the task is NOT complete.

---

# Core Rule

Never mark a task as finished without:

Tests + Clean Build + Documentation + Architectural Integrity + Proper Branch Flow + Human-Controlled Release

---
