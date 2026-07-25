#!/bin/bash
set -e

WORKSPACE_DIR="/home/learner/workspace"
DATA_DIR="$WORKSPACE_DIR/data"
LESSON_ID="${LESSON_ID:-}"
S3_BUCKET="${S3_BUCKET:-}"
PLATFORM_API_URL="${PLATFORM_API_URL:-}"
SESSION_ID="${SESSION_ID:-}"
JUPYTER_TOKEN="${JUPYTER_TOKEN:-}"

echo "[bootstrap] Starting for lesson_id=$LESSON_ID session_id=$SESSION_ID"

# Set up workspace directory
mkdir -p "$WORKSPACE_DIR" "$DATA_DIR"

# Copy lesson notebook to workspace (writable copy for the learner)
if [ -n "$LESSON_ID" ]; then
  NOTEBOOK=$(find /opt/notebooks -name "*.ipynb" | grep -E "lesson${LESSON_ID}_|lesson${LESSON_ID}[^0-9]" | head -1)
  if [ -z "$NOTEBOOK" ]; then
    # Fall back to any notebook matching the lesson directory
    NOTEBOOK=$(find /opt/notebooks -name "*.ipynb" | sed -n "${LESSON_ID}p")
  fi
  if [ -n "$NOTEBOOK" ]; then
    cp "$NOTEBOOK" "$WORKSPACE_DIR/"
    echo "[bootstrap] Copied notebook: $NOTEBOOK"
  else
    echo "[bootstrap] Warning: no notebook found for lesson $LESSON_ID"
    # Copy all notebooks as fallback
    cp /opt/notebooks/**/*.ipynb "$WORKSPACE_DIR/" 2>/dev/null || true
  fi
fi

# Restore saved notebook state from S3 (if a previous session existed)
if [ -n "$S3_BUCKET" ] && [ -n "$SESSION_ID" ]; then
  echo "[bootstrap] Checking S3 for saved notebook state..."
  aws s3 sync "s3://${S3_BUCKET}/sessions/${SESSION_ID}/" "$WORKSPACE_DIR/" \
    --no-progress 2>/dev/null || echo "[bootstrap] No saved state found (new session)"
fi

# Download lesson data files from S3
if [ -n "$S3_BUCKET" ] && [ -n "$LESSON_ID" ]; then
  echo "[bootstrap] Downloading data files for lesson $LESSON_ID..."
  aws s3 sync "s3://${S3_BUCKET}/data/lesson${LESSON_ID}/" "$DATA_DIR/" \
    --no-progress 2>/dev/null || echo "[bootstrap] No data files found for this lesson"
fi

# Inject learner API keys as environment variables (passed via ECS task env)
# OPENAI_API_KEY and PINECONE_API_KEY are set directly in the ECS task definition

# Signal the platform API that this container is ready
if [ -n "$PLATFORM_API_URL" ] && [ -n "$SESSION_ID" ]; then
  echo "[bootstrap] Signalling platform API: session ready"
  curl -s -X PATCH \
    "${PLATFORM_API_URL}/api/sessions/${SESSION_ID}/ready" \
    -H "Content-Type: application/json" \
    -d '{"status":"running"}' || echo "[bootstrap] Warning: could not signal platform API"
fi

echo "[bootstrap] Starting JupyterLab..."

# Start JupyterLab — no password, token-secured, accessible on port 8888
exec jupyter lab \
  --ip=0.0.0.0 \
  --port=8888 \
  --no-browser \
  --notebook-dir="$WORKSPACE_DIR" \
  --NotebookApp.token="${JUPYTER_TOKEN}" \
  --NotebookApp.password="" \
  --NotebookApp.allow_origin="*" \
  --NotebookApp.allow_remote_access=True \
  --ServerApp.disable_check_xsrf=True
