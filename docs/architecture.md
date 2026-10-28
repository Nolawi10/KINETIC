# KINETIC Software Architecture

## Overview

KINETIC is a modular, reproducible AI/ML research platform for sports-intelligence using multimodal sensor fusion. The architecture separates data generation, preprocessing, feature extraction, modeling, fusion, evaluation, and reporting into distinct components.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Input Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Piezo Sensors│  │ IMU (MPU6050)│  │ Smart Mat    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐                                                │
│  │ Camera        │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Simulation Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Piezo Simulator  │  │ IMU Simulator    │  │ Mat Simulator│ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Metadata Generator (participants, sessions, annotations) │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Preprocessing Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Signal Filtering │  │ Baseline Corr.  │  │ Event Detect │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Window Extraction & Normalization                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Feature Extraction Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Piezo Features   │  │ IMU Features     │  │ Mat Features │ │
│  │ - Amplitude      │  │ - Acceleration   │  │ - Zone trans │ │
│  │ - Energy         │  │ - Angular vel.    │  │ - Dwell time │ │
│  │ - Spectral       │  │ - Magnitude      │  │ - Sequence   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Pose Feature Extraction (if vision available)             │  │
│  │ - Joint angles, trajectories, timing                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Model Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Sensor-Based Classifiers                                  │  │
│  │ - DummyClassifier (baseline)                              │  │
│  │ - Logistic Regression                                      │  │
│  │ - K-Nearest Neighbors                                     │  │
│  │ - Support Vector Machine                                  │  │
│  │ - Decision Tree                                           │  │
│  │ - Random Forest (primary baseline)                        │  │
│  │ - Extra Trees                                              │  │
│  │ - XGBoost                                                  │  │
│  │ - LightGBM                                                 │  │
│  │ - HistGradientBoostingClassifier                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Neural Networks (optional)                                │  │
│  │ - MLP on engineered features                              │  │
│  │ - 1D-CNN on raw sensor windows                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Vision-Based Classifiers                                  │  │
│  │ - Pretrained pose estimator (YOLO/MediaPipe)              │  │
│  │ - Random Forest on pose features                          │  │
│  │ - MLP on pose features                                    │  │
│  │ - KNN baseline                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fusion Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Event Matching   │  │ Timestamp Align  │  │ Confidence   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Fusion Strategies                                         │  │
│  │ - Sensor-only                                             │  │
│  │ - Vision-only                                             │  │
│  │ - Simple decision-level fusion                            │  │
│  │ - Confidence-weighted fusion                              │  │
│  │ - Learned fusion model (if sufficient data)              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Performance & Coaching Layer                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Performance      │  │ Adaptive Coach   │  │ Drill Select │ │
│  │ Metrics          │  │ - Rule-based     │  │ - Difficulty │ │
│  │ - Reaction time  │  │ - Explainable    │  │ - Progression│ │
│  │ - Accuracy       │  │                  │  │              │ │
│  │ - Consistency    │  │                  │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Evaluation & Reporting                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Metrics Calc     │  │ Visualization     │  │ Report Gen   │ │
│  │ - Macro-F1       │  │ - 25+ figures    │  │ - Markdown    │ │
│  │ - Per-class      │  │ - Scientific     │  │ - HTML        │ │
│  │ - Confusion      │  │   quality        │  │              │ │
│  │ - Latency        │  │                  │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Data Generation
- Synthetic simulators generate piezo waveforms, IMU streams, and mat events
- Metadata tables track participants, sessions, and event annotations
- All synthetic data marked with `data_source=synthetic` and `is_synthetic=true`

### 2. Preprocessing Pipeline
- Raw signals filtered (band-pass, noise reduction)
- Baseline correction and detrending
- Event detection and segmentation
- Fixed-length window extraction with configurable context
- Normalization using training-set statistics only

### 3. Feature Extraction
- Time-domain features (amplitude, energy, duration, peaks)
- Frequency-domain features (spectral centroid, bandwidth, band energies)
- Cross-channel features (ratios, timing differences)
- Pose features (joint angles, distances, trajectories)

### 4. Model Training
- Group-aware train/validation/test splits (by participant or session)
- Baseline models trained first (DummyClassifier, Random Forest)
- Advanced models compared fairly on same splits
- Hyperparameter tuning on validation, final evaluation on test

