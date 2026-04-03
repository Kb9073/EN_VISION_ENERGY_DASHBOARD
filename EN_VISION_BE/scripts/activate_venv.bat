@echo off
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."

if not exist ".venv\Scripts\activate.bat" (
  echo Virtual environment not found at EN_VISION_BE\.venv
  echo Create it first with: python -m venv .venv
  popd
  exit /b 1
)

call ".venv\Scripts\activate.bat"
echo Backend virtual environment activated: %CD%\.venv
