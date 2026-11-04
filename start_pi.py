#!/usr/bin/env python3
"""
KINETIC Raspberry Pi 5 Launcher

Starts the complete KINETIC application on Raspberry Pi 5:
- Checks system and Python dependencies (including Picamera2)
- Probes the physical Raspberry Pi Camera with Picamera2/libcamera
- Starts Flask backend bound to 0.0.0.0
- Starts Vite frontend bound to 0.0.0.0
- Waits for both servers before opening the website
- Opens the website in the Pi browser when a desktop session is available
- Prints the LAN URL for headless/SSH setups
- Shuts both processes down cleanly on CTRL+C / SIGTERM

The backend deliberately does NOT manage the frontend here: this launcher owns
exactly one Vite process so the two entry points can never start duplicates.
"""

import atexit
import os
import platform
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, 'backend')
FRONTEND_DIR = os.path.join(ROOT, 'Frontend')
REQUIREMENTS_PI = os.path.join(BACKEND_DIR, 'requirements-pi.txt')

backend_proc = None
frontend_proc = None
_cleaning_up = False


def get_lan_ip():
    """Return the LAN IP address of this device, or localhost."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "localhost"


def check_platform():
    """Report the platform and whether Raspberry Pi hardware was detected."""
    print("Checking platform...")
    system = platform.system()
    print(f"  OS: {system} {platform.release()}")
    print(f"  Machine: {platform.machine()}")
    print(f"  Python: {sys.version.split()[0]}")

    if system != "Linux":
        print("\n[WARNING] Not running on Linux. This launcher targets Raspberry Pi OS.")
        print("          Windows should use: python start.py")
        return False

    is_pi = False
    try:
        with open('/proc/cpuinfo', 'r', encoding='utf-8') as handle:
            cpuinfo = handle.read()
        if 'Raspberry Pi' in cpuinfo or 'BCM' in cpuinfo:
            is_pi = True
            print("  [OK] Raspberry Pi hardware detected")
    except Exception:
        pass

    if not is_pi:
        print("  [WARNING] Raspberry Pi hardware string not detected (may be generic Linux)")
    return True


def find_backend_python(backend_dir):
    """Prefer the backend virtualenv interpreter, fall back to this Python."""
    candidates = [
        os.path.join(backend_dir, 'venv', 'bin', 'python'),          # Linux/macOS
        os.path.join(os.path.dirname(backend_dir), '.venv', 'bin', 'python'),
        os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe'),  # Windows
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return sys.executable


def check_python_packages(python):
    """Check imports inside the interpreter that will actually run the backend."""
    modules = ['flask', 'flask_cors', 'numpy', 'joblib', 'sklearn', 'dotenv', 'PIL']
    probe = (
        "import importlib.util, json\n"
        f"mods = {modules!r}\n"
        "missing = [m for m in mods if importlib.util.find_spec(m) is None]\n"
        "print(json.dumps(missing))\n"
    )
    try:
        result = subprocess.run(
            [python, '-c', probe],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            print(f"  [ERROR] Could not inspect backend Python: {result.stderr.strip()}")
            return False
        import json
        missing = json.loads(result.stdout.strip() or "[]")
    except Exception as exc:
        print(f"  [ERROR] Could not inspect backend Python: {exc}")
        return False

    if missing:
        print(f"  [MISSING] Python packages: {', '.join(missing)}")
        print("            Install them with:")
        print(f"              {python} -m pip install -r {REQUIREMENTS_PI}")
        return False

    print("  [OK] Backend Python packages available")
    return True


def check_camera(python):
    """Verify Picamera2 imports and libcamera sees a physical camera."""
    print("\nChecking Raspberry Pi Camera...")
    probe = (
        "import json\n"
        "try:\n"
        "    from picamera2 import Picamera2\n"
        "except Exception as exc:\n"
        "    print('IMPORT_ERROR:' + str(exc))\n"
        "    raise SystemExit(2)\n"
        "try:\n"
        "    info = Picamera2.global_camera_info()\n"
        "except Exception as exc:\n"
        "    print('PROBE_ERROR:' + str(exc))\n"
        "    raise SystemExit(3)\n"
        "print('CAMERAS:' + json.dumps(info))\n"
        "raise SystemExit(0 if info else 4)\n"
    )
    try:
        result = subprocess.run(
            [python, '-c', probe],
            capture_output=True,
            text=True,
            timeout=45,
        )
    except Exception as exc:
        print(f"  [ERROR] Camera probe could not run: {exc}")
        return False

    output = (result.stdout or '').strip()
    errors = (result.stderr or '').strip()

    if result.returncode == 0 and 'CAMERAS:' in output:
        print(f"  [OK] Physical camera detected by libcamera: {output.split('CAMERAS:', 1)[1]}")
        return True

    if result.returncode == 2 or 'IMPORT_ERROR:' in output:
        print("  [MISSING] Picamera2 Python package not available in the backend interpreter.")
        print("            On Raspberry Pi OS install the system packages:")
        print("              sudo apt install -y python3-picamera2 python3-libcamera libcamera-tools")
        print("            Recreate the backend venv with --system-site-packages if needed.")
        return False

    if result.returncode == 4:
        print("  [WARNING] Picamera2 is installed, but libcamera reports no camera.")
        print("            Check the ribbon cable and run: rpicam-hello --list-cameras")
        return False

    print(f"  [WARNING] Camera probe failed: {errors or output or 'unknown error'}")
    print("            Verify with: rpicam-hello --list-cameras")
    return False


def check_dependencies():
    """Check Node, the frontend install, backend Python packages, and the camera."""
    print("\nChecking dependencies...")

    try:
        node_result = subprocess.run(
            ['node', '--version'], capture_output=True, text=True, timeout=10
        )
        npm_result = subprocess.run(
            ['npm', '--version'], capture_output=True, text=True, timeout=10
        )
        if node_result.returncode == 0:
            print(f"  [OK] Node.js {node_result.stdout.strip()}")
        else:
            print("  [MISSING] Node.js not found. Install Node.js 20 LTS.")
        if npm_result.returncode == 0:
            print(f"  [OK] npm {npm_result.stdout.strip()}")
        else:
            print("  [MISSING] npm not found.")
    except Exception as exc:
        print(f"  [ERROR] Could not check Node.js/npm: {exc}")

    if os.path.exists(os.path.join(FRONTEND_DIR, 'node_modules')):
        print("  [OK] Frontend dependencies installed")
    else:
        print("  [MISSING] Frontend dependencies not installed")
        print("           Run: cd Frontend && npm install")

    python = find_backend_python(BACKEND_DIR)
    print(f"  Backend Python: {python}")
    if not os.path.exists(os.path.join(BACKEND_DIR, 'venv')):
        print("  [INFO] No backend/venv found; falling back to this interpreter.")
        print("         Recommended setup:")
        print("           cd backend")
        print("           python3 -m venv --system-site-packages venv")
        print("           source venv/bin/activate")
        print("           pip install -r backend/requirements-pi.txt")

    packages_ok = check_python_packages(python)
    camera_ok = check_camera(python)
    return packages_ok, camera_ok


def start_backend():
    """Start Flask bound to 0.0.0.0. The launcher owns the frontend and browser."""
    global backend_proc
    print("\nStarting backend...")

    python = find_backend_python(BACKEND_DIR)
    backend_port = os.environ.get('KINETIC_BACKEND_PORT', '5000')

    print(f"  Using Python: {python}")
    print(f"  Backend dir: {BACKEND_DIR}")
    print(f"  Binding to: 0.0.0.0:{backend_port}")

    try:
        env = os.environ.copy()
        env['HOST'] = '0.0.0.0'
        env['PORT'] = backend_port
        # Exactly one frontend process, owned by this launcher.
        env['KINETIC_MANAGE_FRONTEND'] = '0'
        # This launcher opens the browser only after both servers respond.
        env['KINETIC_NO_BROWSER'] = '1'

        backend_proc = subprocess.Popen(
            [python, '-u', 'app.py'],
            cwd=BACKEND_DIR,
            env=env,
        )
        print("  [OK] Backend process launched")
        return True
    except Exception as exc:
        print(f"  [FAILED] Could not start backend: {exc}")
        return False


def start_frontend():
    """Start the Vite dev server on 0.0.0.0."""
    global frontend_proc
    print("\nStarting frontend...")

    if not os.path.exists(os.path.join(FRONTEND_DIR, 'node_modules')):
        print("  [WARNING] node_modules not found. Running npm install...")
        try:
            subprocess.run(['npm', 'install'], cwd=FRONTEND_DIR, check=True)
            print("  [OK] Dependencies installed")
        except Exception as exc:
            print(f"  [FAILED] Could not install dependencies: {exc}")
            return False

    frontend_port = os.environ.get('KINETIC_FRONTEND_PORT', '8080')
    try:
        env = os.environ.copy()
        # The Vite proxy reads this to reach a non-default Flask port.
        env['KINETIC_BACKEND_PORT'] = os.environ.get('KINETIC_BACKEND_PORT', '5000')
        frontend_proc = subprocess.Popen(
            ['npm', 'run', 'dev', '--', '--host', '0.0.0.0', '--port', frontend_port],
            cwd=FRONTEND_DIR,
            env=env,
        )
        print(f"  [OK] Frontend process launched on 0.0.0.0:{frontend_port}")
        return True
    except Exception as exc:
        print(f"  [FAILED] Could not start frontend: {exc}")
        return False


def wait_for_url(url, timeout=90.0):
    """Wait until an HTTP endpoint answers with a status below 500."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                if response.status < 500:
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def _stop_process(proc, label):
    if proc is None or proc.poll() is not None:
        return
    print(f"  Stopping {label}...")
    try:
        if os.name != 'nt':
            # SIGINT lets Flask run its finally block, which closes Picamera2.
            proc.send_signal(signal.SIGINT)
        else:
            proc.terminate()
        proc.wait(timeout=8)
    except Exception:
        try:
            proc.terminate()
            proc.wait(timeout=4)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


