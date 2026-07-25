# python image
FROM python:3.13-bullseye

# install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    apt-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# set working directory
WORKDIR /app

# copy relevant files into container
COPY qc-metrics.py /app/qc-metrics.py
COPY module3_reqs.txt /app/module3_reqs.txt

# pull dependencies from reqs txt file
RUN pip install uv && uv pip install --system -r module3_reqs.txt

# define container behavior
# always run qc-metrics.py on container startup
ENTRYPOINT ["python", "/app/qc-metrics.py"]
