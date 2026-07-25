# Bioinformatics: The Missing Semester — Platform Spec

> **Status:** Finalized — ready to build  
> **Source curriculum:** [github.com/aneesav/themissingsemester](https://github.com/aneesav/themissingsemester)

---

## 1. Problem Statement

Running the Missing Semester notebooks today requires a bioinformatics expert:

- Install Python 3.10+, pip, a C compiler, and ~80 scientific packages
- Diagnose build failures (`igraph`, `leidenalg`, `numba` are notoriously fiddly)
- Find and place data files in the right paths before any notebook runs

The target audience — students with no programming exposure and wet lab / bench scientists exploring computational analysis for the first time — has no path through that setup. This platform removes it entirely: learners log in, pick a lesson, and are running real Python in under 30 seconds, with no installation, no configuration, and no prior coding knowledge required.

---

## 2. Curriculum Map

```
Module 1 — Data Types
  Lesson 1  scRNA Transcriptomics         (module1/lesson1_rna.ipynb)
  Lesson 2  Spatial Transcriptomics       (module1/lesson2_spatial.ipynb)
  Lesson 3  Proteomics                    (module1/lesson3_proteomics.ipynb)

Module 2 — Multi-omics
  Lesson 1  Multimodal Data Integration   (module2/…)

Module 3 — Reproducibility & Scale
  Lesson 1  Docker Containerization       (module3/…)
  Lesson 2  Nextflow Workflows            (module3/…)

Module 4 — AI in Multi-omics
  Lesson 1  Foundation Models             (module4/…)
  ⚠️  Requires learner-supplied API keys: OpenAI, Pinecone (setup guide shown in-app)
```

Each lesson is a Jupyter notebook with narrative Markdown cells and executable Python cells, plus bundled sample datasets.

---

## 3. Architecture

### 3.1 Overview

```
Browser (React web app)
    │
    ▼
Platform API (Express / Node)    ←── Auth: Google OAuth via Clerk
    │
    ├── Session Manager           ←── starts/stops per-user notebook containers
    │       │
    │       ▼
    │   AWS ECS / Fargate         ←── per-user ephemeral task
    │       │
    │       ▼
    │   Pre-built Docker image    ←── all 80+ Python deps baked in at image-build time
    │       + sample data fetch         no pip install at runtime
    │
    └── Postgres (Drizzle ORM)    ←── users, progress, session metadata
```

### 3.2 Container Strategy

Every learner gets their own ephemeral AWS Fargate task running the pre-built Docker image. The key invariant: **all dependencies are installed at image build time** — the container starts with a fully working environment already in place.

**Session lifecycle:**

| Event | Action |
|---|---|
| Learner opens a lesson | ECS task starts (or wakes from paused) — ~10–20s cold start |
| JupyterLab ready | Platform API returns the container URL; frontend embeds it |
| No activity for 30 min | Task paused; kernel state saved to S3 |
| No activity for 24 hrs | Task stopped; notebook file saved to S3 |
| Learner returns | Task restarts; state restored from S3 |

### 3.3 Pre-built Docker Image

Built once, pushed to Amazon ECR, used for every session.

```dockerfile
FROM python:3.11-slim

# System-level build dependencies (required for igraph, leidenalg, pyproj, etc.)
RUN apt-get update && apt-get install -y \
    build-essential python3-dev libproj-dev libgeos-dev \
    libhdf5-dev libssl-dev libffi-dev git curl && \
    rm -rf /var/lib/apt/lists/*

# Install all Python dependencies (the heavy step — runs once at image build)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Jupyter stack
RUN pip install --no-cache-dir \
    jupyterlab>=4.0 ipywidgets ipyleaflet

# Copy notebooks (read-only reference; each user gets a writable copy in their home dir)
COPY notebooks/ /opt/notebooks/

# Bootstrap script: copies notebooks to user workspace, fetches data files from S3
COPY bootstrap.sh /opt/bootstrap.sh
RUN chmod +x /opt/bootstrap.sh

EXPOSE 8888
CMD ["/opt/bootstrap.sh"]
```

**bootstrap.sh** (runs at container start):
1. Copies the relevant lesson notebooks to `/home/user/workspace/`
2. Downloads required sample datasets from S3 into `/home/user/workspace/data/`
3. Signals the Platform API: `"ready"` (API then shows the learner the notebook)
4. Starts JupyterLab on port 8888 with a platform-provided single-use token

---

## 4. Data & Storage

### Sample Datasets

The notebooks reference datasets that are too large to bundle in the Docker image:

- `module1/data/` — scRNA `.h5ad` files, spatial images, proteomics CSVs (estimate: 200MB–2GB total)
- Stored in **Amazon S3**, fetched by `bootstrap.sh` at container start for the specific lesson

### User Data

Stored in **Postgres**:

```
users          id, email, name, google_sub, role (learner | admin), created_at
lessons        id, module_num, lesson_num, title, notebook_path, description
progress       user_id, lesson_id, cells_run, total_cells, last_active, completed_at
sessions       id, user_id, lesson_id, ecs_task_arn, status, container_url, created_at, ended_at
api_keys       user_id, service (openai | pinecone | …), encrypted_key_ref, created_at
```

User-saved notebook state (the actual `.ipynb` files with cell outputs) → **S3**, keyed by `user_id/lesson_id/notebook.ipynb`.

---

## 5. Application Pages & UX

### 5.1 Auth — Google Login

- Login page: Google OAuth button (via Clerk)
- On first login: brief welcome screen ("Welcome to The Missing Semester — here's what you'll learn")
- No manual signup form; Google is the only auth method

### 5.2 Course Dashboard (learner home)

After login, learners land here. Shows:

- Module cards in order (Module 1 → 4)
- Each module card: title, 1-line description, per-lesson progress pills
- "Continue" button for the last active lesson
- Lock icon on Module 4 lessons with a tooltip: "You'll need API keys for this lesson — set them up in Settings"

### 5.3 Lesson Entry

1. Learner clicks a lesson → lesson detail page (title, what you'll learn, prerequisites)
2. "Launch Notebook" button → platform starts the container
3. Loading state: animated progress bar with friendly copy ("Setting up your environment — this takes about 15 seconds")
4. Once `bootstrap.sh` signals ready → JupyterLab embedded in the page (or opens in a new tab — user preference)
5. Top bar above the iframe: lesson title, module breadcrumb, "Back to Dashboard" link, "Save & Exit" button

### 5.4 Settings Page (learner)

- Google account info (display only)
- **API Keys section**: one row per required service (OpenAI, Pinecone, etc.)
  - Each row: service name, a `?` link to a "How to get this key" guide (inline expandable), masked input field, Save/Remove buttons
  - Keys are stored encrypted and injected as environment variables into the learner's container at session start

### 5.5 Admin Dashboard

Accessible only to accounts with `role = admin`. Shows:

- **Overview:** total learners, sessions started today/this week, lessons completed
- **Learner table:** searchable/filterable list of all users — name, email, last active, lessons completed
- **Lesson funnel:** for each lesson, how many learners started vs. completed (bar chart)
- **Session log:** recent container sessions — user, lesson, duration, status (running / stopped / error)
- **Manual controls:** ability to stop a runaway session or reset a user's progress

---

## 6. Module 4 — API Key Flow

Module 4 requires OpenAI (for LLM calls) and Pinecone (for vector storage). Learners supply their own keys.

**In-app guidance for each service:**

> **OpenAI API Key**
> 1. Go to [platform.openai.com](https://platform.openai.com) and sign in (or create a free account)
> 2. Click your profile icon → "API keys" → "Create new secret key"
> 3. Copy the key (starts with `sk-…`) and paste it here
> ⚠️ Running Module 4 notebooks uses OpenAI credits. Typical cost for the full lesson: ~$0.05–$0.50 depending on usage.

Keys are stored as encrypted references (not plaintext) in the DB. At session start, the Platform API injects them as environment variables into the Fargate task definition so notebooks can read them via `os.environ["OPENAI_API_KEY"]`.

---

## 7. Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (TypeScript) |
| Platform API | Express (Node, TypeScript) |
| Auth | Clerk — Google OAuth only |
| Container runtime | AWS ECS / Fargate |
| Container registry | Amazon ECR |
| Pre-built image | Custom Dockerfile (Python 3.11 + all deps) |
| Dataset storage | Amazon S3 |
| Database | PostgreSQL + Drizzle ORM |
| Notebook server | JupyterLab 4 (inside container) |
| Encryption | AWS KMS for API key encryption |

---

## 8. Build Phases

### Phase 1 — Foundation (backend + auth + dashboard shell)
- Clerk Google OAuth integration
- Postgres schema: users, lessons, progress, sessions
- Lesson data seeded from curriculum map
- Course dashboard (static — no container yet; lessons show as "Coming soon")
- Admin dashboard skeleton

### Phase 2 — Container Infrastructure
- Dockerfile + `bootstrap.sh` + ECR image pipeline
- Platform API routes: `POST /sessions` (start), `GET /sessions/:id` (status), `DELETE /sessions/:id` (stop)
- AWS ECS / Fargate integration in the API
- S3 setup for datasets and notebook state
- Lesson entry flow with loading state + iframe embed

### Phase 3 — Learning Experience
- Cell-level progress tracking (Jupyter kernel message monitoring)
- Resume exactly where you left off
- Session auto-pause / auto-stop
- Full admin dashboard with charts and session log

### Phase 4 — Module 4 + Polish
- API key management UI and encrypted storage
- Per-service setup guides
- Completion certificates
- Mobile-responsive layout

---

## 9. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Docker image build fails (C compiler deps, version conflicts) | Build and smoke-test image in CI before any user-facing work |
| Cold-start time exceeds user patience | Show a friendly loading experience; pre-warm containers during off-peak hours |
| Large dataset downloads slow notebook start | Stream datasets from S3 with `wget -q`; show per-file progress in bootstrap |
| Fargate cost at scale | Auto-stop idle containers aggressively (30 min timeout); spot instances for dev |
| JupyterLab iframe blocked by browser | Serve containers on a subdomain of the app domain to avoid cross-origin restrictions |
| Module 4 API key leakage | Never log env vars; rotate encryption keys; keys never returned to frontend |

---

*Spec finalized. Ready to build on your go-ahead.*
