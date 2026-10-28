# Requirements Traceability Matrix

This document maps each requirement from the KINETIC AI/ML Blueprint PDF to its implementation file, test, and current status.

## Legend

- **Status**: `pending` | `in_progress` | `completed` | `blocked` | `deferred`
- **Priority**: `critical` | `high` | `medium` | `low`
- **Source**: PDF section reference

---

## 1. System Architecture Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 1.1 | Camera input with pose estimation pipeline | Section 2 | `src/kinetic/vision/pose_estimator.py` | `tests/test_vision.py` | pending | high |
| 1.2 | Physical sensor input (piezo, IMU, mat) | Section 2 | `src/kinetic/sensors/` | `tests/test_sensors.py` | pending | high |
| 1.3 | Model layer with independent classifiers | Section 2 | `src/kinetic/models/` | `tests/test_models.py` | pending | high |
| 1.4 | Sensor-vision fusion component | Section 2 | `src/kinetic/fusion/` | `tests/test_fusion.py` | pending | high |
| 1.5 | Performance measurement engine | Section 2 | `src/kinetic/evaluation/performance.py` | `tests/test_evaluation.py` | pending | high |
| 1.6 | Adaptive training coach | Section 2 | `src/kinetic/coaching/` | `tests/test_coaching.py` | pending | high |

---

## 2. Synthetic Data Generation Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 2.1 | Configurable piezoelectric waveform simulator | Prompt | `src/kinetic/simulation/piezo_simulator.py` | `tests/test_piezo_simulator.py` | pending | critical |
| 2.2 | Target zone labels (head, left_side, right_side, chest, waist, no_impact) | Prompt | `src/kinetic/simulation/piezo_simulator.py` | `tests/test_piezo_simulator.py` | pending | critical |
| 2.3 | Movement class labels (jab, cross, hook, roundhouse_kick, defensive, footwork, no_action) | Prompt | `src/kinetic/simulation/` | `tests/test_simulation.py` | pending | critical |
| 2.4 | Damped-oscillation waveform with configurable parameters | Prompt | `src/kinetic/simulation/piezo_simulator.py` | `tests/test_piezo_simulator.py` | pending | critical |
| 2.5 | Multi-channel piezo simulation with cross-talk | Prompt | `src/kinetic/simulation/piezo_simulator.py` | `tests/test_piezo_simulator.py` | pending | high |
| 2.6 | Configurable sampling frequency (default 2000 Hz) | Prompt | `src/kinetic/simulation/piezo_simulator.py` | `tests/test_piezo_simulator.py` | pending | high |
| 2.7 | Synthetic IMU stream (accelerometer + gyroscope) | Prompt | `src/kinetic/simulation/imu_simulator.py` | `tests/test_imu_simulator.py` | pending | high |
| 2.8 | Smart-mat zone event simulation | Prompt | `src/kinetic/simulation/mat_simulator.py` | `tests/test_mat_simulator.py` | pending | high |
| 2.9 | Synchronized multi-modal data generation | Prompt | `src/kinetic/simulation/data_generator.py` | `tests/test_data_generator.py` | pending | critical |
| 2.10 | Realistic variation across participants, sessions, intensities | Prompt | `src/kinetic/simulation/` | `tests/test_simulation.py` | pending | high |
| 2.11 | Synthetic data provenance (data_source, is_synthetic, simulation_version, random_seed) | Prompt | `src/kinetic/simulation/` | `tests/test_simulation.py` | pending | critical |
| 2.12 | participants.csv metadata table | Section 14 | `src/kinetic/simulation/metadata_generator.py` | `tests/test_metadata.py` | pending | high |
| 2.13 | sessions.csv metadata table | Section 14 | `src/kinetic/simulation/metadata_generator.py` | `tests/test_metadata.py` | pending | high |
| 2.14 | label_definitions.csv metadata table | Section 14 | `src/kinetic/simulation/metadata_generator.py` | `tests/test_metadata.py` | pending | high |
| 2.15 | annotations/events.csv table | Section 14 | `src/kinetic/simulation/annotation_generator.py` | `tests/test_annotations.py` | pending | high |

