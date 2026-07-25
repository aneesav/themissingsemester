---
name: AWS Infrastructure
description: All AWS resources provisioned for the Missing Semester platform in us-east-1
---

# AWS Infrastructure

**Account:** 748999352678  
**Region:** us-east-1  
**IAM user:** `missing-semester-platform` (lacks iam:GetRole and logs:PutRetentionPolicy — not needed at runtime)

## Resources

| Resource | Value |
|---|---|
| ECR repo | `748999352678.dkr.ecr.us-east-1.amazonaws.com/missing-semester/jupyter` |
| S3 bucket | `missing-semester-data-748999352678` (versioning on, public access blocked) |
| ECS cluster | `missing-semester-cluster` |
| Task definition | `missing-semester-jupyter:1` (2 vCPU, 8GB RAM, Fargate) |
| Security group | `sg-0518b7660ddf00c39` (port 8888 open inbound) |
| Default VPC | `vpc-0ed44c60cc7e98a1b` |
| Subnets | `subnet-0fa5e1d4983010a1b`, `subnet-034f8943b54a69b7b`, `subnet-036a442cb97ea191e` (+ 3 more) |
| Execution role | `arn:aws:iam::748999352678:role/missing-semester-ecs-execution-role` |
| Task role | `arn:aws:iam::748999352678:role/missing-semester-ecs-task-role` (S3 read/write) |
| CloudWatch logs | `/missing-semester/jupyter` (14-day retention attempted, may not be set) |

## Env vars (stored as Replit secrets/env)

- `AWS_ACCESS_ID` — secret
- `AWS_SECRET_KEY` — secret
- `AWS_REGION` — `us-east-1`
- `ECR_REPOSITORY_URI` — see table
- `S3_BUCKET` — `missing-semester-data-748999352678`
- `ECS_CLUSTER` — `missing-semester-cluster`
- `ECS_TASK_DEFINITION` — `missing-semester-jupyter`
- `ECS_SECURITY_GROUP` — `sg-0518b7660ddf00c39`
- `ECS_SUBNETS` — first 3 subnets comma-separated

## What's NOT done yet

- Docker image has NOT been built or pushed to ECR. The task definition references `:latest` which doesn't exist yet.
- To build: `cd docker && docker build -t missing-semester/jupyter . && docker push <ECR_URI>:latest`
- Image build will take 20-40 min due to bioinformatics deps (scanpy, spatialdata, cellxgene-census, etc.)

**Why:** Docker image build requires a machine with Docker installed. Replit environment doesn't support Docker builds natively — user needs to build from their local machine or set up a CI pipeline (GitHub Actions recommended).
