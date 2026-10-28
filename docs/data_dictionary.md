# KINETIC Data Dictionary

This document defines all data fields, their types, units, and semantics used throughout the KINETIC system.

## Metadata Tables

### participants.csv

| Field | Type | Description | Values/Constraints |
|-------|------|-------------|-------------------|
| participant_id | string | Unique participant identifier | Format: P001, P002, etc. Synthetic: anonymous IDs |
| data_source | string | Origin of data | "synthetic" or "real" |
| simulation_profile | string | Simulator profile used | e.g., "beginner", "intermediate", "advanced" |
| experience_group | string | Simulated experience level | "novice", "intermediate", "expert" (optional) |
| age_group | string | Age category (if applicable) | e.g., "18-25", "26-35" (optional, synthetic only) |
| height_cm | float | Height in centimeters (synthetic) | Optional, for simulation variation |
| weight_kg | float | Weight in kilograms (synthetic) | Optional, for simulation variation |

### sessions.csv

| Field | Type | Description | Values/Constraints |
|-------|------|-------------|-------------------|
| session_id | string | Unique session identifier | Format: S001, S002, etc. |
| participant_id | string | Reference to participants.csv | Must exist in participants.csv |
| data_source | string | Origin of data | "synthetic" or "real" |
| simulation_version | string | Version of simulator used | e.g., "0.1.0" |
| random_seed | integer | Random seed for reproducibility | Fixed integer |
| session_timestamp | datetime | Session start time | ISO 8601 format |
| sensor_configuration | string | Sensor setup description | e.g., "5-zone_piezo_mpu6050" |
| camera_configuration | string | Camera setup description | e.g., "front_view_1080p_30fps" (optional) |
| environment_conditions | string | Environmental notes | e.g., "indoor_lighting" (optional) |

### label_definitions.csv

| Field | Type | Description | Values/Constraints |
|-------|------|-------------|-------------------|
| label_name | string | Name of the label | e.g., "jab", "head_zone" |
| label_category | string | Category of label | "movement_class", "target_zone", "detection_status" |
| description | string | Human-readable description | Text explanation |
| annotation_rules | string | Rules for annotation | Text guidelines |
| field_type | string | Type in data pipeline | "input", "target", "metadata" |

## Annotation Tables

### annotations/events.csv

| Field | Type | Description | Values/Constraints |
|-------|------|-------------|-------------------|
| event_id | string | Unique event identifier | Format: E001, E002, etc. |
| participant_id | string | Reference to participants.csv | Must exist in participants.csv |
| session_id | string | Reference to sessions.csv | Must exist in sessions.csv |
| start_timestamp | float | Event start time in seconds | Relative to session start |
| peak_timestamp | float | Peak impact time in seconds | Relative to session start |
| end_timestamp | float | Event end time in seconds | Relative to session start |
| movement_class | string | Movement type label | See Movement Classes below |
| target_zone | string | Target zone label | See Target Zones below |
| impact_detected | boolean | Whether impact was detected | true/false |
| sensor_event_id | string | Reference to sensor event | Optional, null if no sensor event |
| vision_event_id | string | Reference to vision event | Optional, null if no vision event |
| label_confidence | float | Confidence in label (0-1) | Higher = more confident |
| data_source | string | Origin of data | "synthetic" or "real" |
| is_synthetic | boolean | Whether data is synthetic | true/false |

## Label Definitions

### Movement Classes

| Label | Description | Notes |
|-------|-------------|-------|
| jab | Straight punch with lead hand | Front hand strike |
| cross | Straight punch with rear hand | Rear hand strike |
| hook | Horizontal punch | Lead or rear hook |
| roundhouse_kick | Circular kick | Kicking technique |
| defensive_movement | Evasive action | Blocking, dodging, etc. |
| footwork_movement | Positioning change | Steps, pivots, etc. |
| no_action | No intentional movement | Background, idle |

### Target Zones

| Label | Description | Notes |
|-------|-------------|-------|
| head_zone | Head/target head area | Upper target |
| left_side_zone | Left side of body | Lateral target |
| right_side_zone | Right side of body | Lateral target |
| chest_zone | Chest/torso area | Central target |
| waist_zone | Waist/abdominal area | Lower central target |
| no_impact | No impact detected | Background, miss |

### Detection Status

| Label | Description | Notes |
|-------|-------------|-------|
| detected | Event successfully detected | Confirmed by system |
| missed | Event not detected | False negative |
| false_positive | Detection without real event | False trigger |
| uncertain | Detection confidence low | Ambiguous case |

## Raw Sensor Data

### Piezoelectric Waveforms

**File Format**: CSV or compressed NumPy (.npz)

