---
name: git-actions-restriction
description: Git actions Claude must never perform in this repository
---

# Git action restrictions

Claude must **never** run the following git actions in this repository, under any
circumstance, unless the user explicitly types the exact command for Claude to run
in that specific message:

- `git push` (including `--force`)
- `git commit`
- `git stash` (push/pop/apply/drop)
- `git switch` / `git checkout` (branch switching)
- `git merge`
- `git rebase`
- `git reset`
- `git branch -d` / `-D` (branch deletion)
- `git tag` (creating/pushing tags)
- `git pull`

Read-only git commands remain allowed at any time: `git status`, `git diff`,
`git log`, `git show`, `git branch` (listing only), `git remote -v`.

## Why

The user manages branch state, staging, and remote sync manually and does not want
Claude changing repository state or history on its own initiative.

## How to apply

- Do not run any of the restricted commands proactively, as part of a plan, or as
  a "helpful" follow-up to a task (e.g. do not commit after finishing a feature).
- If a task seems to require one of these actions (e.g. "this is done, want me to
  commit it?"), ask the user first and wait for an explicit go-ahead in that
  message rather than assuming standing permission.
- This rule applies regardless of how safe or reversible the action seems.