---

## 3. Preprocessing and Feature Engineering Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 3.1 | Baseline correction | Section 15 | `src/kinetic/preprocessing/baseline.py` | `tests/test_preprocessing.py` | pending | high |
| 3.2 | Detrending | Section 15 | `src/kinetic/preprocessing/detrending.py` | `tests/test_preprocessing.py` | pending | medium |
| 3.3 | Configurable filtering (low-pass, high-pass, band-pass) | Section 15 | `src/kinetic/preprocessing/filtering.py` | `tests/test_preprocessing.py` | pending | high |
| 3.4 | Noise estimation | Section 15 | `src/kinetic/preprocessing/noise.py` | `tests/test_preprocessing.py` | pending | medium |
| 3.5 | Event detection and segmentation | Section 15 | `src/kinetic/preprocessing/event_detection.py` | `tests/test_preprocessing.py` | pending | high |
| 3.6 | Fixed-length window extraction | Section 15 | `src/kinetic/preprocessing/windowing.py` | `tests/test_preprocessing.py` | pending | high |
| 3.7 | Amplitude normalization | Section 15 | `src/kinetic/preprocessing/normalization.py` | `tests/test_preprocessing.py` | pending | high |
| 3.8 | Peak detection | Section 15 | `src/kinetic/preprocessing/peaks.py` | `tests/test_preprocessing.py` | pending | medium |
| 3.9 | Piezo features (amplitude, energy, rise/decay time, spectral, etc.) | Prompt | `src/kinetic/features/piezo_features.py` | `tests/test_piezo_features.py` | pending | high |
| 3.10 | IMU features (means, std, magnitude, jerk, frequency-domain) | Prompt | `src/kinetic/features/imu_features.py` | `tests/test_imu_features.py` | pending | high |
| 3.11 | Smart-mat features (zone, transitions, dwell time, sequence) | Prompt | `src/kinetic/features/mat_features.py` | `tests/test_mat_features.py` | pending | high |
| 3.12 | Feature documentation and units | Prompt | `docs/data_dictionary.md` | N/A | pending | high |
| 3.13 | Label leakage prevention | Prompt | `src/kinetic/features/` | `tests/test_feature_leakage.py` | pending | critical |

---

## 4. Dataset Splitting Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 4.1 | Participant- or session-grouped train/validation/test splits | Section 15 | `src/kinetic/preprocessing/splits.py` | `tests/test_splits.py` | pending | critical |
| 4.2 | Stratified group-aware splitting | Section 15 | `src/kinetic/preprocessing/splits.py` | `tests/test_splits.py` | pending | high |
| 4.3 | Split before window generation | Section 15 | `scripts/create_splits.py` | `tests/test_splits.py` | pending | critical |
| 4.4 | Group leakage detection tests | Prompt | `tests/test_splits.py` | N/A | pending | critical |
| 4.5 | train.csv, validation.csv, test.csv files | Section 14 | `scripts/create_splits.py` | `tests/test_splits.py` | pending | high |

---

## 5. Model 1: Random Forest Baseline Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 5.1 | Random Forest classifier for sensor features | Section 3 | `src/kinetic/models/random_forest.py` | `tests/test_models.py` | pending | critical |
| 5.2 | Feature extraction for RF (amplitude, energy, duration, acceleration, angular velocity) | Section 3 | `src/kinetic/features/` | `tests/test_features.py` | pending | high |
| 5.3 | Group-aware training workflow | Section 3 | `scripts/train_models.py` | `tests/test_training.py` | pending | critical |
| 5.4 | Validation-based hyperparameter tuning | Section 3 | `src/kinetic/models/random_forest.py` | `tests/test_models.py` | pending | high |
| 5.5 | Held-out test evaluation | Section 3 | `scripts/evaluate_models.py` | `tests/test_evaluation.py` | pending | critical |
| 5.6 | Model serialization and loading | Section 3 | `src/kinetic/models/utils.py` | `tests/test_model_serialization.py` | pending | high |

