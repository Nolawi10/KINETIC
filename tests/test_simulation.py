"""
Tests for synthetic data generation modules.
"""

import pytest
import numpy as np
import pandas as pd
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from kinetic.utils import set_seed, load_config
from kinetic.simulation import PiezoSimulator, IMUSimulator, MatSimulator


def test_piezo_simulator_initialization():
    """Test that piezo simulator initializes correctly."""
    config = {
        "piezo": {
            "sampling_frequency": 2000,
            "window_duration": 0.3,
            "zones": ["head_zone", "chest_zone"]
        },
        "piezo": {
            "zones": ["head_zone", "chest_zone"],
            "waveform": {
                "amplitude_range": [0.1, 1.0],
                "rise_time_range": [0.005, 0.015],
                "decay_time_range": [0.02, 0.08],
                "ringing_frequency_range": [50, 200],
                "damping_ratio_range": [0.3, 0.8],
                "background_noise_std": 0.02,
                "electronic_noise_std": 0.01,
                "gain": 1.0,
                "saturation_threshold": 2.0,
                "adc_resolution": 12,
                "adc_voltage_range": [-3.3, 3.3],
                "crosstalk_enabled": True,
                "crosstalk_decay_factor": 0.3,
                "crosstalk_delay": 0.002,
                "sensor_variation_std": 0.1,
                "event_variation_std": 0.15
            },
            "zone_parameters": {
                "head_zone": {
                    "base_amplitude": 0.8,
                    "rise_time_mean": 0.008,
                    "decay_time_mean": 0.04
                }
            }
        }
    }
    
    simulator = PiezoSimulator(config)
    
    assert simulator.sampling_frequency == 2000
    assert simulator.window_duration == 0.3
    assert len(simulator.zones) == 2
    assert simulator.n_channels == 2


def test_piezo_event_generation():
    """Test that piezo event generation produces valid output."""
    config = {
        "piezo": {
            "sampling_frequency": 2000,
            "window_duration": 0.3,
            "zones": ["head_zone", "chest_zone"],
            "waveform": {
                "amplitude_range": [0.1, 1.0],
                "rise_time_range": [0.005, 0.015],
                "decay_time_range": [0.02, 0.08],
                "ringing_frequency_range": [50, 200],
                "damping_ratio_range": [0.3, 0.8],
                "background_noise_std": 0.02,
                "electronic_noise_std": 0.01,
                "gain": 1.0,
                "saturation_threshold": 2.0,
                "adc_resolution": 12,
                "adc_voltage_range": [-3.3, 3.3],
                "crosstalk_enabled": True,
                "crosstalk_decay_factor": 0.3,
                "crosstalk_delay": 0.002,
                "sensor_variation_std": 0.1,
                "event_variation_std": 0.15
            },
            "zone_parameters": {
                "head_zone": {
                    "base_amplitude": 0.8,
                    "rise_time_mean": 0.008,
                    "decay_time_mean": 0.04
                },
                "chest_zone": {
                    "base_amplitude": 0.9,
                    "rise_time_mean": 0.007,
                    "decay_time_mean": 0.035
                }
            }
        }
    }
    
    set_seed(42)
    simulator = PiezoSimulator(config)
    rng = np.random.default_rng(42)
    
    waveforms, t, metadata = simulator.generate_event("head_zone", rng)
    
    # Check shapes
    assert waveforms.shape[0] == 2  # 2 channels
    assert waveforms.shape[1] == 600  # 2000 Hz * 0.3 s
    assert len(t) == 600
    
    # Check metadata
    assert metadata["target_zone"] == "head_zone"
    assert metadata["sampling_frequency"] == 2000
    assert "amplitude" in metadata
    assert "rise_time" in metadata
    
    # Check signal is not all zeros
    assert np.any(waveforms != 0)


