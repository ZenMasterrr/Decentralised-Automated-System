@echo off
echo ====================================
echo Starting DTeams Hybrid System
echo ====================================
echo.

echo Starting Frontend (Terminal 1)...
start cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak > nul

echo Starting Backend Hooks (Terminal 2)...
start cmd /k "cd hooks && npm run dev"
timeout /t 2 /nobreak > nul

echo Starting Keeper Service (Terminal 3)...
start cmd /k "cd keeper && npx ts-node src/keeper-v2.ts"

echo.
echo ====================================
echo All services starting!
echo ====================================
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:3002
echo Keeper:    Monitoring blockchain
echo.
echo Press any key to close this window...
pause > nul