---

## 6. Model 2: XGBoost Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 6.1 | XGBoost classifier for sensor features | Section 4 | `src/kinetic/models/xgboost_model.py` | `tests/test_models.py` | pending | high |
| 6.2 | Same dataset and splits as Random Forest | Section 4 | `scripts/train_models.py` | `tests/test_training.py` | pending | critical |
| 6.3 | Hyperparameter tuning (depth, learning rate, rounds, regularization) | Section 4 | `src/kinetic/models/xgboost_model.py` | `tests/test_models.py` | pending | high |
| 6.4 | Early stopping support | Section 4 | `src/kinetic/models/xgboost_model.py` | `tests/test_models.py` | pending | medium |
| 6.5 | Comparison with Random Forest (macro-F1, per-class recall, latency, model size) | Section 4 | `scripts/evaluate_models.py` | `tests/test_evaluation.py` | pending | critical |

---

## 7. Model 3: Neural Networks (1D-CNN) Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 7.1 | 1D-CNN for raw sensor signals | Section 5 | `src/kinetic/models/cnn_1d.py` | `tests/test_models.py` | pending | medium |
| 7.2 | Input: raw synchronized sensor windows (piezo + accelerometer + gyroscope) | Section 5 | `src/kinetic/preprocessing/windowing.py` | `tests/test_preprocessing.py` | pending | medium |
| 7.3 | Training with cross-entropy loss and Adam optimizer | Section 5 | `src/kinetic/models/cnn_1d.py` | `tests/test_models.py` | pending | medium |
| 7.4 | Early stopping based on validation macro-F1 | Section 5 | `src/kinetic/models/cnn_1d.py` | `tests/test_models.py` | pending | medium |
| 7.5 | Comparison with Random Forest and XGBoost on same splits | Section 5 | `scripts/evaluate_models.py` | `tests/test_evaluation.py` | pending | medium |
| 7.6 | Inference time and memory benchmarking on target hardware | Section 5 | `src/kinetic/evaluation/latency.py` | `tests/test_latency.py` | pending | low |

---

## 8. Model 4: Pose Estimation Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 8.1 | Pretrained pose estimator (YOLO Pose or MediaPipe) | Section 6 | `src/kinetic/vision/pose_estimator.py` | `tests/test_vision.py` | pending | high |
| 8.2 | Landmark extraction with confidence values | Section 6 | `src/kinetic/vision/pose_estimator.py` | `tests/test_vision.py` | pending | high |
| 8.3 | Coordinate normalization relative to torso/hip | Section 6 | `src/kinetic/vision/pose_normalization.py` | `tests/test_vision.py` | pending | high |
| 8.4 | Derived pose features (joint angles, distances, trajectories, timing) | Section 6 | `src/kinetic/features/pose_features.py` | `tests/test_pose_features.py` | pending | high |
| 8.5 | Missing landmark handling | Section 6 | `src/kinetic/vision/pose_estimator.py` | `tests/test_vision.py` | pending | high |
| 8.6 | 2D limitation documentation (not 3D biomechanics) | Section 6 | `docs/limitations.md` | N/A | pending | high |

---

## 9. Model 5: Pose-Based Classification Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 9.1 | Random Forest classifier on pose features | Section 7 | `src/kinetic/models/pose_rf.py` | `tests/test_models.py` | pending | high |
| 9.2 | MLP/ANN classifier on pose features | Section 7 | `src/kinetic/models/pose_mlp.py` | `tests/test_models.py` | pending | high |
| 9.3 | Group-aware splits for pose data | Section 7 | `scripts/create_splits.py` | `tests/test_splits.py` | pending | high |
| 9.4 | Comparison RF vs MLP (macro-F1, per-class recall, inference time) | Section 7 | `scripts/evaluate_models.py` | `tests/test_evaluation.py` | pending | high |
| 9.5 | Temporal movement models (1D-CNN or RNN) - optional extension | Section 7 | `src/kinetic/models/temporal_pose.py` | `tests/test_models.py` | pending | low |

