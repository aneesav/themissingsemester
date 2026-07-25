# The Missing Semester

A bioinformatics learning platform for non-coders and bench scientists. Learners log in with Google, pick a lesson, and get a fully pre-configured JupyterLab environment in their browser — no installation, no dependency management, no prior coding knowledge required.

## Run & Operate

- `pnpm --filter @workspace/missing-semester run dev` — run the React frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + Wouter + TanStack Query
- Auth: Clerk (Google OAuth only) — Replit-managed tenant
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (5 tables: users, lessons, progress, sessions, api_keys)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Containers: AWS ECS Fargate (per-user ephemeral JupyterLab sessions)
- Image registry: Amazon ECR
- Data/state storage: Amazon S3
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, lessons, progress, sessions, apiKeys)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/aws.ts` — ECS launch/stop/IP-resolution helpers
- `artifacts/api-server/src/middlewares/` — requireAuth, requireAdmin, clerkProxyMiddleware
- `artifacts/missing-semester/src/` — React frontend (pages: home, dashboard, lesson, settings, admin)
- `docker/` — Dockerfile, bootstrap.sh, requirements.txt for the JupyterLab container image

## AWS Infrastructure (us-east-1, account 748999352678)

| Resource | Value |
|---|---|
| ECR repository | `748999352678.dkr.ecr.us-east-1.amazonaws.com/missing-semester/jupyter` |
| S3 bucket | `missing-semester-data-748999352678` |
| ECS cluster | `missing-semester-cluster` |
| ECS task definition | `missing-semester-jupyter:1` |
| Security group | `sg-0518b7660ddf00c39` |
| Execution role | `arn:aws:iam::748999352678:role/missing-semester-ecs-execution-role` |
| Task role | `arn:aws:iam::748999352678:role/missing-semester-ecs-task-role` |
| CloudWatch log group | `/missing-semester/jupyter` |

## Env vars required

- `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)
- `SESSION_SECRET` — used to encrypt learner API keys at rest
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — auto-provisioned by Clerk
- `AWS_ACCESS_ID`, `AWS_SECRET_KEY` — IAM user `missing-semester-platform` credentials
- `AWS_REGION` — `us-east-1`
- `ECR_REPOSITORY_URI`, `S3_BUCKET`, `ECS_CLUSTER`, `ECS_TASK_DEFINITION`, `ECS_SECURITY_GROUP`, `ECS_SUBNETS` — set from AWS infra above

## Architecture decisions

- **Per-user Fargate tasks**: each learner session gets its own ephemeral container. Isolation is absolute — no shared kernel state between learners.
- **All deps baked into Docker image**: the heavy pip install (80+ bioinformatics packages) runs once at image build time, not at session start. Container cold-start is ~10–20s, not 10 min.
- **Token-based JupyterLab access**: a random 64-hex token is generated per session, injected into the container, and stored in the platform DB. The frontend uses the token URL to embed the notebook directly.
- **bootstrap.sh ready signal**: the container calls `PATCH /api/sessions/:id/ready` once JupyterLab is up, which triggers IP resolution and flips the session to `running`. The frontend polls `GET /api/sessions/:id` until status changes.
- **Learner API keys encrypted at rest**: AES-256-CBC with key derived from `SESSION_SECRET`. Phase 2 upgrade: replace with AWS KMS.
- **Google OAuth only**: no email/password signup — reduces friction and abuse surface for a research audience.

## Curriculum (7 lessons seeded)

| Module | Lesson | Notebook |
|---|---|---|
| 1 — Data Types | scRNA Transcriptomics | module1/lesson1_rna.ipynb |
| 1 — Data Types | Spatial Transcriptomics | module1/lesson2_spatial.ipynb |
| 1 — Data Types | Proteomics | module1/lesson3_proteomics.ipynb |
| 2 — Multi-omics | Multimodal Data Integration | module2/lesson1_multiomics.ipynb |
| 3 — Reproducibility | Docker Containerization | module3/lesson1_docker.ipynb |
| 3 — Reproducibility | Nextflow Workflows | module3/lesson2_nextflow.ipynb |
| 4 — AI | Foundation Models | module4/lesson1_ai.ipynb |

## Phase status

- [x] Phase 1: Frontend + auth + DB schema + API routes
- [x] Phase 2a: AWS infrastructure (ECR, S3, ECS, IAM, networking)
- [ ] Phase 2b: Build and push Docker image to ECR
- [ ] Phase 3: Cell-level progress tracking, auto-pause/resume
- [ ] Phase 4: Module 4 API key flow, completion certificates

## Gotchas

- The IAM user `missing-semester-platform` lacks `iam:GetRole` and `logs:PutRetentionPolicy` — not needed at runtime, only noticed during setup.
- ECS task definition must be updated whenever the Docker image is rebuilt (update the image tag or use `:latest` consistently).
- JupyterLab iframe embedding requires `--ServerApp.disable_check_xsrf=True` in bootstrap.sh — already set.
- The `__token__` prefix in `containerUrl` is a temporary sentinel while the container IP is being resolved. It's replaced with the real URL when `PATCH /sessions/:id/ready` fires.

## User preferences

- Platform is for non-coders and bench scientists — keep all user-facing language non-technical.
- Google OAuth is the only auth method (no email/password).
- AWS region: us-east-1.
- IAM user for platform operations: `missing-semester-platform` (account 748999352678).
