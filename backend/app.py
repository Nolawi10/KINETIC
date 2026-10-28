from flask import Flask, request, jsonify, send_file
from werkzeug.utils import safe_join
from flask_cors import CORS
from datetime import datetime, timezone
import atexit
import gzip
import os
import sys
import joblib
import numpy as np
from typing import Dict, List, Optional
import subprocess
import threading
import webbrowser
import time
import mimetypes
import shutil
import socket
import urllib.request

from dotenv import load_dotenv

# Dummy telemetry receiver
try:
    from dummy_telemetry import start_receiver, get_receiver, stop_receiver
    _DUMMY_TELEMETRY_AVAILABLE = True
except Exception as e:
    print(f"Warning: Could not import dummy telemetry: {e}")
    _DUMMY_TELEMETRY_AVAILABLE = False
    start_receiver = None
    get_receiver = None
    stop_receiver = None

# Add parent directory to path to import kinetic modules
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Load backend/.env (PORT, DEBUG, SECRET_KEY, FRONTEND_URL, ...)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

app = Flask(__name__)
# Cache preflight decisions so cross-origin clients (fallback 5173, LAN devices)
# do not pay an OPTIONS round-trip before every request.
CORS(app, max_age=600)

# Ports the KINETIC frontend dev server may live on.
# The Vite/TanStack dev server in this project binds 8080 (5173 kept as fallback).
FRONTEND_PORTS = (8080, 5173)

# Configuration
class Config:
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

    # Model paths
    MODELS_DIR = os.path.join(BASE_DIR, 'models')

    # Frontend URL for CORS / browser bootstrap
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8080')

app.config.from_object(Config)

# Playlist configuration
PLAYLIST_DIR = os.environ.get('KINETIC_PLAYLIST_DIR', r'E:\Kinetic Models\Playlist')
MUSIC_EXTS = {'.mp3', '.wav', '.m4a', '.aac', '.ogg'}


# Load models (lazy loading)
models_cache = {}

def get_model(model_name: str):
    """Load a model from disk with caching."""
    if model_name not in models_cache:
        model_path = os.path.join(app.config['MODELS_DIR'], f'{model_name}.joblib')
        if os.path.exists(model_path):
            models_cache[model_name] = joblib.load(model_path)
        else:
            models_cache[model_name] = None
    return models_cache[model_name]

# Class names for integer predictions.
# The pipeline trains with sklearn's LabelEncoder over `movement_class`,
# which orders labels alphabetically — the same order as the sorted labels
# in the training split. We validate that assumption before using it.
_label_names_cache: Optional[List[str]] = None

def movement_class_names() -> List[str]:
    """Return movement-class labels in LabelEncoder (alphabetical) order."""
    global _label_names_cache
    if _label_names_cache is None:
        names: List[str] = []
        train_csv = os.path.join(BASE_DIR, 'kinetic_data', 'splits', 'train.csv')
        try:
            import csv
            with open(train_csv, newline='', encoding='utf-8') as f:
                names = sorted({row['movement_class'] for row in csv.DictReader(f)
                                if row.get('movement_class')})
        except OSError:
            names = []
        _label_names_cache = names
    return _label_names_cache

def class_name_for(model, predicted) -> Optional[str]:
    """Map a predicted integer back to its class name when it is safe to do so."""
    classes = list(getattr(model, 'classes_', []))
    names = movement_class_names()
    if (classes and names
            and len(classes) == len(names)
            and all(cls == idx for idx, cls in enumerate(classes))):
        return names[int(predicted)]
    return None

def available_model_names() -> List[str]:
    """Return sorted model names without loading the (large) model files."""
    try:
        return sorted(
            file[:-len('.joblib')]
            for file in os.listdir(app.config['MODELS_DIR'])
            if file.endswith('.joblib')
        )
    except OSError:
        return []