---

## 10. Model 6: KNN Baseline Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 10.1 | KNN classifier on pose features | Section 8 | `src/kinetic/models/knn.py` | `tests/test_models.py` | pending | low |
| 10.2 | Feature normalization for distance-based learning | Section 8 | `src/kinetic/preprocessing/normalization.py` | `tests/test_preprocessing.py` | pending | low |
| 10.3 | K value selection via validation |Section 8 | `src/kinetic/models/knn.py` | `tests/test_models.py` | pending | low |
| 10.4 | Evaluation on same held-out participants | Section 8 | `scripts/evaluate_models.py` | `tests/test_evaluation.py` | pending | low |

---

## 11. Model 7: PINNs Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 11.1 | Physics-informed neural network research extension | Section 9 | `src/kinetic/models/pinn.py` | `tests/test_models.py` | pending | deferred | low |
| 11.2 | Physical constraint loss function | Section 9 | `src/kinetic/models/pinn.py` | `tests/test_models.py` | pending | deferred | low |
| 11.3 | Comparison with conventional methods | Section 9 | `scripts/evaluate_models.py` | `tests/test_evaluation.py` | pending | deferred | low |

---

## 12. Model 8: Sensor-Vision Fusion Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 12.1 | Timestamp alignment between camera and sensors | Section 10 | `src/kinetic/fusion/timestamp_alignment.py` | `tests/test_fusion.py` | pending | critical |
| 12.2 | Independent predictions from sensor and vision models | Section 10 | `src/kinetic/fusion/predictions.py` | `tests/test_fusion.py` | pending | critical |
| 12.3 | Event matching with configurable time tolerance | Section 10 | `src/kinetic/fusion/event_matching.py` | `tests/test_fusion.py` | pending | critical |
| 12.4 | Rule-based fusion (unmatched impacts, shadowboxing, consistent predictions) | Section 10 | `src/kinetic/fusion/rule_based.py` | `tests/test_fusion.py` | pending | critical |
| 12.5 | Learned fusion classifier (if sufficient data) | Section 10 | `src/kinetic/fusion/learned_fusion.py` | `tests/test_fusion.py` | pending | medium |
| 12.6 | Main experiment: sensor-only vs vision-only vs fusion | Section 10 | `scripts/run_fusion_experiments.py` | `tests/test_fusion.py` | pending | critical |
| 12.7 | Evaluation: macro-F1, per-class recall, false detections, event matching | Section 10 | `src/kinetic/evaluation/fusion_metrics.py` | `tests/test_evaluation.py` | pending | critical |
| 12.8 | Missing-modality fallback and uncertainty state | Section 10 | `src/kinetic/fusion/fallback.py` | `tests/test_fusion.py` | pending | high |

---

## 13. Model 9: Adaptive Coaching Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 13.1 | Rule-based adaptive controller | Section 11 | `src/kinetic/coaching/rule_based.py` | `tests/test_coaching.py` | pending | high |
| 13.2 | Performance measurement (reaction time, accuracy, consistency) | Section 11 | `src/kinetic/evaluation/performance.py` | `tests/test_evaluation.py` | pending | high |
| 13.3 | Drill selection rules (slow reaction, wrong direction, inconsistent footwork, etc.) | Section 11 | `src/kinetic/coaching/drill_selector.py` | `tests/test_coaching.py` | pending | high |
| 13.4 | Difficulty adjustment logic | Section 11 | `src/kinetic/coaching/difficulty.py` | `tests/test_coaching.py` | pending | high |
| 13.5 | Explainable drill recommendations | Section 11 | `src/kinetic/coaching/explanation.py` | `tests/test_coaching.py` | pending | high |
| 13.6 | Drill attempt dataset storage | Section 11 | `src/kinetic/coaching/storage.py` | `tests/test_coaching.py` | pending | medium |
| 13.7 | Future: contextual bandit or RL controller (deferred) | Section 11 | `src/kinetic/coaching/rl_controller.py` | `tests/test_coaching.py` | pending | deferred | low |

