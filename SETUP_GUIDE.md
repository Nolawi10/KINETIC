# KINETIC Full Stack Setup Guide

This guide will help you set up and run the complete KINETIC application with both the Flask backend and React frontend.

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm or bun

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # On Windows
# or
source venv/bin/activate  # On Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the Flask server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

Alternatively, use the provided startup scripts:
- Windows: `start.bat`
- Linux/Mac: `./start.sh`

## Frontend Setup

1. Navigate to the frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Start the development server:
```bash
npm run dev
# or
bun dev
```

The frontend will run on `http://localhost:8080`

## Configuration

The frontend is configured to connect to the backend via the `VITE_API_URL` environment variable in `Frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

Make sure this matches your backend URL.

## API Endpoints

### Health Check
- `GET /api/health` - Check if the API is running

### Models
- `GET /api/models` - List available ML models (15 models available)
- `POST /api/predict` - Make predictions using a trained model

### Training Sessions
- `GET /api/training-sessions` - Get training sessions for analytics
- `POST /api/training-sessions` - Save a training session

### Analysis
- `POST /api/analyze-sparring` - Analyze sparring video footage

### Telemetry
- `POST /api/telemetry` - Receive real-time telemetry data from sensors

### Coaching
- `GET /api/coaching-presets` - Get available coaching presets

## Testing the Connection

1. Start everything with one command: `python start.py`
   (or `cd backend && python app.py`)
2. Wait for both servers — the browser opens automatically at
   `http://localhost:8080` once the frontend and API respond
3. The footer shows the live API status (`API: ONLINE · 15 MODELS`)
4. Navigate to the Analytics page to see demo training session data
5. Navigate to Training Modes to see coaching presets

## Testing API Endpoints with curl

```bash
# Health check
curl http://localhost:5000/api/health

# List models
curl http://localhost:5000/api/models

# Get training sessions
curl "http://localhost:5000/api/training-sessions?range=All%20Time&discipline=MMA"

# Save a training session
curl -X POST http://localhost:5000/api/training-sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "discipline": "MMA",
    "duration_seconds": 180,
    "strikes": 124,
    "max_speed": 12.4,
    "simulated": true
  }'

# Get coaching presets
curl http://localhost:5000/api/coaching-presets

# Analyze sparring
curl -X POST http://localhost:5000/api/analyze-sparring \
  -H "Content-Type: application/json" \
  -d '{"video_url": "test-video.mp4"}'
```

## Available ML Models

The backend has access to 15 pre-trained models:
- decision_tree
- dummy
- ensemble_stacking
- ensemble_voting
- extra_trees
- extra_trees_tuned
- hist_gb_tuned
- hist_gradient_boosting
- knn
- lightgbm
- logistic_regression
- random_forest
- random_forest_tuned
- svm
- xgboost

## Troubleshooting

### Backend won't start
- Make sure the virtual environment is activated
- Check that all dependencies are installed
- Verify port 5000 is not already in use

### Frontend can't connect to backend
- Ensure the backend is running
- Check the `VITE_API_URL` in `Frontend/.env`
- Verify CORS is enabled in the backend (it is by default)

### Model prediction errors
- The models expect specific feature dimensions (e.g., RandomForest expects 53 features)
- Check the model training code to understand expected input format

## Production Deployment

For production deployment:
1. Set `DEBUG=False` in `backend/.env`
2. Use a strong `SECRET_KEY`
3. Use a production WSGI server like Gunicorn for the backend
4. Build the frontend for production: `npm run build`
5. Configure proper CORS settings for your frontend domain
6. Set up a proper database for session storage
7. Use environment variables for sensitive configuration
