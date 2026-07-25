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