---

## 14. Evaluation Metrics Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 14.1 | Accuracy calculation | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | high |
| 14.2 | Balanced accuracy | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | high |
| 14.3 | Macro precision, recall, F1 | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | critical |
| 14.4 | Weighted F1 | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | high |
| 14.5 | Per-class precision, recall, F1 | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | critical |
| 14.6 | Confusion matrix | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | critical |
| 14.7 | False-trigger rate per unit time | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | high |
| 14.8 | Missed-event rate | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | high |
| 14.9 | ROC-AUC and PR-AUC (where appropriate) | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | medium |
| 14.10 | Brier score or calibration error | Section 15 | `src/kinetic/evaluation/metrics.py` | `tests/test_metrics.py` | pending | medium |
| 14.11 | Training duration measurement | Section 15 | `src/kinetic/evaluation/latency.py` | `tests/test_latency.py` | pending | high |
| 14.12 | Inference latency measurement (with warm-up, documented procedure) | Section 15 | `src/kinetic/evaluation/latency.py` | `tests/test_latency.py` | pending | high |
| 14.13 | Model size measurement | Section 15 | `src/kinetic/evaluation/latency.py` | `tests/test_latency.py` | pending | high |
| 14.14 | Memory usage measurement | Section 15 | `src/kinetic/evaluation/latency.py` | `tests/test_latency.py` | pending | medium |
| 14.15 | Group-aware bootstrap confidence intervals | Section 15 | `src/kinetic/evaluation/statistical.py` | `tests/test_evaluation.py` | pending | medium |

---

