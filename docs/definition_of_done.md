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

- **Date** of the change (YYYY-MM-DD or the version it belongs to)
- Description of the change
- Type (feature, fix, refactor, test, breaking change)
- Affected modules
- Any migration notes (if needed)

Entries must be concise and factual. Missing dates are not acceptable.

## 7.2 Update `todo.md`

- Locate the related task.
- Mark it as completed with a **date** and any relevant comment.
- If partially completed, update its status clearly with current date.

---

# 8. Branching & Repository Governance (Mandatory)

## 8.1 Branch Strategy Enforcement

All development MUST follow this branch flow:

```
develop → feature/<feature-name>  (agent creates branch)
    ↓
  agent commits & pushes feature branch
    ↓
  agent signals "ready for testing"
    ↓
  human tests manually
    ↓
  human creates PR feature/* → develop and merges
    ↓
  next feature starts from updated develop
```

Rules:

- All feature branches MUST be created from `develop`.
- Work MUST be performed in a `feature/*` branch.
- Merges into `develop` are **always done by the human** via pull request.
- Direct commits to `develop` or `main` are strictly forbidden.
- If the current branch is `main` or `develop`, development MUST STOP immediately.
- `main` must always remain stable and production-ready.
- A feature is NOT done until the human confirms it passes testing.

---

## 8.2 Agent Restrictions

The agent:

- MAY create `feature/*` branches.
- MAY commit and push within `feature/*` branches.

The agent MUST NOT:

- Push directly to `develop`
- Push directly to `main`
- Merge any branch into `develop` or `main`
- Create pull requests autonomously
- Create git tags
- Create releases
- Modify version numbers
- Modify version fields in any project file
- Perform semantic version bumps
- Rewrite git history
- Force push
- Delete branches

All merges into `develop` and all merges from `develop` into `main` are performed exclusively by the human via pull request. The agent signals readiness; the human validates, approves, and merges.

---

## 8.3 Versioning Policy

- `main` represents the latest stable production-ready state.
- Semantic versioning is applied manually.
- Version increments are decided by a human.
- Git tags are created manually.
- Releases are published manually.

No automated versioning is allowed.

---

# 9. Release Process (Human-Triggered)

A release is ONLY initiated when the human explicitly authorises it (e.g. "prepare the X.X.X release" or "let's ship the release").

## 9.1 Release Flow

```
human validates develop
    ↓
human says "prepare release vX.X.X"
    ↓
agent creates branch: release/vX.X.X from develop
    ↓
agent bumps version in: client/package.json, client/src-tauri/Cargo.toml,
                        client/src-tauri/tauri.conf.json, server/Cargo.toml
    ↓
agent runs full build:  cargo build --release (server)
                        copy voice-server.exe → client/src-tauri/resources/
                        npm run tauri build   (client + installer)
    ↓
agent creates releases/vX.X.X/ folder with:
    - README.md (release notes)
    - installer files (.msi, -setup.exe, standalone server .exe)
    ↓
agent updates docs/changelog.md, docs/todo.md, releases/README.md
    ↓
agent signals "release branch ready"
    ↓
human validates manually
    ↓
human merges release/vX.X.X → develop
    ↓
human PRs develop → main
    ↓
human tags + publishes
```

## 9.2 Release Agent Rules

The agent:

- MAY create `release/*` branches.
- MAY build and compile all artifacts.
- MAY create the `releases/vX.X.X/` folder and release notes.
- MAY bump version numbers **only when explicitly authorised by the human**.

The agent MUST NOT:

- Initiate a release without explicit human instruction.
- Push `release/*` to `main`.
- Create git tags or GitHub releases.
- Skip the build validation step.

> **The release-manager skill** (`.claude/skills/release-manager/SKILL.md`) contains the detailed step-by-step instructions for executing a release.

---

# 10. Final Verification Loop

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

# 11. Completion Criteria

A task is considered DONE only if:

- No open doubts remain
- Scope is minimal and justified
- No architectural drift introduced
- No unnecessary dependencies added
- All previous tests pass
- New tests are added and pass
- Client build succeeds
- Server build succeeds
- `Changelog.md` updated with date and description
- `todo.md` updated with date and completion status
- Feature branch pushed and agent has signalled "ready for testing"
- Human has validated the feature manually and confirmed OK
- Human has merged the feature branch into `develop` via PR
- No direct modification of `develop` or `main` by the agent
- No version/tag/release was created by the agent

If any condition is not satisfied → the task is NOT complete.

---

# Core Rule

Never mark a task as finished without:

Tests + Clean Build + Documentation + Human Testing Confirmation + Architectural Integrity + Proper Branch Flow + Human-Controlled Merge

---