@app.after_request
def optimize_response(response):
    """Small, dependency-free transport improvements for the JSON API.

    * health is never cached (it drives the connection indicator),
    * the model list is briefly cacheable,
    * larger JSON bodies use gzip, which matters for session/telemetry payloads.
    """
    if request.path == '/api/health':
        response.headers['Cache-Control'] = 'no-store'
    elif request.path == '/api/models':
        response.headers['Cache-Control'] = 'private, max-age=30'

    accepts_gzip = 'gzip' in request.headers.get('Accept-Encoding', '').lower()
    if (
        accepts_gzip
        and request.method == 'GET'
        and response.status_code == 200
        and response.mimetype == 'application/json'
        and not response.direct_passthrough
        and 'Content-Encoding' not in response.headers
    ):
        data = response.get_data()
        if len(data) >= 1024:
            compressed = gzip.compress(data, compresslevel=5)
            if len(compressed) < len(data):
                response.set_data(compressed)
                response.headers['Content-Encoding'] = 'gzip'
                response.headers['Content-Length'] = str(len(compressed))
                if 'Accept-Encoding' not in response.headers.get('Vary', ''):
                    response.headers.add('Vary', 'Accept-Encoding')

    return response


# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint.

    Includes the model count so the frontend can render its status chip from a
    single request instead of health + models on every poll.
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'service': 'KINETIC Backend API',
        'models': len(available_model_names()),
        'models_loaded': sum(1 for model in list(models_cache.values()) if model is not None),
    })