**Fields per sample**:
- `timestamp`: float, time in seconds relative to event start
- `channel_0`: float, piezo voltage from zone 0 (volts or ADC units)
- `channel_1`: float, piezo voltage from zone 1
- `channel_2`: float, piezo voltage from zone 2
- `channel_3`: float, piezo voltage from zone 3
- `channel_4`: float, piezo voltage from zone 4
- ... (additional channels as configured)

**Units**:
- Timestamp: seconds
- Voltage: volts or normalized ADC units (0-1 or 0-4095 for 12-bit ADC)

**Sampling Frequency**: Configurable, default 2000 Hz

**Duration**: Configurable window length, typically 0.1-0.5 seconds per event

### IMU Data

**File Format**: CSV or compressed NumPy (.npz)

**Fields per sample**:
- `timestamp`: float, time in seconds
- `accel_x`: float, acceleration X-axis (m/s²)
- `accel_y`: float, acceleration Y-axis (m/s²)
- `accel_z`: float, acceleration Z-axis (m/s²)
- `gyro_x`: float, angular velocity X-axis (rad/s)
- `gyro_y`: float, angular velocity Y-axis (rad/s)
- `gyro_z`: float, angular velocity Z-axis (rad/s)

**Units**:
- Timestamp: seconds
- Acceleration: m/s² (including gravity)
- Angular velocity: rad/s

**Sampling Frequency**: Configurable, typically 100-500 Hz

### Smart Mat Data

**File Format**: CSV

**Fields per event**:
- `timestamp`: float, time in seconds
- `zone_id`: string, mat zone identifier (e.g., "zone_A1", "zone_B2")
- `foot_side`: string, "left" or "right" or "unknown"
- `pressure_level`: float, normalized pressure (0-1)
- `dwell_time`: float, time spent in zone (seconds)
- `is_transition`: boolean, true if entering new zone

**Units**:
- Timestamp: seconds
- Pressure: normalized (0 = no pressure, 1 = max pressure)
- Dwell time: seconds

## Processed Data

### Pose Landmarks

**File Format**: CSV or NumPy (.npz)

**Fields per frame**:
- `frame_id`: integer, frame number
- `timestamp`: float, time in seconds
- `landmark_x_0`: float, X coordinate of landmark 0 (normalized 0-1)
- `landmark_y_0`: float, Y coordinate of landmark 0 (normalized 0-1)
- `landmark_vis_0`: float, visibility/confidence of landmark 0 (0-1)
- ... (repeated for all 33 MediaPipe landmarks or YOLO keypoints)

**MediaPipe Landmark Indices** (33 total):
- 0: nose
- 1-10: face/eyes
- 11-12: shoulders
- 13-14: elbows
- 15-16: wrists
- 17-18: hips
- 19-20: knees
- 21-22: ankles
- 23-24: heels
- 25-26: foot index
- 27-32: additional body points

**Units**:
- Coordinates: normalized image coordinates (0-1)
- Visibility: confidence score (0-1)

### Sensor Windows

**File Format**: NumPy (.npz)

**Structure**:
- `windows`: 3D array (n_samples, n_timesteps, n_channels)
- `event_ids`: array of corresponding event IDs
- `labels`: array of movement class labels
- `zones`: array of target zone labels

**Dimensions**:
- n_samples: number of extracted windows
- n_timesteps: fixed window length (e.g., 500 samples)
- n_channels: number of sensor channels (e.g., 5 piezo + 6 IMU = 11)

### Extracted Features

**File Format**: CSV

**Piezo Features**:
- `event_id`: string, reference to event
- `max_amplitude`: float, maximum absolute amplitude (volts)
- `peak_to_peak`: float, peak-to-peak amplitude (volts)
- `rms`: float, root mean square (volts)
- `signal_energy`: float, integrated energy (volts²·s)
- `signal_integral`: float, absolute area (volts·s)
- `rise_time`: float, time from 10% to 90% of peak (s)
- `decay_time`: float, time from 90% to 10% of peak (s)
- `pulse_duration`: float, duration above threshold (s)
- `n_peaks`: integer, number of detected peaks
- `dominant_freq`: float, dominant frequency (Hz)
- `spectral_centroid`: float, spectral centroid (Hz)
- `spectral_bandwidth`: float, spectral bandwidth (Hz)
- `snr_estimate`: float, signal-to-noise ratio estimate (dB)
- `channel_ratio_0_1`: float, amplitude ratio channel 0 / channel 1
- `time_diff_peak_0_1`: float, time difference between peaks (s)

