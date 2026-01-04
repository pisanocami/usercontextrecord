@echo off
echo Starting Growth Signal Application...

:: Check if .env exists, if not create from template
if not exist .env (
    echo Creating .env file...
    echo DATABASE_URL=postgresql://user:password@localhost:5432/dbname > .env
    echo PORT=5000 >> .env
    echo NODE_ENV=development >> .env
)

:: Run the application using tsx
echo Running npm run dev...
npm run dev
pause