@app.route('/api/models', methods=['GET'])
def list_models():
    """List available ML models."""
    available_models = available_model_names()
    return jsonify({
        'models': available_models,
        'count': len(available_models)
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Make predictions using a trained model.
    Expected JSON payload:
    {
        "model": "random_forest",
        "features": [feature values array]
    }
    """
    try:
        data = request.get_json()
        model_name = data.get('model', 'random_forest')
        features = data.get('features', [])

        if not features:
            return jsonify({'error': 'No features provided'}), 400

        model = get_model(model_name)
        if model is None:
            return jsonify({'error': f'Model {model_name} not found'}), 404

        # Convert features to numpy array and reshape
        try:
            features_array = np.array(features, dtype=float).reshape(1, -1)
        except (TypeError, ValueError):
            return jsonify({'error': 'Features must be a list of numbers'}), 400

        # Validate feature count against what the model was trained on
        expected = getattr(model, 'n_features_in_', None)
        if expected is not None and features_array.shape[1] != expected:
            return jsonify({
                'error': (f'Model "{model_name}" expects {expected} features, '
                          f'got {features_array.shape[1]}.'),
                'expected_features': int(expected),
            }), 400

        # Make prediction
        prediction = model.predict(features_array)[0]
        probability = None

        # Get probability if available
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features_array)[0]
            probability = float(max(probabilities))

        return jsonify({
            'prediction': int(prediction),
            'class_name': class_name_for(model, prediction),
            'probability': probability,
            'model': model_name
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/training-sessions', methods=['GET'])
def get_training_sessions():
    """
    Get training sessions for analytics.
    Query params:
    - range: 'Today', 'Last 7 Days', 'Last 30 Days', 'All Time'
    - discipline: 'All disciplines', 'MMA', 'Boxing', 'Muay Thai', 'Taekwondo', 'Kickboxing'
    """
    try:
        range_filter = request.args.get('range', 'Last 7 Days')
        discipline = request.args.get('discipline', 'All disciplines')

        # Demo sessions (simulated data)
        demo_sessions = [
            {
                'id': 'demo-1',
                'created_at': '2026-10-10T06:10:00Z',
                'discipline': 'MMA',
                'duration_seconds': 1080,
                'strikes': 486,
                'max_speed': 12.4,
                'simulated': True
            },
            {
                'id': 'demo-2',
                'created_at': '2026-10-09T06:30:00Z',
                'discipline': 'Boxing',
                'duration_seconds': 1500,
                'strikes': 724,
                'max_speed': 11.8,
                'simulated': True
            },
            {
                'id': 'demo-3',
                'created_at': '2026-10-08T07:00:00Z',
                'discipline': 'Muay Thai',
                'duration_seconds': 1260,
                'strikes': 392,
                'max_speed': 13.2,
                'simulated': True
            },
            {
                'id': 'demo-4',
                'created_at': '2026-10-06T06:00:00Z',
                'discipline': 'MMA',
                'duration_seconds': 1800,
                'strikes': 836,
                'max_speed': 12.9,
                'simulated': True
            },
            {
                'id': 'demo-5',
                'created_at': '2026-10-04T06:00:00Z',
                'discipline': 'Taekwondo',
                'duration_seconds': 1200,
                'strikes': 318,
                'max_speed': 15.1,
                'simulated': True
            },
            {
                'id': 'demo-6',
                'created_at': '2026-09-20T06:00:00Z',
                'discipline': 'Boxing',
                'duration_seconds': 1680,
                'strikes': 768,
                'max_speed': 11.6,
                'simulated': True
            }
        ]

        # Filter sessions based on range and discipline
        filtered_sessions = filter_sessions(demo_sessions, range_filter, discipline)

        return jsonify({
            'sessions': filtered_sessions,
            'count': len(filtered_sessions)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/training-sessions', methods=['POST'])
def save_training_session():
    """
    Save a training session.
    Expected JSON payload:
    {
        "user_id": "user-id",
        "discipline": "MMA",
        "duration_seconds": 180,
        "strikes": 124,
        "max_speed": 12.4,
        "simulated": true
    }
    """
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['user_id', 'discipline', 'duration_seconds', 'strikes']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Create session record
        session = {
            'id': f"session-{datetime.now(timezone.utc).timestamp()}",
            'user_id': data['user_id'],
            'discipline': data['discipline'],
            'duration_seconds': data['duration_seconds'],
            'strikes': data['strikes'],
            'max_speed': data.get('max_speed', 0),
            'simulated': data.get('simulated', True),
            'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        # In production, save to database
        # For now, just return success
        return jsonify({
            'message': 'Session saved successfully',
            'session': session
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-sparring', methods=['POST'])
def analyze_sparring():
    """
    Analyze sparring video footage.
    Expected JSON payload:
    {
        "video_url": "url-to-video",
        "frames": [{"time": 0.5, "image": "base64-encoded-image"}]
    }
    """
    try:
        data = request.get_json()
        video_url = data.get('video_url')
        frames = data.get('frames', [])

        if not video_url and not frames:
            return jsonify({'error': 'No video or frames provided'}), 400

        # Simulated analysis (in production, use actual ML models)
        analysis = {
            'id': f"analysis-{datetime.now(timezone.utc).timestamp()}",
            'status': 'completed',
            'summary': {
                'total_strikes': len(frames) * 3,
                'strikes_per_minute': 45.2,
                'accuracy': 0.78,
                'technique_breakdown': {
                    'jabs': 35,
                    'crosses': 28,
                    'hooks': 22,
                    'kicks': 15
                }
            },
            'recommendations': [
                'Improve guard recovery speed on jab combinations',
                'Work on footwork balance during cross punches',
                'Consider more defensive movement patterns'
            ],
            'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        return jsonify(analysis)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telemetry', methods=['POST'])
def receive_telemetry():
    """
    Receive real-time telemetry data from sensors.
    Expected JSON payload:
    {
        "timestamp": 1234567890,
        "impact_zone": "chest_zone",
        "force": 450.5,
        "imu_data": {...},
        "pose_data": {...}
    }
    """
    try:
        data = request.get_json()

        # Process telemetry data
        # In production, store in time-series database or process in real-time

        return jsonify({
            'status': 'received',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Dummy telemetry API endpoints
@app.route('/api/devices', methods=['GET'])
def get_devices():
    if not _DUMMY_TELEMETRY_AVAILABLE or not get_receiver:
        return jsonify({'devices': [], 'message': 'Dummy telemetry not available'}), 200
    try:
        receiver = get_receiver()
        devices = receiver.get_devices()
        return jsonify({'devices': devices})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/telemetry/dummy/latest', methods=['GET'])
def get_dummy_latest():
    if not _DUMMY_TELEMETRY_AVAILABLE or not get_receiver:
        return jsonify({'readings': {}, 'message': 'Dummy telemetry not available'}), 200
    try:
        receiver = get_receiver()
        node_id = request.args.get('node_id')
        readings = receiver.get_latest(node_id)
        return jsonify({'readings': readings})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/telemetry/dummy/events', methods=['GET'])
def get_dummy_events():
    if not _DUMMY_TELEMETRY_AVAILABLE or not get_receiver:
        return jsonify({'events': [], 'message': 'Dummy telemetry not available'}), 200
    try:
        receiver = get_receiver()
        limit = request.args.get('limit', 50)
        try:
            limit = int(limit)
        except ValueError:
            limit = 50
        events = receiver.get_events(limit)
        return jsonify({'events': events})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/telemetry/health', methods=['GET'])
def get_telemetry_health():
    if not _DUMMY_TELEMETRY_AVAILABLE or not get_receiver:
        return jsonify({'receiver_running': False, 'message': 'Dummy telemetry not available'}), 200
    try:
        receiver = get_receiver()
        health = receiver.get_health()
        return jsonify(health)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Hardware node configuration endpoints
@app.route('/api/hardware/nodes', methods=['GET'])
def get_hardware_nodes():
    try:
        if _DUMMY_TELEMETRY_AVAILABLE and get_receiver:
            receiver = get_receiver()
            devices = receiver.get_devices()
            configs = getattr(receiver, 'node_configs', {})
            # Merge
            result = []
            for d in devices:
                nid = d.get('node_id')
                cfg = configs.get(nid, {}) or {}
                merged = {**cfg, **d}
                result.append({**d, 'config': merged})
            # Also include configured nodes not seen yet
            seen = {r['node_id'] for r in result}
            for nid, cfg in configs.items():
                if nid not in seen:
                    result.append({'node_id': nid, 'config': cfg, 'status': 'offline', 'stale': True})
            return jsonify({'nodes': result})
        else:
            try:
                from dummy_telemetry import get_node_configs
                return jsonify({'nodes': [{'node_id': k, 'config': v} for k,v in get_node_configs().items()]})
            except Exception:
                return jsonify({'nodes': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/hardware/nodes', methods=['POST'])
def save_hardware_node():
    try:
        data = request.get_json() or {}
        node_id = data.get('node_id')
        if not node_id:
            return jsonify({'error': 'node_id required'}), 400
        # Basic validation
        ip = data.get('esp_ip') or data.get('ip')
        if ip:
            # simple IPv4 check
            parts = ip.split('.')
            if len(parts) != 4 or not all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
                return jsonify({'error': 'Invalid IPv4 address'}), 400
        port = data.get('port') or data.get('receiver_port')
        if port is not None:
            try:
                p = int(port)
                if p < 1 or p > 65535:
                    raise ValueError
            except Exception:
                return jsonify({'error': 'Invalid port'}), 400
        if _DUMMY_TELEMETRY_AVAILABLE:
            from dummy_telemetry import save_node_config
            save_node_config(node_id, data)
        return jsonify({'status': 'saved', 'node_id': node_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/hardware/test', methods=['POST'])
def test_hardware_connection():
    try:
        data = request.get_json() or {}
        node_id = data.get('node_id')
        if not node_id:
            return jsonify({'error': 'node_id required'}), 400
        if _DUMMY_TELEMETRY_AVAILABLE and get_receiver:
            receiver = get_receiver()
            devices = receiver.get_devices()
            for d in devices:
                if d.get('node_id') == node_id:
                    now = __import__('time').time()
                    last = d.get('last_seen_epoch', 0)
                    if last and (now - last) < 10:
                        return jsonify({'status': 'online', 'message': 'Recent packets received', 'device': d})
                    else:
                        return jsonify({'status': 'stale', 'message': 'No recent packets', 'device': d})
            return jsonify({'status': 'offline', 'message': 'No packets received from this node yet'})
        return jsonify({'status': 'unknown', 'message': 'Receiver not available'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/coaching-presets', methods=['GET'])
def get_coaching_presets():
    """Get available coaching presets."""
    presets = [
        {
            'id': 'defense',
            'title': 'Defensive Matrix',
            'tag': 'GUARD & EVASION',
            'tone': 'blue',
            'discipline': 'MMA',
            'parameters': [
                'Guard Height Analysis',
                'Head Movement Tracking',
                'Slip & Roll Detection',
                'Block Timing Metrics'
            ]
        },
        {
            'id': 'speed',
            'title': 'Velocity Protocol',
            'tag': 'STRIKE SPEED',
            'tone': 'orange',
            'discipline': 'Boxing',
            'parameters': [
                'Hand Speed Measurement',
                'Extension Velocity',
                'Recovery Time Analysis',
                'Combo Speed Tracking'
            ]
        },
        {
            'id': 'biomechanics',
            'title': 'Biomechanics Lab',
            'tag': 'FORM & POSTURE',
            'tone': 'green',
            'discipline': 'Muay Thai',
            'parameters': [
                'Stance Balance Metrics',
                'Hip Rotation Analysis',
                'Weight Distribution',
                'Shoulder Alignment'
            ]
        },
        {
            'id': 'grassroots',
            'title': 'Grassroots Sparring',
            'tag': 'COMMUNITY DRILLS',
            'tone': 'purple',
            'discipline': 'MMA',
            'parameters': [
                'Partner Coordination',
                'Distance Control',
                'Rhythm & Timing',
                'Flow State Tracking'
            ]
        }
    ]

    return jsonify({'presets': presets})

# Helper functions
def filter_sessions(sessions: List[Dict], range_filter: str, discipline: str) -> List[Dict]:
    """Filter sessions based on time range and discipline."""
    from datetime import timezone
    now = datetime.now(timezone.utc)

    # Calculate time threshold
    if range_filter == 'Today':
        threshold = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    elif range_filter == 'Last 7 Days':
        threshold = datetime.fromtimestamp(now.timestamp() - 7 * 86400, tz=timezone.utc)
    elif range_filter == 'Last 30 Days':
        threshold = datetime.fromtimestamp(now.timestamp() - 30 * 86400, tz=timezone.utc)
    else:  # All Time
        threshold = datetime.min.replace(tzinfo=timezone.utc)

    filtered = []
    for session in sessions:
        session_date = datetime.fromisoformat(session['created_at'].replace('Z', '+00:00'))

        # Check time range
        if session_date < threshold:
            continue

        # Check discipline
        if discipline != 'All disciplines' and session['discipline'] != discipline:
            continue

        filtered.append(session)

    return filtered

# ---------------------------------------------------------------------------
# Frontend (Vite dev server) lifecycle
# ---------------------------------------------------------------------------
_frontend_proc: Optional[subprocess.Popen] = None
_frontend_owned = False


def _url_responds(url: str, timeout: float = 2.0) -> bool:
    """True when an HTTP URL answers with any status < 500."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status < 500
    except Exception:
        return False


def _port_accepts(port: int, host: str = '127.0.0.1', timeout: float = 1.0) -> bool:
    """True when something is listening on a TCP port.

    Probing with a plain TCP connect (instead of a full HTTP GET) avoids
    tripping Vite's on-demand SSR compile and aborting it mid-request.
    """
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def find_frontend_url() -> Optional[str]:
    """Return the URL of a running KINETIC frontend, if one is listening."""
    for port in FRONTEND_PORTS:
        if _port_accepts(port):
            return f'http://localhost:{port}'
    configured = app.config.get('FRONTEND_URL')
    if configured:
        url = configured.rstrip('/')
        try:
            port = int(url.rsplit(':', 1)[-1])
        except ValueError:
            port = None
        if port and _port_accepts(port):
            return url
    return None


def start_frontend():
    """Start the Vite dev server, or reuse one that is already running."""
    global _frontend_proc, _frontend_owned

    running = find_frontend_url()
    if running:
        print(f"Frontend already running at {running} — reusing it.")
        return

    frontend_dir = os.path.join(BASE_DIR, 'Frontend')
    print(f"Starting frontend from: {frontend_dir}")

    # Prefer bun when the project has a lockfile *and* bun is actually installed
    has_bun = (os.path.exists(os.path.join(frontend_dir, 'bun.lock'))
               and shutil.which('bun') is not None)

    # Install dependencies on first run
    if not os.path.exists(os.path.join(frontend_dir, 'node_modules')):
        installer = 'bun install' if has_bun else 'npm install'
        print(f"Installing frontend dependencies with '{installer}' (this may take a while)...")
        try:
            subprocess.run(installer, cwd=frontend_dir, shell=True, check=True)
            print("Frontend dependencies installed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"Failed to install frontend dependencies: {e}")
            print(f"Run '{installer}' manually in {frontend_dir} and try again.")
            return

    command = 'bun run dev' if has_bun else 'npm run dev'

    popen_kwargs: Dict = {'cwd': frontend_dir, 'shell': True}
    if os.name == 'nt':
        # Keep the child out of our Ctrl+C group; we stop it explicitly on exit.
        popen_kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs['start_new_session'] = True

    try:
        _frontend_proc = subprocess.Popen(command, **popen_kwargs)
        _frontend_owned = True
        ports = ', '.join(f'http://localhost:{p}' for p in FRONTEND_PORTS)
        print(f"Frontend dev server launched with '{command}' (listening on {ports})")
    except Exception as e:
        print(f"Failed to start frontend: {e}")
        print(f"Run '{command}' manually in {frontend_dir}.")


def stop_frontend():
    """Stop the frontend dev server *we* started (never one the user started)."""
    global _frontend_proc, _frontend_owned
    if not _frontend_owned or _frontend_proc is None:
        _frontend_proc = None
        return
    if _frontend_proc.poll() is None:
        print("Stopping frontend dev server...")
        try:
            if os.name == 'nt':
                # /T kills the whole tree (cmd -> npm/node -> vite)
                subprocess.run(['taskkill', '/T', '/F', '/PID', str(_frontend_proc.pid)],
                               capture_output=True)
            else:
                _frontend_proc.terminate()
                _frontend_proc.wait(timeout=10)
        except Exception as e:
            print(f"Could not stop the frontend cleanly: {e}")
    _frontend_proc = None
    _frontend_owned = False


atexit.register(stop_frontend)

# Start dummy telemetry receiver
if _DUMMY_TELEMETRY_AVAILABLE and start_receiver:
    try:
        start_receiver(app)
        print("Dummy telemetry receiver initialized")
    except Exception as e:
        print(f"Failed to start dummy telemetry receiver: {e}")


def _open_browser(url: str) -> None:
    """Open the app, unless explicitly suppressed for automated runs."""
    if os.environ.get('KINETIC_NO_BROWSER', '').strip().lower() in ('1', 'true', 'yes', 'on'):
        print(f"Browser launch skipped (KINETIC_NO_BROWSER). Open {url}")
        return
    webbrowser.open(url)


def warm_remaining_routes(frontend_url: str, timeout: float = 90.0) -> None:
    """Precompile the other screens after the browser is already open.

    Vite compiles TanStack routes on demand, so the first visit to each tab was
    paying a multi-second SSR transform. Warming them in the background keeps
    the initial browser open fast while making navigation effectively instant.
    """
    # Let the landing page finish its own asset requests first.
    time.sleep(2.0)
    routes = ('/live', '/analytics', '/training-modes', '/settings')
    print(f"Pre-warming routes: {' '.join(routes)}")
    try:
        from concurrent.futures import ThreadPoolExecutor

        def warm(route: str) -> None:
            _url_responds(f'{frontend_url}{route}', timeout=timeout)

        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(warm, routes))
    except Exception as e:
        print(f"Route warm-up skipped: {e}")
    else:
        print("Route warm-up complete.")


def open_browser_when_ready(backend_port: int, timeout: float = 150.0):
    """Open the app once BOTH the Vite dev server and the Flask API respond."""
    health_url = f'http://127.0.0.1:{backend_port}/api/health'
    deadline = time.monotonic() + timeout
    started_at = time.monotonic()
    frontend_url = None

    while time.monotonic() < deadline:
        if frontend_url is None:
            frontend_url = find_frontend_url()
            if frontend_url is None and _frontend_proc is not None and _frontend_proc.poll() is not None:
                print(f"Frontend dev server exited with code {_frontend_proc.returncode} — "
                      f"run 'npm run dev' in the Frontend folder to see the error.")
                return
        if frontend_url and _url_responds(health_url):
            # Warm up the first page render (TanStack/Vite compile on demand)
            # so the browser we open doesn't sit waiting for the initial build.
            print(f"Warming up {frontend_url}/ ...")
            if not _url_responds(f'{frontend_url}/', timeout=90):
                print("Note: the page did not answer the warm-up request; opening it anyway.")
            print(f"Opening browser at {frontend_url} "
                  f"(ready in {time.monotonic() - started_at:.1f}s)")
            _open_browser(frontend_url)
            # Compile the remaining tabs while the user reads the landing page.
            threading.Thread(
                target=warm_remaining_routes,
                args=(frontend_url,),
                daemon=True,
            ).start()
            return
        time.sleep(0.5)

    print("Timed out waiting for the app to become ready.")
    if frontend_url:
        _open_browser(frontend_url)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))

    print("=" * 60)
    print("KINETIC Full Stack Application")
    print("=" * 60)

    # 1. Start the Vite dev server (or attach to one already running)
    start_frontend()

    # 2. Open the browser once both servers respond
    threading.Thread(target=open_browser_when_ready, args=(port,), daemon=True).start()

    frontend_hint = ' or '.join(f'http://localhost:{p}' for p in FRONTEND_PORTS)
    print(f"Backend  (API):    http://localhost:{port}")
    print(f"Frontend (app):    {frontend_hint} (starts shortly)")
    print("=" * 60)
    print("Press CTRL+C to stop both servers")
    print("=" * 60)

    try:
        app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'],
                use_reloader=False, threaded=True)
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        stop_frontend()


