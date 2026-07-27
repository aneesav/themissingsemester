---
name: Session Launch Flow
description: How JupyterLab container sessions are started, tracked, and surfaced to the frontend
---

# Session Launch Flow

## Overview

1. Frontend calls `POST /api/sessions` with `{ lessonId }`
2. API creates a DB session record with `status: "starting"`
3. API calls `launchJupyterTask()` → `RunTaskCommand` on ECS Fargate
4. ECS task ARN stored; `containerUrl` temporarily set to `__token__<hex>` (sentinel)
5. Bootstrap script inside container calls `PATCH /api/sessions/:id/ready` when JupyterLab is up
6. API resolves public IP from ENI via `DescribeNetworkInterfaces`, builds `containerUrl = http://<ip>:8888/lab?token=<hex>`
7. Session flips to `status: "running"`
8. Frontend polls `GET /api/sessions/:id` every 3s; renders "Open Notebook" link when running

## Key patterns

**Token sentinel:** `containerUrl` stores `__token__<hex>` while IP is pending. Code checks `startsWith("__token__")` to extract the token before IP is known.

**IP resolution:** ECS task → ENI attachment → `networkInterfaceId` → EC2 `DescribeNetworkInterfaces` → `Association.PublicIp`. Takes ~10-30s after task reaches RUNNING.

**Fallback polling:** `GET /api/sessions/:id` also attempts IP resolution if status is still "starting" and ecsTaskArn exists — so even if bootstrap.sh signal is missed, the frontend poll will eventually flip the session.

**API key injection:** Learner API keys are decrypted from DB and passed as ECS container environment overrides at task launch time (`OPENAI_API_KEY`, `PINECONE_API_KEY`).

## Why

The ready-signal pattern decouples the slow bootstrap (pip install nothing, but data download + JupyterLab startup) from the API response. The frontend gets an immediate `201 starting` response and polls for readiness rather than blocking the HTTP request.

## Session lifecycle hardening (2026-07-25)

- **Idle reaper**: `sessions.last_seen_at` heartbeat column; GET session endpoints touch it while status is starting/running. Server sweeps every 60s and stops ECS tasks unseen for 10 min. Reaper uses a conditional UPDATE (status + staleness re-checked) before `stopTask` so a late heartbeat wins the race. Frontend polls the session every 60s while running with `refetchIntervalInBackground: true`.
- **`/sessions/:id/ready` hardening**: unauthenticated by necessity (called by container), but now returns 204 with no body (never leak token-bearing containerUrl), only transitions from `starting`, and enforces `Authorization: Bearer <jupyter token>` *when the header is present*. bootstrap.sh now sends that header — but the deployed image predates it, so the server tolerates missing headers until the Docker image is rebuilt. **To close fully: push `docker/bootstrap.sh` to GitHub (needs a PAT — all deleted) so CI rebuilds, then make the header mandatory.**

## Sandbox notebooks & single-active constraint (2026-07-27)

- `sessions.lesson_id` is now nullable: null = "fresh notebook" sandbox not tied to any lesson. `LESSON_ID` env is omitted at ECS launch; bootstrap.sh already skips all lesson steps when it's empty, so no image rebuild was needed.
- Server enforces at most one active (starting/running/paused) session per user: `POST /sessions` resumes when the target matches, otherwise 409. Backed by a partial unique index `one_active_session_per_user`.
- `GET /sessions/active` now counts `starting` as active so the UI can gate launches during provisioning.
- API types are orval-generated from `lib/api-spec/openapi.yaml` — edit the spec and run `pnpm --filter @workspace/api-spec run codegen`, never hand-edit `lib/api-zod` / `lib/api-client-react` generated files.