## 15. Visualization Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 15.1 | Example raw piezo waveforms for different event types | Prompt | `src/kinetic/visualization/signal_plots.py` | `tests/test_visualization.py` | pending | high |
| 15.2 | Piezo waveform overlays for target zones | Prompt | `src/kinetic/visualization/signal_plots.py` | `tests/test_visualization.py` | pending | high |
| 15.3 | Multi-channel response to one event | Prompt | `src/kinetic/visualization/signal_plots.py` | `tests/test_visualization.py` | pending | high |
| 15.4 | Impact amplitude distributions by target zone | Prompt | `src/kinetic/visualization/distributions.py` | `tests/test_visualization.py` | pending | high |
| 15.5 | Rise-time and decay-time distributions | Prompt | `src/kinetic/visualization/distributions.py` | `tests/test_visualization.py` | pending | high |
| 15.6 | Time-frequency or spectrogram analysis | Prompt | `src/kinetic/visualization/spectral.py` | `tests/test_visualization.py` | pending | medium |
| 15.7 | Piezo noise and SNR comparison | Prompt | `src/kinetic/visualization/signal_plots.py` | `tests/test_visualization.py` | pending | medium |
| 15.8 | Simulated IMU acceleration and gyroscope traces | Prompt | `src/kinetic/visualization/signal_plots.py` | `tests/test_visualization.py` | pending | high |
| 15.9 | Smart-mat zone-transition timeline | Prompt | `src/kinetic/visualization/mat_plots.py` | `tests/test_visualization.py` | pending | high |
| 15.10 | Event-class distribution | Prompt | `src/kinetic/visualization/distributions.py` | `tests/test_visualization.py` | pending | high |
| 15.11 | Target-zone class distribution | Prompt | `src/kinetic/visualization/distributions.py` | `tests/test_visualization.py` | pending | high |
| 15.12 | Feature correlation heatmap | Prompt | `src/kinetic/visualization/correlation.py` | `tests/test_visualization.py` | pending | high |
| 15.13 | Model comparison by macro-F1 | Prompt | `src/kinetic/visualization/model_comparison.py` | `tests/test_visualization.py` | pending | critical |
| 15.14 | Model comparison by balanced accuracy | Prompt | `src/kinetic/visualization/model_comparison.py` | `tests/test_visualization.py` | pending | critical |
| 15.15 | Model comparison by inference latency | Prompt | `src/kinetic/visualization/model_comparison.py` | `tests/test_visualization.py` | pending | high |
| 15.16 | Model comparison by model size | Prompt | `src/kinetic/visualization/model_comparison.py` | `tests/test_visualization.py` | pending | high |
| 15.17 | Confusion matrix for best validated model | Prompt | `src/kinetic/visualization/confusion_matrix.py` | `tests/test_visualization.py` | pending | critical |
| 15.18 | Per-class F1 comparison | Prompt | `src/kinetic/visualization/per_class.py` | `tests/test_visualization.py` | pending | critical |
| 15.19 | Per-class recall comparison | Prompt | `src/kinetic/visualization/per_class.py` | `tests/test_visualization.py` | pending | critical |
| 15.20 | Precision-recall curves | Prompt | `src/kinetic/visualization/pr_curves.py` | `tests/test_visualization.py` | pending | medium |
| 15.21 | ROC curves | Prompt | `src/kinetic/visualization/roc_curves.py` | `tests/test_visualization.py` | pending | medium |
| 15.22 | Learning curves for selected models | Prompt | `src/kinetic/visualization/learning_curves.py` | `tests/test_visualization.py` | pending | medium |
| 15.23 | Hyperparameter search results | Prompt | `src/kinetic/visualization/hyperparams.py` | `tests/test_visualization.py` | pending | medium |
| 15.24 | Feature importance for tree-based model | Prompt | `src/kinetic/visualization/feature_importance.py` | `tests/test_visualization.py` | pending | high |
| 15.25 | Permutation importance on held-out data | Prompt | `src/kinetic/visualization/feature_importance.py` | `tests/test_visualization.py` | pending | high |
| 15.26 | Calibration curve for probabilistic model | Prompt | `src/kinetic/visualization/calibration.py` | `tests/test_visualization.py` | pending | medium |
| 15.27 | Error analysis by class and simulation profile | Prompt | `src/kinetic/visualization/error_analysis.py` | `tests/test_visualization.py` | pending | high |
| 15.28 | Sensor-only vs vision-only vs fusion comparison | Prompt | `src/kinetic/visualization/fusion_comparison.py` | `tests/test_visualization.py` | pending | critical |
| 15.29 | Performance under timestamp jitter | Prompt | `src/kinetic/visualization/robustness.py` | `tests/test_visualization.py` | pending | high |
| 15.30 | Performance under increasing sensor noise | Prompt | `src/kinetic/visualization/robustness.py` | `tests/test_visualization.py` | pending | high |
| 15.31 | Performance under dropped sensor channels | Prompt | `src/kinetic/visualization/robustness.py` | `tests/test_visualization.py` | pending | high |
| 15.32 | Performance under missing/occluded pose landmarks | Prompt | `src/kinetic/visualization/robustness.py` | `tests/test_visualization.py` | pending | high |
| 15.33 | Event timing error distribution | Prompt | `src/kinetic/visualization/timing.py` | `tests/test_visualization.py` | pending | high |
| 15.34 | False-trigger rate comparison | Prompt | `src/kinetic/visualization/event_detection.py` | `tests/test_visualization.py` | pending | high |
| 15.35 | Confidence-versus-error analysis | Prompt | `src/kinetic/visualization/confidence.py` | `tests/test_visualization.py` | pending | medium |
| 15.36 | Simulated reaction-time progression across sessions | Prompt | `src/kinetic/visualization/coaching_plots.py` | `tests/test_visualization.py` | pending | medium |
| 15.37 | Target-selection accuracy progression | Prompt | `src/kinetic/visualization/coaching_plots.py` | `tests/test_visualization.py` | pending | medium |
| 15.38 | Drill difficulty vs performance | Prompt | `src/kinetic/visualization/coaching_plots.py` | `tests/test_visualization.py` | pending | medium |
| 15.39 | Example adaptive coaching decision flow | Prompt | `src/kinetic/visualization/coaching_plots.py` | `tests/test_visualization.py` | pending | medium |
| 15.40 | System-level latency breakdown | Prompt | `src/kinetic/visualization/latency.py` | `tests/test_visualization.py` | pending | medium |
| 15.41 | Scientific-quality export (PNG, PDF/SVG) | Prompt | `src/kinetic/visualization/export.py` | `tests/test_visualization.py` | pending | high |
| 15.42 | Consistent visual theme and color palettes | Prompt | `src/kinetic/visualization/theme.py` | `tests/test_visualization.py` | pending | high |
| 15.43 | Color-vision deficiency accessibility | Prompt | `src/kinetic/visualization/theme.py` | `tests/test_visualization.py` | pending | medium |

