FROM python:3.11-slim

ARG BUILD_DATE
ARG GIT_SHA
LABEL build.date="$BUILD_DATE" build.sha="$GIT_SHA"

# System-level build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libproj-dev \
    libgeos-dev \
    libgdal-dev \
    gdal-bin \
    libhdf5-dev \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libcurl4-openssl-dev \
    libnetcdf-dev \
    gfortran \
    git \
    curl \
    wget \
    awscli \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# ── Core scientific stack ────────────────────────────────────────────────────
COPY requirements-core.txt /tmp/requirements-core.txt
RUN pip install --no-cache-dir --prefer-binary -r /tmp/requirements-core.txt

# ── Bioinformatics ───────────────────────────────────────────────────────────
COPY requirements-bio.txt /tmp/requirements-bio.txt
RUN pip install --no-cache-dir --prefer-binary -r /tmp/requirements-bio.txt

# ── Spatial / geospatial ─────────────────────────────────────────────────────
COPY requirements-spatial.txt /tmp/requirements-spatial.txt
RUN pip install --no-cache-dir --prefer-binary -r /tmp/requirements-spatial.txt

# ── AI / LLM (Module 4) ──────────────────────────────────────────────────────
COPY requirements-ai.txt /tmp/requirements-ai.txt
RUN pip install --no-cache-dir --prefer-binary -r /tmp/requirements-ai.txt

# ── Jupyter ───────────────────────────────────────────────────────────────────
RUN pip install --no-cache-dir --prefer-binary \
    "jupyterlab>=4.0.0" \
    "ipywidgets>=8.0" \
    "ipyleaflet>=0.17.0" \
    nbformat \
    nbconvert

# Pull notebooks from the curriculum repo
RUN git clone --depth=1 --branch=main \
    https://github.com/aneesav/themissingsemester.git /tmp/curriculum && \
    mkdir -p /opt/notebooks && \
    cp -r /tmp/curriculum/* /opt/notebooks/ && \
    rm -rf /tmp/curriculum

# Non-root user
RUN useradd -m -s /bin/bash learner
WORKDIR /home/learner

COPY bootstrap.sh /opt/bootstrap.sh
RUN chmod +x /opt/bootstrap.sh

EXPOSE 8888
USER learner
CMD ["/opt/bootstrap.sh"]
