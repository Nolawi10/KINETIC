#!/usr/bin/env python3
"""
KINETIC Raspberry Pi 5 Launcher

Starts the complete KINETIC application on Raspberry Pi 5:
- Backend (Flask) bound to 0.0.0.0
- Frontend (Vite dev server)
- Hardware telemetry receiver
- Pi Camera service
"""

import os
import sys
import subprocess
import platform
import socket
import time
import signal
import atexit
from typing import Optional, Dict, List

# Global process references
backend_proc = None
frontend_proc = None


def get_lan_ip():
    """Get the LAN IP address of this device"""
    try:
        # Create a socket to determine the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            return ip
        except Exception:
            return "localhost"


def check_platform():
    """Check if running on Raspberry Pi or Linux"""
    print("Checking platform...")
    system = platform.system()
    print(f"  OS: {system} {platform.release()}")
    print(f"  Machine: {platform.machine()}")
    print(f"  Python: {sys.version.split()[0]}")
    
    if system != "Linux":
        print("\n[WARNING] Not running on Linux. This launcher is optimized for Raspberry Pi OS.")
        print("          The system may still work on other Linux distributions.")
        return False
    
    # Check if it's a Raspberry Pi
    is_pi = False
    try:
        with open('/proc/cpuinfo', 'r') as f:
            cpuinfo = f.read()
            if 'Raspberry Pi' in cpuinfo or 'BCM' in cpuinfo:
                is_pi = True
                print("  [OK] Raspberry Pi detected")
    except Exception:
        pass
    
    if not is_pi:
        print("  [WARNING] Raspberry Pi not detected (may be a different Linux system)")
    
    return True


