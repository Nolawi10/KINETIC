"""
Synthetic IMU (Inertial Measurement Unit) simulator.

Generates realistic accelerometer and gyroscope streams for movement simulation.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class IMUEventParams:
    """Parameters for IMU event generation."""
    accel_magnitude_mean: float
    accel_magnitude_std: float
    gyro_magnitude_mean: float
    gyro_magnitude_std: float
    duration: float
    onset_time: float


class IMUSimulator:
    """
    Synthetic IMU simulator.
    
    Generates accelerometer and gyroscope data with realistic noise,
    bias drift, and movement-specific characteristics.
    """
    
    # Default movement classes
    DEFAULT_MOVEMENTS = [
        "jab",
        "cross",
        "hook",
        "roundhouse_kick",
        "defensive_movement",
        "footwork_movement",
        "no_action"
    ]
    
    def __init__(self, config: Dict):
        """
        Initialize the IMU simulator.
        
        Args:
            config: Configuration dictionary from simulation.yaml
        """
        self.config = config
        self.imu_config = config.get("imu", {})
        
        # Sampling parameters
        self.sampling_frequency = self.imu_config.get("sampling_frequency", 200)
        self.window_duration = self.imu_config.get("window_duration", 0.5)
        
        # Accelerometer parameters
        accel_config = self.imu_config.get("accelerometer", {})
        self.accel_noise_std = accel_config.get("noise_std", 0.05)
        self.accel_bias_drift_std = accel_config.get("bias_drift_std", 0.01)
        self.accel_range = accel_config.get("range", [-20, 20])
        
        # Gyroscope parameters
        gyro_config = self.imu_config.get("gyroscope", {})
        self.gyro_noise_std = gyro_config.get("noise_std", 0.01)
        self.gyro_bias_drift_std = gyro_config.get("bias_drift_std", 0.001)
        self.gyro_range = gyro_config.get("range", [-10, 10])
        
        # Movement parameters
        self.movement_parameters = self.imu_config.get("movement_parameters", {})
        
        # Synchronization parameters
        self.clock_offset_range = self.imu_config.get("clock_offset_range", [-0.01, 0.01])
        self.timestamp_jitter_std = self.imu_config.get("timestamp_jitter_std", 0.001)
        self.dropout_rate = self.imu_config.get("dropout_rate", 0.001)
    
    def _get_movement_params(self, movement_class: str) -> IMUEventParams:
        """
        Get movement-specific parameters.
        
        Args:
            movement_class: Type of movement
            
        Returns:
            IMUEventParams instance
        """
        movement_config = self.movement_parameters.get(movement_class, {})
        
        return IMUEventParams(
            accel_magnitude_mean=movement_config.get("accel_magnitude_mean", 5.0),
            accel_magnitude_std=movement_config.get("accel_magnitude_std", 1.5),
            gyro_magnitude_mean=movement_config.get("gyro_magnitude_mean", 2.0),
            gyro_magnitude_std=movement_config.get("gyro_magnitude_std", 0.8),
            duration=0.3,  # Default movement duration
            onset_time=0.1  # Default onset within window
        )
    
    def _generate_acceleration(
        self,
        t: np.ndarray,
        params: IMUEventParams,
        rng: np.random.Generator
    ) -> np.ndarray:
        """
        Generate 3-axis acceleration data.
        
        Args:
            t: Time array
            params: Movement parameters
            rng: Random number generator
            
        Returns:
            (n_samples, 3) array of acceleration [x, y, z]
        """
        n_samples = len(t)
        accel = np.zeros((n_samples, 3))
        
        # Base magnitude for this movement
        magnitude = rng.normal(params.accel_magnitude_mean, params.accel_magnitude_std)
        magnitude = max(0.1, magnitude)  # Ensure positive
        
        # Generate random direction for each axis
        direction = rng.normal(0, 1, 3)
        direction = direction / np.linalg.norm(direction)
        
        # Time-varying envelope (Gaussian-like pulse)
        t_rel = t - params.onset_time
        envelope = np.exp(-0.5 * (t_rel / (params.duration / 4))**2)
        
        # Add some oscillation
        oscillation = np.sin(2 * np.pi * 5 * t_rel)
        
        # Combine envelope and oscillation
        signal = magnitude * envelope * (1 + 0.3 * oscillation)
        
        # Apply to each axis with direction
        for i in range(3):
            accel[:, i] = signal * direction[i]
        
        # Add gravity (assume z-axis is vertical)
        accel[:, 2] += 9.81
        
        # Add noise
        accel += rng.normal(0, self.accel_noise_std, size=accel.shape)
        
        # Add bias drift
        bias_drift = np.cumsum(rng.normal(0, self.accel_bias_drift_std / self.sampling_frequency, size=(n_samples, 3)), axis=0)
        accel += bias_drift
        
        # Clip to range
        accel = np.clip(accel, self.accel_range[0], self.accel_range[1])
        
        return accel
    
    def _generate_angular_velocity(
        self,
        t: np.ndarray,
        params: IMUEventParams,
        rng: np.random.Generator
    ) -> np.ndarray:
        """
        Generate 3-axis angular velocity data.
        
        Args:
            t: Time array
            params: Movement parameters
            rng: Random number generator
            
        Returns:
            (n_samples, 3) array of angular velocity [x, y, z] in rad/s
        """
        n_samples = len(t)
        gyro = np.zeros((n_samples, 3))
        
        # Base magnitude for this movement
        magnitude = rng.normal(params.gyro_magnitude_mean, params.gyro_magnitude_std)
        magnitude = max(0.1, magnitude)
        
        # Generate random direction (rotation axis)
        direction = rng.normal(0, 1, 3)
        direction = direction / np.linalg.norm(direction)
        
        # Time-varying envelope
        t_rel = t - params.onset_time
        envelope = np.exp(-0.5 * (t_rel / (params.duration / 3))**2)
        
        # Add some oscillation (different frequency than accel)
        oscillation = np.sin(2 * np.pi * 3 * t_rel)
        
        # Combine
        signal = magnitude * envelope * (1 + 0.2 * oscillation)
        
        # Apply to each axis
        for i in range(3):
            gyro[:, i] = signal * direction[i]
        
        # Add noise
        gyro += rng.normal(0, self.gyro_noise_std, size=gyro.shape)
        
        # Add bias drift
        bias_drift = np.cumsum(rng.normal(0, self.gyro_bias_drift_std / self.sampling_frequency, size=(n_samples, 3)), axis=0)
        gyro += bias_drift
        
        # Clip to range
        gyro = np.clip(gyro, self.gyro_range[0], self.gyro_range[1])
        
        return gyro
    
    def _apply_timestamp_jitter(self, t: np.ndarray, rng: np.random.Generator) -> np.ndarray:
        """
        Apply random jitter to timestamps.
        
        Args:
            t: Original timestamps
            rng: Random number generator
            
        Returns:
            Jittered timestamps
        """
        jitter = rng.normal(0, self.timestamp_jitter_std, size=t.shape)
        return t + jitter
    
    def _apply_dropouts(self, data: np.ndarray, rng: np.random.Generator) -> np.ndarray:
        """
        Apply random sample dropouts.
        
        Args:
            data: Sensor data
            rng: Random number generator
            
        Returns:
            Data with dropouts (set to NaN)
        """
        n_samples = data.shape[0]
        dropout_mask = rng.random(n_samples) < self.dropout_rate
        
        if np.any(dropout_mask):
            data = data.copy()
            data[dropout_mask] = np.nan
        
        return data
    
    def generate_event(
        self,
        movement_class: str,
        clock_offset: float = 0.0,
        rng: Optional[np.random.Generator] = None
    ) -> Tuple[np.ndarray, np.ndarray, Dict]:
        """
        Generate IMU data for a single event.
        
        Args:
            movement_class: Type of movement
            clock_offset: Clock offset in seconds
            rng: Random number generator
            
        Returns:
            Tuple of (imu_data, timestamps, metadata)
            - imu_data: (n_samples, 6) array [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
            - timestamps: (n_samples,) array in seconds
            - metadata: Dictionary with event parameters
        """
        if rng is None:
            rng = np.random.default_rng()
        
        # Get movement parameters
        params = self._get_movement_params(movement_class)
        
        # Time array
        n_samples = int(self.sampling_frequency * self.window_duration)
        t = np.linspace(0, self.window_duration, n_samples)
        
        # Apply clock offset
        t = t + float(clock_offset)
        
        # Generate acceleration
        accel = self._generate_acceleration(t, params, rng)
        
        # Generate angular velocity
        gyro = self._generate_angular_velocity(t, params, rng)
        
        # Combine into single array
        imu_data = np.hstack([accel, gyro])
        
        # Apply timestamp jitter
        t_jittered = self._apply_timestamp_jitter(t, rng)
        
        # Apply dropouts
        imu_data = self._apply_dropouts(imu_data, rng)
        
        # Metadata
        metadata = {
            "movement_class": movement_class,
            "accel_magnitude": np.nanmax(np.linalg.norm(accel, axis=1)),
            "gyro_magnitude": np.nanmax(np.linalg.norm(gyro, axis=1)),
            "clock_offset": clock_offset,
            "sampling_frequency": self.sampling_frequency,
            "n_samples": n_samples,
            "n_channels": 6,
            "dropout_rate": self.dropout_rate
        }
        
        return imu_data, t_jittered, metadata
    
    def generate_batch(
        self,
        events: List[Dict],
        rng: Optional[np.random.Generator] = None
    ) -> List[Tuple[np.ndarray, np.ndarray, Dict]]:
        """
        Generate multiple events.
        
        Args:
            events: List of event dictionaries with 'movement_class' key
            rng: Random number generator
            
        Returns:
            List of (imu_data, timestamps, metadata) tuples
        """
        if rng is None:
            rng = np.random.default_rng()
        
        results = []
        for event in events:
            movement_class = event.get("movement_class", "no_action")
            clock_offset = rng.uniform(*self.clock_offset_range)
            imu_data, t, metadata = self.generate_event(movement_class, clock_offset, rng)
            metadata.update(event)
            results.append((imu_data, t, metadata))
        
        return results
