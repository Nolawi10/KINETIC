"""
IMU signal feature extraction.

Extracts time-domain and frequency-domain features from accelerometer
and gyroscope data.
"""

import numpy as np
from scipy.fft import fft, fftfreq
from typing import Dict, Optional


class IMUFeatureExtractor:
    """
    Extract features from IMU (accelerometer + gyroscope) data.
    """
    
    def __init__(self, sampling_frequency: float, config: Optional[Dict] = None):
        """
        Initialize the IMU feature extractor.
        
        Args:
            sampling_frequency: Sampling frequency in Hz
            config: Feature configuration dictionary
        """
        self.sampling_frequency = sampling_frequency
        self.config = config or {}
        
        # Feature selection
        self.accel_config = self.config.get("accelerometer", {})
        self.gyro_config = self.config.get("gyroscope", {})
        self.window_config = self.config.get("window", {})
    
    def extract_features(
        self,
        imu_data: np.ndarray,
        timestamps: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Extract all features from IMU data.
        
        Args:
            imu_data: (n_samples, 6) array [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
            timestamps: (n_samples,) array of timestamps
            
        Returns:
            Dictionary of feature names and values
        """
        features = {}
        
        # Separate accelerometer and gyroscope
        accel = imu_data[:, :3]  # First 3 columns
        gyro = imu_data[:, 3:]   # Last 3 columns
        
        # Accelerometer features
        accel_features = self._extract_accel_features(accel)
        features.update(accel_features)
        
        # Gyroscope features
        gyro_features = self._extract_gyro_features(gyro)
        features.update(gyro_features)
        
        # Window features
        window_features = self._extract_window_features(imu_data)
        features.update(window_features)
        
        return features
    
    def _extract_accel_features(self, accel: np.ndarray) -> Dict[str, float]:
        """Extract accelerometer features."""
        features = {}
        
        # Per-axis statistics
        if self.accel_config.get("mean", True):
            for i, axis in enumerate(['x', 'y', 'z']):
                features[f"accel_mean_{axis}"] = np.mean(accel[:, i])
        
        if self.accel_config.get("std", True):
            for i, axis in enumerate(['x', 'y', 'z']):
                features[f"accel_std_{axis}"] = np.std(accel[:, i])
        
        # Magnitude features
        accel_magnitude = np.linalg.norm(accel, axis=1)
        
        if self.accel_config.get("magnitude_mean", True):
            features["accel_magnitude_mean"] = np.mean(accel_magnitude)
        
        if self.accel_config.get("magnitude_max", True):
            features["accel_magnitude_max"] = np.max(accel_magnitude)
        
        if self.accel_config.get("rms", True):
            features["accel_rms"] = np.sqrt(np.mean(accel_magnitude ** 2))
        
        # Jerk (derivative of acceleration)
        if self.accel_config.get("jerk_max", True):
            jerk = np.diff(accel, axis=0) * self.sampling_frequency
            jerk_magnitude = np.linalg.norm(jerk, axis=1)
            features["jerk_max"] = np.max(jerk_magnitude)
        
        return features
    
    def _extract_gyro_features(self, gyro: np.ndarray) -> Dict[str, float]:
        """Extract gyroscope features."""
        features = {}
        
        # Per-axis statistics
        if self.gyro_config.get("mean", True):
            for i, axis in enumerate(['x', 'y', 'z']):
                features[f"gyro_mean_{axis}"] = np.mean(gyro[:, i])
        
        if self.gyro_config.get("std", True):
            for i, axis in enumerate(['x', 'y', 'z']):
                features[f"gyro_std_{axis}"] = np.std(gyro[:, i])
        
        # Magnitude features
        gyro_magnitude = np.linalg.norm(gyro, axis=1)
        
        if self.gyro_config.get("magnitude_max", True):
            features["gyro_magnitude_max"] = np.max(gyro_magnitude)
        
        return features
    
    def _extract_window_features(self, imu_data: np.ndarray) -> Dict[str, float]:
        """Extract window-level features."""
        features = {}
        
        if self.window_config.get("energy", True):
            # Total energy across all channels
            energy = np.sum(imu_data ** 2) / self.sampling_frequency
            features["window_energy"] = energy
        
        return features
