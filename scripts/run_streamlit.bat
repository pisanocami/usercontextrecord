@echo off
REM ============================================
REM Brand Intelligence Platform - Streamlit Runner
REM UCR FIRST Architecture
REM ============================================

echo.
echo ========================================
echo  Brand Intelligence Platform
echo  UCR FIRST Streamlit Microservice
echo ========================================
echo.

REM Set working directory
cd /d "%~dp0\.."

REM Load environment variables from .env if exists
if exist .env (
    echo Loading environment variables from .env...
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        set "%%a=%%b"
    )
)

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.11+
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "streamlit_app\venv" (
    echo Creating virtual environment...
    python -m venv streamlit_app\venv
)

REM Activate venv
call streamlit_app\venv\Scripts\activate.bat

REM Install requirements
echo Installing dependencies...
pip install -q -r streamlit_app\requirements.txt

REM Install shared library
echo Installing brand_intel shared library...
pip install -q -e brand_intel

REM Run Streamlit
echo.
echo Starting Streamlit server...
echo UCR FIRST: All operations require valid UCR
echo.
streamlit run streamlit_app\app.py --server.port 8501 --server.address localhost

pause
