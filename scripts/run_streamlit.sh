#!/bin/bash
# ============================================
# Brand Intelligence Platform - Streamlit Runner
# UCR FIRST Architecture
# ============================================

echo ""
echo "========================================"
echo " Brand Intelligence Platform"
echo " UCR FIRST Streamlit Microservice"
echo "========================================"
echo ""

# Set working directory
cd "$(dirname "$0")/.."

# Load environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Please install Python 3.11+"
    exit 1
fi

# Create virtual environment if needed
if [ ! -d "streamlit_app/venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv streamlit_app/venv
fi

# Activate venv
source streamlit_app/venv/bin/activate

# Install requirements
echo "Installing dependencies..."
pip install -q -r streamlit_app/requirements.txt

# Install shared library
echo "Installing brand_intel shared library..."
pip install -q -e brand_intel

# Run Streamlit
echo ""
echo "Starting Streamlit server..."
echo "UCR FIRST: All operations require valid UCR"
echo ""
streamlit run streamlit_app/app.py --server.port 8501 --server.address localhost