### 5. Fusion
- Independent predictions from sensor and vision models
- Event matching using timestamp tolerance
- Fusion strategies compared: sensor-only, vision-only, combined
- Missing-modality fallback and uncertainty states

### 6. Evaluation
- Comprehensive metrics (accuracy, macro-F1, per-class, latency)
- Robustness tests (noise, jitter, missing channels, occlusions)
- Statistical confidence intervals where appropriate
- All metrics generated from actual execution

### 7. Reporting
- 25+ publication-quality figures
- Machine-readable CSV/JSON results
- Comprehensive Markdown/HTML report
- Clear separation of synthetic vs. real results

## Module Organization

### `src/kinetic/simulation/`
- Synthetic piezo waveform generator
- IMU stream simulator
- Smart-mat event simulator
- Metadata and annotation generators
- Configuration-driven parameter control

### `src/kinetic/sensors/`
- Sensor data loading and validation
- Multi-channel synchronization
- Data format conversion (CSV, NumPy)

### `src/kinetic/preprocessing/`
- Signal filtering (low-pass, high-pass, band-pass)
- Baseline correction
- Event detection algorithms
- Window extraction
- Normalization and scaling

### `src/kinetic/features/`
- Piezo feature extraction
- IMU feature extraction
- Smart-mat feature extraction
- Pose feature extraction
- Feature validation and documentation

### `src/kinetic/vision/`
- Pose estimation interface (YOLO/MediaPipe)
- Landmark extraction and validation
- Pose feature calculation
- Video processing pipeline

### `src/kinetic/models/`
- Classical ML model wrappers
- Neural network models (MLP, 1D-CNN)
- Model training and validation
- Model serialization and loading

### `src/kinetic/fusion/`
- Event matching algorithms
- Timestamp alignment
- Fusion strategies (rule-based, learned)
- Missing-modality handling

### `src/kinetic/evaluation/`
- Metrics calculation
- Confusion matrices
- Latency benchmarking
- Robustness testing
- Statistical analysis

### `src/kinetic/coaching/`
- Rule-based adaptive coach
- Performance measurement
- Drill selection logic
- Explainable recommendations

### `src/kinetic/visualization/`
- Figure generation (matplotlib/seaborn)
- Signal visualization
- Model performance plots
- Fusion comparison plots
- Scientific-quality export (PNG, PDF/SVG)

### `src/kinetic/reporting/`
- Report generation (Markdown, HTML)
- Results table generation
- Experiment manifest
- Reproducibility documentation

### `src/kinetic/utils/`
- Configuration management
- Logging utilities
- Random seed control
- File I/O helpers
- Common utilities

## Key Design Principles

### 1. Modularity
Each component has a clear interface and can be tested independently. Models can be swapped without changing the data pipeline.

### 2. Reproducibility
- Fixed random seeds
- Versioned configurations
- Logged parameters
- Saved preprocessing pipelines
- Documented data provenance

### 3. Leakage Prevention
- Group-aware splitting (by participant/session)
- No data from training groups in test set
- Labels separated from inputs
- Preprocessing fit on training only

### 4. Fair Comparison
- Same splits for all models
- Same evaluation protocol
- Same metrics
- Baseline models required

### 5. Synthetic Data Integrity
- Clear synthetic provenance
- No claims of real-world accuracy
- Documented simulator assumptions
- Configurable parameter ranges

### 6. Extensibility
- Easy to add new models
- Easy to add new features
- Easy to add new fusion strategies
- Plugin-style architecture

## Configuration Management

All major parameters controlled through YAML files in `configs/`:
- `simulation.yaml`: Synthetic data generation parameters
- `features.yaml`: Feature extraction settings
- `experiments.yaml`: Model training and evaluation parameters

## Testing Strategy

- Unit tests for individual components
- Integration tests for pipelines
- Smoke test for end-to-end execution
- Leakage detection tests
- Reproducibility tests with fixed seeds

## Deployment Considerations

- Models serialized with joblib
- Preprocessing pipelines saved
- Configuration files versioned
- Clear hardware requirements documented
- Inference latency benchmarked

## Limitations

- Synthetic data only (no real hardware yet)
- 2D pose estimation (not 3D biomechanics)
- Relative sensor amplitudes (not calibrated forces)
- No medical or injury diagnosis claims
- Generalization limited to simulator assumptions
