# KINETIC Backend API

Flask backend for the KINETIC Combat Academy frontend application.

## Features

- RESTful API endpoints for training sessions, predictions, and analytics
- ML model integration for strike prediction and classification
- CORS support for frontend-backend communication
- Session management and telemetry data handling
- Sparring video analysis endpoint

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # On Windows
# or
source venv/bin/activate  # On Linux/Mac
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your settings
```

## Running the Server

Development mode (starts **both** servers and opens the app in your browser):
```bash
python app.py
```

This will:

1. Start the Vite frontend dev server (`http://localhost:8080`) — or reuse one
   that is already running
2. Serve this API on `http://localhost:5000`
3. Wait until both servers respond, then open `http://localhost:8080`
4. Stop the frontend dev server when you press `CTRL+C`

To run only the API, start it with a port that is not the frontend's and skip
the browser bootstrap — but for development, `python app.py` is the intended
entry point.

## API Endpoints

### Health Check
- `GET /api/health` - Check if the API is running

### Models
- `GET /api/models` - List available ML models
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

## Example Requests

### Predict using a model

Models are trained on the 53 numeric features from
`kinetic_data/processed/extracted_features/*.csv` (58 columns minus the 5
metadata columns). A wrong feature count returns `400` with `expected_features`.

```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "model": "random_forest",
    "features": [0.42, 1.8, 0.09, 3.1, 0.05, 0.01, 0.04, 0.06, 4, 62.5, 55.1, 48.0, 0.2, 0.3, 0.1, 0.2, 0.15, 0.05, 1.0, 0.8, 0.6, 0.9, 0.7, 0.01, 0.02, 0.01, 0.03, 0.02, 21.4, 0.1, -0.05, 9.8, 0.2, 0.3, 0.1, 9.8, 12.1, 0.9, 3.2, 0.05, 0.02, -0.01, 0.3, 0.2, 0.1, 1.5, 0.08, 2, 0.4, 0.1, 0.5, 0.5, 0.6]
  }'
```

Example response:

```json
{"model": "random_forest", "prediction": 4, "class_name": "jab", "probability": 0.62}
```

### Get training sessions
```bash
curl "http://localhost:5000/api/training-sessions?range=Last%207%20Days&discipline=MMA"
```

### Save a training session
```bash
curl -X POST http://localhost:5000/api/training-sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "discipline": "MMA",
    "duration_seconds": 180,
    "strikes": 124,
    "max_speed": 12.4,
    "simulated": true
  }'
```

## Frontend Integration

The frontend is configured to connect to this backend via environment variables. Update the frontend's `.env` file to point to the correct backend URL:

```
VITE_API_URL=http://localhost:5000
```

## Production Deployment

For production deployment:
1. Set `DEBUG=False` in `.env`
2. Use a strong `SECRET_KEY`
3. Use a production WSGI server like Gunicorn:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```
4. Configure proper CORS settings for your frontend domain
5. Set up proper database for session storage
