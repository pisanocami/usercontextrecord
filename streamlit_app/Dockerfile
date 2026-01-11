# ============================================
# Brand Intelligence Platform - Streamlit Microservice
# UCR FIRST Architecture
# Fortune 500 Grade Competitive Intelligence
# ============================================

FROM python:3.11-slim

# Labels
LABEL maintainer="Brand Intelligence Team"
LABEL description="UCR FIRST Streamlit Microservice"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy shared library first (for caching)
COPY brand_intel/ /app/brand_intel/

# Install shared library
RUN pip install --no-cache-dir -e /app/brand_intel/

# Copy Streamlit app
COPY streamlit_app/ /app/streamlit_app/

# Set working directory to streamlit app
WORKDIR /app/streamlit_app

# Install Streamlit dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose Streamlit port
EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:8501/_stcore/health || exit 1

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV STREAMLIT_SERVER_PORT=8501
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0

# Run Streamlit
ENTRYPOINT ["streamlit", "run", "app.py", \
    "--server.port=8501", \
    "--server.address=0.0.0.0", \
    "--server.headless=true"]
