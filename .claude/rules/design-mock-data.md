---
name: design-mock-data-only
description: Design work must not touch server or microservices code and must use mock data only
---

# Design work: mock data only, no backend edits

Whenever a request is about design — UI/UX work, screens, mockups, layouts, mobile
or web frontend visuals, or anything using the `design` skill — Claude must:

- **Never edit, create, or delete files** under server or microservices
  directories (e.g. any backend/API/service folders such as `server/`,
  `microservices/`, or equivalent backend service directories in this repo).
- **Never wire design work to real endpoints, databases, or microservices.**
  All data shown in a design must come from mock/sample data defined locally in
  the design work itself (hardcoded fixtures, local mock JSON, or in-memory sample
  objects) — not live API calls, service clients, or DB queries.
- Apply this to **every** design instruction submitted, not just the first one —
  this is a standing rule, not a one-time scope limit.

## Why

The user wants design/frontend iteration to stay fully decoupled from backend and
microservices state so design changes can't break, depend on, or accidentally
modify server-side systems.

## How to apply

- If a design task would naturally require a real API response, stub it with mock
  data instead and note that it's mocked.
- If asked to "hook up" a design to the backend, flag that this conflicts with the
  standing rule and confirm with the user before touching any server/microservices
  code.
- This restriction is about design tasks specifically — it does not limit
  non-design backend/microservices work requested directly.