# Music Playlist API
@app.route('/api/playlist', methods=['GET'])
def get_playlist():
    try:
        playlist_dir = PLAYLIST_DIR
        tracks = []
        if os.path.exists(playlist_dir):
            for fname in sorted(os.listdir(playlist_dir)):
                fpath = os.path.join(playlist_dir, fname)
                if os.path.isfile(fpath):
                    ext = os.path.splitext(fname)[1].lower()
                    if ext in MUSIC_EXTS:
                        # Try to extract basic info
                        title = os.path.splitext(fname)[0]
                        # Remove common prefixes
                        tracks.append({
                            'id': fname,
                            'filename': fname,
                            'title': title,
                            'artist': '',
                            'duration': None,
                            'url': f'/api/playlist/stream/{fname}'
                        })
        return jsonify({'tracks': tracks, 'directory': playlist_dir})
    except Exception as e:
        return jsonify({'error': str(e), 'tracks': []}), 200


@app.route('/api/playlist/stream/<path:filename>', methods=['GET'])
def stream_playlist_file(filename):
    try:
        playlist_dir = PLAYLIST_DIR
        # Prevent path traversal
        safe_path = safe_join(playlist_dir, filename)
        if not safe_path or not os.path.abspath(safe_path).startswith(os.path.abspath(playlist_dir)):
            return jsonify({'error': 'Invalid path'}), 403
        if not os.path.exists(safe_path) or not os.path.isfile(safe_path):
            return jsonify({'error': 'File not found'}), 404
        ext = os.path.splitext(safe_path)[1].lower()
        if ext not in MUSIC_EXTS:
            return jsonify({'error': 'Invalid file type'}), 403
        mimetype = mimetypes.guess_type(safe_path)[0] or 'audio/mpeg'
        return send_file(safe_path, mimetype=mimetype, as_attachment=False, conditional=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/playlist/refresh', methods=['POST'])
def refresh_playlist():
    try:
        playlist_dir = PLAYLIST_DIR
        exists = os.path.exists(playlist_dir)
        return jsonify({'success': True, 'exists': exists, 'directory': playlist_dir})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

