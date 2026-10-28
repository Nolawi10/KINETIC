#!/usr/bin/env python3
"""
KINETIC Full Stack Launcher

Runs backend/app.py using the backend virtualenv's Python. app.py owns the
whole startup sequence:

  * starts the Vite frontend dev server  (http://localhost:8080)
  * serves the Flask API                 (http://localhost:5000)
  * waits until both respond, warms the first page, then opens your browser
  * stops the frontend dev server when you press CTRL+C

Usage:
    python start.py

Equivalent to:
    cd backend && python app.py
"""
import os
import subprocess
import sys

def find_backend_python(backend_dir: str) -> str:
    """Prefer the backend virtualenv interpreter, fall back to the current one."""
    candidates = [
        os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe'),  # Windows
        os.path.join(backend_dir, 'venv', 'bin', 'python'),          # Linux/macOS
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    print("Backend virtualenv not found — using the current Python interpreter.")
    print("To create it: cd backend && python -m venv venv && "
          "venv\\Scripts\\pip install -r requirements.txt")
    return sys.executable

def main():
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
    python = find_backend_python(backend_dir)

    # -u keeps the startup log (and 'Opening browser at ...') unbuffered
    raise SystemExit(subprocess.call([python, '-u', 'app.py'], cwd=backend_dir))

if __name__ == '__main__':
    main()
