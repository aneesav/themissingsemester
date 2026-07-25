FROM python:3.11-slim

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

# Install all Python dependencies (heavy step — runs once at image build, cached in ECR)
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# Install Jupyter stack
RUN pip install --no-cache-dir \
    jupyterlab>=4.0.0 \
    ipywidgets>=8.0 \
    ipyleaflet>=0.17.0 \
    nbformat \
    nbconvert

# Create non-root user for security
RUN useradd -m -s /bin/bash learner
WORKDIR /home/learner

# Copy reference notebooks (read-only; bootstrap copies them to workspace)
COPY notebooks/ /opt/notebooks/

# Copy and set up bootstrap script
COPY docker/bootstrap.sh /opt/bootstrap.sh
RUN chmod +x /opt/bootstrap.sh

EXPOSE 8888

USER learner
CMD ["/opt/bootstrap.sh"]