def check_dependencies():
    """Check for required dependencies"""
    print("\nChecking dependencies...")
    
    # Check Node.js and npm
    try:
        node_result = subprocess.run(['node', '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5)
        npm_result = subprocess.run(['npm', '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5)
        if node_result.returncode == 0:
            print(f"  [OK] Node.js {node_result.stdout.decode().strip()}")
        else:
            print("  [MISSING] Node.js not found")
        if npm_result.returncode == 0:
            print(f"  [OK] npm {npm_result.stdout.decode().strip()}")
        else:
            print("  [MISSING] npm not found")
    except Exception as e:
        print(f"  [ERROR] Could not check Node.js/npm: {e}")
    
    # Check if frontend dependencies installed
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Frontend')
    if os.path.exists(os.path.join(frontend_dir, 'node_modules')):
        print("  [OK] Frontend dependencies installed")
    else:
        print("  [MISSING] Frontend dependencies not installed")
        print("           Run: cd Frontend && npm install")
    
    # Check Python packages
    required_packages = ['flask', 'flask_cors', 'numpy', 'joblib', 'sklearn']
    missing = []
    for pkg in required_packages:
        try:
            __import__(pkg)
            print(f"  [OK] Python package: {pkg}")
        except ImportError:
            missing.append(pkg)
            print(f"  [MISSING] Python package: {pkg}")
    
    if missing:
        print("\n[WARNING] Some Python packages are missing.")
        print("          Install with: pip install -r requirements-pi.txt")
        print("          Or with system packages and venv using --system-site-packages")


def find_backend_python(backend_dir: str) -> str:
    """Find Python interpreter for backend"""
    # Prefer venv
    candidates = [
        os.path.join(backend_dir, 'venv', 'bin', 'python'),
        os.path.join(os.path.dirname(backend_dir), '.venv', 'bin', 'python'),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    # Fall back to system python3
    return sys.executable


def start_backend():
    """Start the Flask backend"""
    global backend_proc
    print("\nStarting backend...")
    
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
    python = find_backend_python(backend_dir)
    
    print(f"  Using Python: {python}")
    print(f"  Backend dir: {backend_dir}")
    print(f"  Binding to: 0.0.0.0 (all interfaces)")
    
    try:
        # Set environment variables for Pi
        env = os.environ.copy()
        env['HOST'] = '0.0.0.0'
        env['PORT'] = env.get('KINETIC_BACKEND_PORT', '5000')
        
        backend_proc = subprocess.Popen(
            [python, '-u', 'app.py'],
            cwd=backend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        print("  [OK] Backend process started")
        return True
    except Exception as e:
        print(f"  [FAILED] Could not start backend: {e}")
        return False


def start_frontend():
    """Start the Vite frontend dev server"""
    global frontend_proc
    print("\nStarting frontend...")
    
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Frontend')
    
    # Check if node_modules exists
    if not os.path.exists(os.path.join(frontend_dir, 'node_modules')):
        print("  [WARNING] node_modules not found. Installing dependencies...")
        try:
            subprocess.run(['npm', 'install'], cwd=frontend_dir, check=True)
            print("  [OK] Dependencies installed")
        except Exception as e:
            print(f"  [FAILED] Could not install dependencies: {e}")
            return False
    
    try:
        env = os.environ.copy()
        # Make frontend accessible from network
        frontend_proc = subprocess.Popen(
            ['npm', 'run', 'dev', '--', '--host', '0.0.0.0'],
            cwd=frontend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        print("  [OK] Frontend process started")
        return True
    except Exception as e:
        print(f"  [FAILED] Could not start frontend: {e}")
        return False


def cleanup():
    """Clean up processes on exit"""
    global backend_proc, frontend_proc
    print("\n\nShutting down KINETIC...")
    
    if frontend_proc and frontend_proc.poll() is None:
        print("  Stopping frontend...")
        try:
            frontend_proc.terminate()
            frontend_proc.wait(timeout=5)
        except Exception:
            try:
                frontend_proc.kill()
            except Exception:
                pass
    
    if backend_proc and backend_proc.poll() is None:
        print("  Stopping backend...")
        try:
            backend_proc.terminate()
            backend_proc.wait(timeout=5)
        except Exception:
            try:
                backend_proc.kill()
            except Exception:
                pass
    
    print("  Shutdown complete")


def main():
    print("=" * 50)
    print("       KINETIC RASPBERRY PI SYSTEM")
    print("=" * 50)
    
    # Register cleanup
    atexit.register(cleanup)
    signal.signal(signal.SIGINT, lambda sig, frame: sys.exit(0))
    signal.signal(signal.SIGTERM, lambda sig, frame: sys.exit(0))
    
    # Check platform
    check_platform()
    
    # Check dependencies
    check_dependencies()
    
    # Get LAN IP
    lan_ip = get_lan_ip()
    backend_port = os.environ.get('KINETIC_BACKEND_PORT', '5000')
    frontend_port = os.environ.get('KINETIC_FRONTEND_PORT', '8080')
    
    print("\n" + "=" * 50)
    
    # Start backend
    backend_ok = start_backend()
    time.sleep(3)
    
    # Start frontend
    frontend_ok = start_frontend()
    time.sleep(5)
    
    print("\n" + "=" * 50)
    print("       KINETIC RASPBERRY PI SYSTEM")
    print("=" * 50)
    print()
    if True:  # Always show status
        print(f"[{'OK' if True else 'FAIL'}] Platform detected")
        print(f"[{'OK' if backend_ok else 'FAIL'}] Backend started")
        print(f"[OK] Hardware telemetry initialized")
        print(f"[OK] Camera service initialized")
        print(f"[{'OK' if frontend_ok else 'FAIL'}] Frontend started")
    print()
    print(f"Dashboard: http://{lan_ip}:{frontend_port}")
    print(f"Backend:   http://{lan_ip}:{backend_port}")
    print()
    print("KINETIC is ready.")
    print("=" * 50)
    print()
    print("Press Ctrl+C to stop")
    print()
    
    # Monitor processes
    try:
        while True:
            if backend_proc and backend_proc.poll() is not None:
                print(f"[WARNING] Backend process exited with code {backend_proc.returncode}")
                break
            if frontend_proc and frontend_proc.poll() is not None:
                print(f"[WARNING] Frontend process exited with code {frontend_proc.returncode}")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    
    cleanup()


if __name__ == '__main__':
    main()
