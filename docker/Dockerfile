FROM python:3.11-slim

ARG BUILD_DATE
ARG GIT_SHA
LABEL build.date="$BUILD_DATE" build.sha="$GIT_SHA"

# System-level build dependencies required by bioinformatics packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libproj-dev \
    libgeos-dev \
    libhdf5-dev \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libcurl4-openssl-dev \
    gfortran \
    git \
    curl \
    wget \
    awscli \
    && rm -rf /var/lib/apt/lists/*

# Install all Python dependencies
# This is the slow step (~20 min). Docker layer cache means it only reruns
# when requirements.txt changes.
COPY docker/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# Install Jupyter stack
RUN pip install --no-cache-dir \
    jupyterlab>=4.0.0 \
    ipywidgets>=8.0 \
    ipyleaflet>=0.17.0 \
    nbformat \
    nbconvert

# Pull notebooks from the source curriculum repo
# Cloning at build time means the image always ships with the latest notebooks.
# The specific commit can be pinned by replacing 'main' with a SHA for reproducibility.
RUN git clone --depth=1 --branch=main \
    https://github.com/aneesav/themissingsemester.git /tmp/curriculum && \
    mkdir -p /opt/notebooks && \
    cp -r /tmp/curriculum/* /opt/notebooks/ && \
    rm -rf /tmp/curriculum

# Create non-root user for security
RUN useradd -m -s /bin/bash learner
WORKDIR /home/learner

# Copy and set up bootstrap script
COPY docker/bootstrap.sh /opt/bootstrap.sh
RUN chmod +x /opt/bootstrap.sh

EXPOSE 8888

USER learner
CMD ["/opt/bootstrap.sh"]
