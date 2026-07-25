---
name: AWS Infrastructure
description: Provisioned AWS resources for The Missing Semester (us-east-1), IAM permission boundaries, and verified container launch timings.
---

# AWS Infrastructure (us-east-1, account 748999352678)

## Resources

| Resource | Value |
|---|---|
| ECR repo | `748999352678.dkr.ecr.us-east-1.amazonaws.com/missing-semester/jupyter` |
| S3 bucket | `missing-semester-data-748999352678` (versioning on, public blocked) |
| ECS cluster | `missing-semester-cluster` (Fargate) |
| Task definition | `missing-semester-jupyter` (2 vCPU, 8GB; rev 2 active, CI-built image) |
| Security group | `sg-0518b7660ddf00c39` (port 8888), default VPC `vpc-0ed44c60cc7e98a1b` |
| IAM user | `missing-semester-platform` (used by agent via AWS_ACCESS_ID/AWS_SECRET_KEY secrets) |

AWS CLI is installed at `/home/runner/.local/bin/aws`. Export `AWS_ACCESS_KEY_ID=$AWS_ACCESS_ID`, `AWS_SECRET_ACCESS_KEY=$AWS_SECRET_KEY`.

## Env vars (stored as Replit secrets/env)

- `AWS_ACCESS_ID`, `AWS_SECRET_KEY` — secrets
- `AWS_REGION` — `us-east-1`
- `ECR_REPOSITORY_URI`, `S3_BUCKET`, `ECS_CLUSTER`, `ECS_TASK_DEFINITION`, `ECS_SECURITY_GROUP` — see table
- `ECS_SUBNETS` — `subnet-0fa5e1d4983010a1b,subnet-034f8943b54a69b7b,subnet-036a442cb97ea191e`

## IAM permission boundary (important)

The platform IAM user has **no IAM write/read perms** (`iam:CreateRole`, `UpdateAssumeRolePolicy`, `GetRole` all denied). The owner created the roles in the console (2026-07-25):

- `missing-semester-ecs-execution-role` — AmazonECSTaskExecutionRolePolicy, trusts ecs-tasks.amazonaws.com
- `missing-semester-ecs-task-role` — inline S3 policy scoped to the data bucket
- Inline `pass-ecs-roles` policy on the IAM user grants `iam:PassRole`/`GetRole` for both roles

**Why:** an earlier session wrongly recorded the roles as agent-created; role creation always fails from here. Any new role work must go through the owner in the AWS console.

## CI pipeline (verified green 2026-07-25)

GitHub Actions at `.github/workflows/build-docker.yml` builds `docker/` on push, pushes image to ECR (tags: commit SHA + `latest`), and registers a new task-def revision. Workflow-file-only commits don't trigger it (`docker/**` path filter) — use `workflow_dispatch`.

## Smoke test verified (2026-07-25)

Fargate task from rev 2 reaches RUNNING in ~60s; JupyterLab answers HTTP 200 on port 8888 ~10–20s later (total ~80s from launch).