---

## 16. Reporting Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 16.1 | model_comparison.csv | Prompt | `scripts/evaluate_models.py` | `tests/test_reporting.py` | pending | critical |
| 16.2 | per_class_metrics.csv | Prompt | `scripts/evaluate_models.py` | `tests/test_reporting.py` | pending | critical |
| 16.3 | fusion_comparison.csv | Prompt | `scripts/run_fusion_experiments.py` | `tests/test_reporting.py` | pending | critical |
| 16.4 | robustness_results.csv | Prompt | `scripts/evaluate_models.py` | `tests/test_reporting.py` | pending | high |
| 16.5 | latency_results.csv | Prompt | `scripts/evaluate_models.py` | `tests/test_reporting.py` | pending | high |
| 16.6 | experiment_manifest.json | Prompt | `scripts/generate_report.py` | `tests/test_reporting.py` | pending | critical |
| 16.7 | Comprehensive Markdown report | Prompt | `scripts/generate_report.py` | `tests/test_reporting.py` | pending | critical |
| 16.8 | HTML report (optional) | Prompt | `scripts/generate_report.py` | `tests/test_reporting.py` | pending | medium |
| 16.9 | Report sections: executive summary, research question, architecture, dataset, methods, results, limitations, reproducibility | Prompt | `scripts/generate_report.py` | `tests/test_reporting.py` | pending | critical |
| 16.10 | Clear synthetic vs real data distinction | Prompt | `scripts/generate_report.py` | `tests/test_reporting.py` | pending | critical |

---

## 17. Configuration and Reproducibility Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 17.1 | simulation.yaml configuration file | Prompt | `configs/simulation.yaml` | `tests/test_config.py` | pending | critical |
| 17.2 | features.yaml configuration file | Prompt | `configs/features.yaml` | `tests/test_config.py` | pending | high |
| 17.3 | experiments.yaml configuration file | Prompt | `configs/experiments.yaml` | `tests/test_config.py` | pending | high |
| 17.4 | Fixed random seeds | Prompt | `src/kinetic/utils/random.py` | `tests/test_reproducibility.py` | pending | critical |
| 17.5 | Logged environment details | Prompt | `src/kinetic/utils/logging.py` | `tests/test_reproducibility.py` | pending | high |
| 17.6 | Versioned simulation settings | Prompt | `src/kinetic/simulation/` | `tests/test_simulation.py` | pending | high |
| 17.7 | Explicit label mappings | Prompt | `src/kinetic/utils/labels.py` | `tests/test_labels.py` | pending | high |
| 17.8 | Small, medium, large simulation configurations | Prompt | `configs/simulation.yaml` | `tests/test_config.py` | pending | high |

---