def cleanup():
    """Stop both child processes once. Camera resources belong to the backend."""
    global _cleaning_up
    if _cleaning_up:
        return
    _cleaning_up = True

    print("\n\nShutting down KINETIC Pi services...")
    _stop_process(frontend_proc, "frontend")
    _stop_process(backend_proc, "backend")
    print("  Shutdown complete.")


def main():
    print("=" * 60)
    print("       KINETIC RASPBERRY PI 5 SYSTEM LAUNCHER")
    print("=" * 60)

    atexit.register(cleanup)
    signal.signal(signal.SIGINT, lambda sig, frame: sys.exit(0))
    signal.signal(signal.SIGTERM, lambda sig, frame: sys.exit(0))

    check_platform()
    packages_ok, camera_ok = check_dependencies()

    lan_ip = get_lan_ip()
    backend_port = os.environ.get('KINETIC_BACKEND_PORT', '5000')
    frontend_port = os.environ.get('KINETIC_FRONTEND_PORT', '8080')

    print("\n" + "=" * 60)

    backend_ok = start_backend()
    if backend_ok:
        backend_ready = wait_for_url(f'http://127.0.0.1:{backend_port}/api/health', timeout=60)
    else:
        backend_ready = False

    frontend_ok = start_frontend()
    if frontend_ok:
        frontend_ready = wait_for_url(f'http://127.0.0.1:{frontend_port}/', timeout=120)
    else:
        frontend_ready = False

    print("\n" + "=" * 60)
    print("       KINETIC SYSTEM READY" if backend_ready and frontend_ready else "       KINETIC STARTUP INCOMPLETE")
    print("=" * 60)
    print()
    print(f"[{'OK' if backend_ready else 'FAIL'}] Flask backend:      http://0.0.0.0:{backend_port}")
    print(f"[{'OK' if frontend_ready else 'FAIL'}] Frontend dashboard:  http://0.0.0.0:{frontend_port}")
    if camera_ok:
        print(f"[OK] Camera stream:      http://0.0.0.0:{backend_port}/api/camera/stream")
    else:
        print("[WARNING] Camera not verified; the UI will show CAMERA UNAVAILABLE until it works.")
    if not packages_ok:
        print("[WARNING] Backend Python dependencies are incomplete; see the messages above.")
    print()
    print(f"Local access:   http://localhost:{frontend_port}")
    print(f"LAN access:     http://{lan_ip}:{frontend_port}")
    print(f"API health:     http://{lan_ip}:{backend_port}/api/health")
    print("=" * 60)

    has_display = bool(os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY'))
    no_browser = os.environ.get('KINETIC_NO_BROWSER', '').strip().lower() in ('1', 'true', 'yes', 'on')

    if frontend_ready and has_display and not no_browser:
        print(f"\nDesktop GUI detected - opening http://localhost:{frontend_port} ...")
        try:
            webbrowser.open(f"http://localhost:{frontend_port}")
        except Exception as exc:
            print(f"Could not open the browser automatically: {exc}")
            print(f"Open http://localhost:{frontend_port} manually.")
    elif frontend_ready:
        print("\nDesktop GUI not detected (headless or SSH session).")
        print(f"Open http://{lan_ip}:{frontend_port} from a device on the same network.")
    else:
        print("\nFrontend did not become ready. Check the Vite output above.")

    print("\nPress CTRL+C to stop both servers.")
    print("=" * 60 + "\n")

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
