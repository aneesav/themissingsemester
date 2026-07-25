# Bioinformatics: The Missing Semester — Development Platform Spec

> **Status:** Draft for review  
> **Source curriculum:** [github.com/aneesav/themissingsemester](https://github.com/aneesav/themissingsemester)

---

## 1. Problem Statement

Running the Missing Semester notebooks today requires a bioinformatics expert:

- Install Python 3.10+, pip, a C compiler, and ~80 scientific packages
- Diagnose build failures (`igraph`, `leidenalg`, `numba` are notoriously fiddly)
- Find and place data files in the right paths before any notebook runs

A student with no coding background has no chance of getting through setup before giving up. The goal of this platform is to make that entire setup invisible — the learner lands on a page, clicks a lesson, and is coding in under 30 seconds.

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
```

Each lesson is a Jupyter notebook with narrative cells (Markdown) and code cells (Python), plus bundled sample datasets.

---

## 3. Proposed Platform

### 3.1 High-level Architecture

```
Browser (React web app)
    │
    ▼
Platform API (Express / Node)    ←── Auth (Clerk or Replit Auth)
    │
    ├── Session Manager           ←── starts/stops per-user notebook servers
    │       │
    │       ▼
    │   Notebook Runner           ←── JupyterLab or nbconvert
    │       │                        running inside a pre-built container
    │       ▼
    │   Pre-installed Python env  ←── all 80+ dependencies already on disk
    │       + sample data files        so no pip install ever runs at runtime
    │
    └── Progress Store (Postgres) ←── which cells the user has run, notes, etc.
```

### 3.2 The Key Design Decision: Where Does Python Run?

This is the most important architectural choice in the project. Three options:

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A — Cloud containers (Docker)** | Every user gets their own short-lived Docker container with all deps pre-installed. The web app proxies Jupyter into an iframe. | Full Python environment, identical to the real thing | Requires a cloud host that supports containers (e.g. Fly.io, Railway, GCP Run). Cold-start ~10–20s. Cost scales with users. |
| **B — Shared long-running server** | One (or a few) JupyterHub servers pre-installed with all deps, multi-user with Jupyter's native token auth. | Simpler ops, faster launch | Users share resources; code isolation is weak |
| **C — Static notebook viewer + Binder** | Web app displays read-only lesson content; a "Run in Binder" button opens mybinder.org with the repo | Zero backend cost | mybinder.org can take 1–3 min to build; no user progress tracking; no custom UX |

**Recommendation: Option A** is the right long-term product. Option C is a valid MVP to validate the curriculum layout before investing in containers.

---

## 4. User Experience (Option A — full platform)

### 4.1 Course Dashboard

The landing screen after login. Shows:

- Module cards with progress indicators (e.g. "Lesson 2 of 3 complete")
- A "Continue" button that drops the user back into their last active session
- A "Start fresh" button that resets progress for a lesson
- Brief one-liner descriptions of what each lesson covers

### 4.2 Lesson Entry Flow

1. User clicks a lesson card
2. Platform checks whether a container session exists for this user + lesson
   - If not: start one (show a progress bar during the ~15s cold start)
   - If yes: resume immediately
3. JupyterLab opens embedded in an iframe or in a new tab, pointing at the user's container

### 4.3 Inside the Notebook

The notebook is stock JupyterLab — no changes to the notebook UX. However the platform wraps it with:

- A **top bar** showing: lesson title, progress breadcrumb, and a "Back to dashboard" link
- A **help sidebar** (collapsible) with:
  - Concept glossary for the current lesson
  - Links to the Substack post accompanying the lesson
  - "Something broken?" feedback form

### 4.4 Progress Tracking

When a user runs a cell, the platform records a checkpoint. This powers:

- "X of Y cells run" progress bars on the dashboard
- Resume-exactly-where-you-left-off on re-entry
- Instructor view: see aggregate completion stats across all learners

### 4.5 Session Lifecycle

| Event | Action |
|---|---|
| User opens lesson | Container starts (or resumes) |
| No activity for 30 min | Container paused (state preserved) |
| No activity for 24 hrs | Container stopped; state saved to object storage |
| User returns | Container restarts, state restored |

---

## 5. Technical Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + Vite | Fast, component-based, easy to style |
| Platform API | Express (Node) | Already in the monorepo |
| Auth | Clerk | Zero-config, handles email + Google login |
| Session management | Custom Express service | Talks to container runtime |
| Container runtime | Docker / Fly.io Machines | Per-user ephemeral containers |
| Pre-built image | Custom Dockerfile | All 80+ pip deps + Jupyter installed at build time |
| Data files | Object storage | Sample datasets served to containers on demand |
| Progress DB | Postgres (Drizzle) | Already in the monorepo |
| Notebook serving | JupyterLab (inside container) | Industry standard |

---

## 6. Pre-built Docker Image

The container image is the most critical infrastructure piece. Built once, used for every session.

**What goes in it:**

```dockerfile
FROM python:3.11-slim
# System deps: build-essential for igraph/leidenalg, libproj for pyproj, etc.
RUN apt-get install -y build-essential libproj-dev libgeos-dev ...

# Install all Python deps from requirements.txt
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install Jupyter
RUN pip install jupyterlab ipywidgets ipyleaflet

# Copy curriculum notebooks (read-only reference copy)
COPY notebooks/ /opt/notebooks/

# Entrypoint: start JupyterLab on a configurable port
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--no-browser", "--NotebookApp.token=''"]
```

Image build time: ~10–20 min (done once, cached). Container start time: ~5–15s.

---

## 7. Data Files

Several lessons require sample datasets (scRNA `.h5ad` files, spatial images, proteomics CSVs). These are large (hundreds of MB to GB range).

**Plan:**

- Host datasets in object storage (S3-compatible)
- Each container auto-downloads the datasets for its lesson on first launch using a bootstrap script
- After download, the bootstrap signals "ready" to the platform API, which then shows the user the notebook

---

## 8. Open Questions for Review

Before building, I'd like your input on a few decisions:

1. **Target audience scope** — Is this primarily for absolute beginners (no Python), or also for bioinformatics researchers who just want the environment pre-configured?

2. **Deployment target** — Where do you want the containers to run? Options: Fly.io (simple, usage-based pricing), AWS/GCP (more control, more ops), or Replit Deployments (simplest, but container-per-user isn't directly supported — would need an external host for the Python layer).

3. **MVP vs. full build** — Should I start with a static curriculum browser that uses Binder for execution (fast, no infrastructure), and then layer in the real container backend? Or build container infrastructure from the start?

4. **Progress tracking** — Do you need instructor/admin views (to see how many learners completed each lesson), or is this just a personal learning tool for now?

5. **Authentication** — Should learners be required to create an account, or can they try lessons anonymously with progress saved locally?

6. **Module 4 (AI)** — The requirements include OpenAI, Pinecone, and LangChain. Will learners need to supply their own API keys, or do you plan to proxy a shared API key?

---

## 9. Phased Build Plan

### Phase 1 — Curriculum Browser (1–2 days)
- React web app with the curriculum map (modules, lessons, descriptions)
- Each lesson links to a Binder-hosted notebook (no custom infrastructure)
- Auth + progress tracking stubbed out

### Phase 2 — Container Sandbox (1 week)
- Pre-built Docker image with all dependencies
- Platform API: session create/resume/stop
- Frontend: lesson entry flow with loading state, embedded JupyterLab
- Basic progress tracking (which lesson was last opened)

### Phase 3 — Full Learning Experience (1–2 weeks)
- Cell-level progress tracking
- Resume exactly where you left off
- Instructor dashboard
- Help sidebar with glossary + feedback

### Phase 4 — Scale & Polish
- Auto-pause/resume idle containers
- Module 4 AI proxying
- Certificate of completion
- Social: share your progress

---

*Review this spec and answer the open questions in Section 8 — then I'll start building.*