**IMU Features**:
- `event_id`: string, reference to event
- `accel_mean_x`, `accel_mean_y`, `accel_mean_z`: float, mean acceleration (m/s²)
- `accel_std_x`, `accel_std_y`, `accel_std_z`: float, std acceleration (m/s²)
- `accel_magnitude_mean`: float, mean acceleration magnitude (m/s²)
- `accel_magnitude_max`: float, max acceleration magnitude (m/s²)
- `accel_rms`: float, RMS acceleration (m/s²)
- `gyro_mean_x`, `gyro_mean_y`, `gyro_mean_z`: float, mean angular velocity (rad/s)
- `gyro_std_x`, `gyro_std_y`, `gyro_std_z`: float, std angular velocity (rad/s)
- `gyro_magnitude_max`: float, max angular velocity magnitude (rad/s)
- `jerk_max`: float, maximum jerk (m/s³)
- `window_energy`: float, total window energy

**Smart Mat Features**:
- `event_id`: string, reference to event
- `current_zone`: string, zone identifier
- `n_transitions`: integer, number of zone changes
- `dwell_time_mean`: float, average dwell time (s)
- `dwell_time_std`: float, std of dwell time (s)
- `left_balance`: float, time on left foot (0-1)
- `right_balance`: float, time on right foot (0-1)
- `stance_width`: float, estimated stance width (normalized)

**Pose Features**:
- `event_id`: string, reference to event
- `left_elbow_angle`: float, angle in degrees
- `right_elbow_angle`: float, angle in degrees
- `left_shoulder_angle`: float, angle in degrees
- `right_shoulder_angle`: float, angle in degrees
- `left_knee_angle`: float, angle in degrees
- `right_knee_angle`: float, angle in degrees
- `wrist_distance`: float, distance between wrists (normalized)
- `stance_width`: float, distance between ankles (normalized)
- `wrist_velocity_mean`: float, mean wrist velocity (normalized/s)
- `wrist_displacement_total`: float, total wrist displacement (normalized)

## Split Files

### train.csv, validation.csv, test.csv

| Field | Type | Description |
|-------|------|-------------|
| event_id | string | Unique event identifier |
| participant_id | string | Participant group identifier |
| session_id | string | Session group identifier |
| movement_class | string | Movement label |
| target_zone | string | Target zone label |
| data_source | string | "synthetic" or "real" |
| is_synthetic | boolean | Synthetic flag |

**Splitting Rules**:
- All events from a participant are in the same split
- All events from a session are in the same split
- No leakage between train/validation/test
- Stratified by class where possible

## Model Outputs

### Predictions

**File Format**: CSV

| Field | Type | Description |
|-------|------|-------------|
| event_id | string | Reference event |
| model_name | string | Model identifier |
| predicted_class | string | Predicted movement class |
| predicted_zone | string | Predicted target zone (optional) |
| confidence | float | Prediction confidence (0-1) |
| prediction_time | float | Inference time (seconds) |

### Metrics

**File Format**: CSV or JSON

Fields vary by metric type. See evaluation module for details.

## Timestamp Conventions

- All timestamps are in seconds unless otherwise specified
- Session timestamps are absolute (datetime or epoch)
- Event timestamps are relative to session start
- Sensor timestamps are relative to event start or session start
- Clock offsets between modalities must be recorded and compensated

## Missing Values

- Missing numeric values: `NaN` (Not a Number)
- Missing categorical values: empty string or `null`
- Missing boolean values: `null`
- Missing timestamps: `NaN`

## Units Summary

| Quantity | Unit | Notes |
|----------|------|-------|
| Time | seconds (s) | All timestamps |
| Voltage | volts (V) or ADC units | Piezo signals |
| Acceleration | meters per second squared (m/s²) | IMU |
| Angular velocity | radians per second (rad/s) | IMU gyroscope |
| Frequency | Hertz (Hz) | Spectral features |
| Angle | degrees (°) | Joint angles |
| Distance | normalized or meters | Depends on context |
| Pressure | normalized (0-1) | Smart mat |
| Confidence | unitless (0-1) | Probability/confidence |

## Data Provenance

Every synthetic data record must include:
- `data_source`: "synthetic"
- `is_synthetic`: true
- `simulation_version`: version string
- `random_seed`: integer used for generation
- `participant_id`: simulated participant
- `session_id`: simulated session
- `event_id`: unique event identifier
- `timestamp`: generation timestamp
- `label_confidence`: confidence in ground truth label

## Notes

1. **Synthetic Data**: All current data is synthetic. Real data will have additional provenance fields (e.g., actual participant consent, recording conditions).

2. **Normalization**: Many features are normalized to [0,1] for model training. Original units should be preserved in raw data.

3. **Coordinate Systems**: Pose coordinates are image-relative (0-1). Physical coordinates require calibration.

4. **Sensor Calibration**: Voltage values are relative until calibrated against a physical reference.

5. **Label Leakage**: Target labels (movement_class, target_zone) must never be used as input features during training.

6. **Versioning**: Data schemas may evolve. Version numbers should track changes.