def test_imu_simulator_initialization():
    """Test that IMU simulator initializes correctly."""
    config = {
        "imu": {
            "sampling_frequency": 200,
            "window_duration": 0.5,
            "accelerometer": {
                "noise_std": 0.05,
                "bias_drift_std": 0.01,
                "range": [-20, 20]
            },
            "gyroscope": {
                "noise_std": 0.01,
                "bias_drift_std": 0.001,
                "range": [-10, 10]
            },
            "movement_parameters": {
                "jab": {
                    "accel_magnitude_mean": 8.0,
                    "accel_magnitude_std": 2.0,
                    "gyro_magnitude_mean": 3.0,
                    "gyro_magnitude_std": 1.0
                }
            }
        }
    }
    
    simulator = IMUSimulator(config)
    
    assert simulator.sampling_frequency == 200
    assert simulator.window_duration == 0.5


def test_imu_event_generation():
    """Test that IMU event generation produces valid output."""
    config = {
        "imu": {
            "sampling_frequency": 200,
            "window_duration": 0.5,
            "accelerometer": {
                "noise_std": 0.05,
                "bias_drift_std": 0.01,
                "range": [-20, 20]
            },
            "gyroscope": {
                "noise_std": 0.01,
                "bias_drift_std": 0.001,
                "range": [-10, 10]
            },
            "movement_parameters": {
                "jab": {
                    "accel_magnitude_mean": 8.0,
                    "accel_magnitude_std": 2.0,
                    "gyro_magnitude_mean": 3.0,
                    "gyro_magnitude_std": 1.0
                },
                "no_action": {
                    "accel_magnitude_mean": 1.0,
                    "accel_magnitude_std": 0.5,
                    "gyro_magnitude_mean": 0.5,
                    "gyro_magnitude_std": 0.3
                }
            }
        }
    }
    
    set_seed(42)
    simulator = IMUSimulator(config)
    rng = np.random.default_rng(42)
    
    imu_data, t, metadata = simulator.generate_event("jab", clock_offset=0.0, rng=rng)
    
    # Check shapes
    assert imu_data.shape[0] == 100  # 200 Hz * 0.5 s
    assert imu_data.shape[1] == 6  # accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z
    assert len(t) == 100
    
    # Check metadata
    assert metadata["movement_class"] == "jab"
    assert metadata["sampling_frequency"] == 200
    
    # Check signal is not all zeros
    assert np.any(imu_data != 0)


def test_mat_simulator_initialization():
    """Test that mat simulator initializes correctly."""
    config = {
        "mat": {
            "sampling_frequency": 50,
            "window_duration": 2.0,
            "zones": ["zone_A1", "zone_A2", "zone_B1"],
            "movement_parameters": {
                "jab": {
                    "likely_zones": ["zone_A2"],
                    "transition_probability": 0.3,
                    "dwell_time_mean": 0.5
                }
            }
        }
    }
    
    simulator = MatSimulator(config)
    
    assert simulator.sampling_frequency == 50
    assert simulator.window_duration == 2.0
    assert len(simulator.zones) == 3


def test_mat_event_generation():
    """Test that mat event generation produces valid output."""
    config = {
        "mat": {
            "sampling_frequency": 50,
            "window_duration": 2.0,
            "zones": ["zone_A1", "zone_A2", "zone_B1"],
            "movement_parameters": {
                "jab": {
                    "likely_zones": ["zone_A2"],
                    "transition_probability": 0.3,
                    "dwell_time_mean": 0.5
                },
                "no_action": {
                    "likely_zones": ["zone_B1"],
                    "transition_probability": 0.1,
                    "dwell_time_mean": 1.0
                }
            },
            "zone_detection_error_rate": 0.05,
            "pressure_noise_std": 0.1,
            "missing_zone_rate": 0.02
        }
    }
    
    set_seed(42)
    simulator = MatSimulator(config)
    rng = np.random.default_rng(42)
    
    zone_events, t, metadata = simulator.generate_event("jab", rng)
    
    # Check timestamps
    assert len(t) == 100  # 50 Hz * 2.0 s
    
    # Check metadata
    assert metadata["movement_class"] == "jab"
    assert metadata["sampling_frequency"] == 50
    
    # Check zone events is a list
    assert isinstance(zone_events, list)
    
    # Check each event has required fields
    if zone_events:
        event = zone_events[0]
        assert "timestamp" in event
        assert "zone_id" in event
        assert "foot_side" in event
        assert "pressure_level" in event
        assert "dwell_time" in event


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