## 18. Testing Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 18.1 | Simulator output shapes and data types | Prompt | `tests/test_piezo_simulator.py` | N/A | pending | critical |
| 18.2 | Valid class labels | Prompt | `tests/test_simulation.py` | N/A | pending | critical |
| 18.3 | Reproducibility with fixed seeds | Prompt | `tests/test_reproducibility.py` | N/A | pending | critical |
| 18.4 | Variability across different seeds | Prompt | `tests/test_simulation.py` | N/A | pending | high |
| 18.5 | Signal timestamps and units | Prompt | `tests/test_simulation.py` | N/A | pending | high |
| 18.6 | Metadata integrity | Prompt | `tests/test_metadata.py` | N/A | pending | high |
| 18.7 | Feature extraction tests | Prompt | `tests/test_features.py` | N/A | pending | high |
| 18.8 | Missing and corrupted sample handling | Prompt | `tests/test_preprocessing.py` | N/A | pending | high |
| 18.9 | Dataset splitting and group leakage | Prompt | `tests/test_splits.py` | N/A | pending | critical |
| 18.10 | Model serialization and loading | Prompt | `tests/test_model_serialization.py` | N/A | pending | high |
| 18.11 | Prediction output schema | Prompt | `tests/test_models.py` | N/A | pending | high |
| 18.12 | Fusion timestamp matching | Prompt | `tests/test_fusion.py` | N/A | pending | critical |
| 18.13 | Missing-modality behavior | Prompt | `tests/test_fusion.py` | N/A | pending | high |
| 18.14 | Adaptive coaching rules | Prompt | `tests/test_coaching.py` | N/A | pending | high |
| 18.15 | Figure generation | Prompt | `tests/test_visualization.py` | N/A | pending | high |
| 18.16 | End-to-end execution on small dataset | Prompt | `tests/test_smoke.py` | N/A | pending | critical |
| 18.17 | Smoke-test configuration for quick validation | Prompt | `configs/simulation.yaml` | `tests/test_smoke.py` | pending | critical |

---

## 19. Interactive Simulator Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 19.1 | Command-line interface for dataset generation | Prompt | `scripts/generate_synthetic_data.py` | `tests/test_cli.py` | pending | high |
| 19.2 | Configurable parameters (participants, sessions, events, sampling, noise, etc.) | Prompt | `scripts/generate_synthetic_data.py` | `tests/test_cli.py` | pending | high |
| 19.3 | Optional Streamlit dashboard | Prompt | `src/kinetic/dashboard/` | `tests/test_dashboard.py` | pending | low |
| 19.4 | Event inspection (waveform, zone channels, IMU, labels, features, predictions) | Prompt | `src/kinetic/dashboard/` or CLI | `tests/test_dashboard.py` | pending | medium |

---

## 20. Documentation Requirements

| ID | Requirement | Source | Implementation File | Test File | Status | Priority |
|----|-------------|--------|---------------------|-----------|--------|----------|
| 20.1 | README with installation and commands | Prompt | `README.md` | N/A | completed | critical |
| 20.2 | architecture.md | Prompt | `docs/architecture.md` | N/A | completed | critical |
| 20.3 | requirements_traceability.md | Prompt | `docs/requirements_traceability.md` | N/A | completed | critical |
| 20.4 | data_dictionary.md | Prompt | `docs/data_dictionary.md` | N/A | pending | high |
| 20.5 | methodology.md | Prompt | `docs/methodology.md` | N/A | pending | high |
| 20.6 | limitations.md | Prompt | `docs/limitations.md` | N/A | pending | high |

---

## Summary Statistics

- **Total Requirements**: 165
- **Critical Priority**: 45
- **High Priority**: 78
- **Medium Priority**: 35
- **Low Priority**: 7
- **Deferred**: 3
- **Completed**: 3 (README, architecture, requirements_traceability)
- **In Progress**: 0
- **Pending**: 162

## Notes

1. **Deferred Requirements**: PINNs (Model 7) and RL-based coaching are marked as deferred as they are research extensions, not core dependencies for the initial prototype.

2. **Synthetic Data Limitations**: All current implementations use synthetic data. Real-hardware validation is required before any real-world accuracy claims can be made.

3. **Group Leakage Prevention**: This is marked as critical because it affects the validity of all model comparisons.

4. **Fusion Experiments**: These are marked as critical because sensor-vision fusion is the main research contribution.

5. **Figure Generation**: While generating 25+ figures is a requirement, each figure depends on having the underlying experimental data. Figures will be skipped if the required data does not exist.

6. **Status Updates**: This document will be updated as implementation progresses.
