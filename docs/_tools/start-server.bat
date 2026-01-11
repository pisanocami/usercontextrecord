@echo off
echo Starting server for screenshot capture...

REM Set environment variables
set DATABASE_URL=postgresql://usercontextrecord:c6c17892@c6c17892.db.elephantsql.com:5432/usercontextrecord
set NODE_ENV=development
set PORT=5000

REM Start the server
echo Environment variables set:
echo DATABASE_URL=%DATABASE_URL%
echo NODE_ENV=%NODE_ENV%
echo PORT=%PORT%
echo.
echo Starting server...
npx tsx server/index.ts

pause
