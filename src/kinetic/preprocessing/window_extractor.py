"""
Window extraction for raw sensor data.

Extracts fixed-length windows from raw sensor recordings for neural network models.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from tqdm import tqdm

from ..utils.logging import get_logger

logger = get_logger(__name__)


class SensorWindowExtractor:
    """Extract fixed-length windows from raw sensor data."""
    
    def __init__(
        self,
        piezo_dir: Path,
        imu_dir: Path,
        mat_dir: Optional[Path] = None,
        window_samples: int = 500,
        pre_event_samples: int = 100,
        post_event_samples: int = 400,
        include_imu: bool = True,
        include_mat: bool = False
    ):
        """
        Args:
            piezo_dir: Directory containing piezo waveforms
            imu_dir: Directory containing IMU data
            mat_dir: Directory containing mat data (optional)
            window_samples: Total window length in samples
            pre_event_samples: Samples before event peak
            post_event_samples: Samples after event peak
            include_imu: Include IMU channels
            include_mat: Include mat channels
        """
        self.piezo_dir = piezo_dir
        self.imu_dir = imu_dir
        self.mat_dir = mat_dir
        self.window_samples = window_samples
        self.pre_event_samples = pre_event_samples
        self.post_event_samples = post_event_samples
        self.include_imu = include_imu
        self.include_mat = include_mat
        
    def load_piezo_window(self, event_id: str) -> Optional[np.ndarray]:
        """Load piezo waveform for an event."""
        piezo_path = self.piezo_dir / f"{event_id}_piezo.npy"
        
        if not piezo_path.exists():
            logger.warning(f"Piezo file not found: {piezo_path}")
            return None
        
        waveform = np.load(piezo_path)
        
        # Extract window around peak
        if waveform.shape[0] < self.window_samples:
            # Pad if too short
            pad_length = self.window_samples - waveform.shape[0]
            waveform = np.pad(waveform, ((0, pad_length), (0, 0)), mode='constant')
        
        # Find peak
        primary_channel = waveform[:, 0]
        peak_idx = np.argmax(np.abs(primary_channel))
        
        # Extract window
        start_idx = max(0, peak_idx - self.pre_event_samples)
        end_idx = min(waveform.shape[0], peak_idx + self.post_event_samples)
        
        window = waveform[start_idx:end_idx]
        
        # Pad if window is too short
        if window.shape[0] < self.window_samples:
            pad_length = self.window_samples - window.shape[0]
            window = np.pad(window, ((0, pad_length), (0, 0)), mode='constant')
        elif window.shape[0] > self.window_samples:
            # Truncate if too long
            window = window[:self.window_samples]
        
        return window  # (window_samples, n_piezo_channels)
    
    def load_imu_window(self, event_id: str) -> Optional[np.ndarray]:
        """Load IMU data for an event."""
        imu_path = self.imu_dir / f"{event_id}_imu.npy"
        
        if not imu_path.exists():
            logger.warning(f"IMU file not found: {imu_path}")
            return None
        
        imu_data = np.load(imu_path)
        
        # Extract window (same logic as piezo)
        if imu_data.shape[0] < self.window_samples:
            pad_length = self.window_samples - imu_data.shape[0]
            imu_data = np.pad(imu_data, ((0, pad_length), (0, 0)), mode='constant')
        
        # Find peak in acceleration magnitude
        accel_mag = np.sqrt(
            imu_data[:, 0]**2 + imu_data[:, 1]**2 + imu_data[:, 2]**2
        )
        peak_idx = np.argmax(accel_mag)
        
        start_idx = max(0, peak_idx - self.pre_event_samples)
        end_idx = min(imu_data.shape[0], peak_idx + self.post_event_samples)
        
        window = imu_data[start_idx:end_idx]
        
        if window.shape[0] < self.window_samples:
            pad_length = self.window_samples - window.shape[0]
            window = np.pad(window, ((0, pad_length), (0, 0)), mode='constant')
        elif window.shape[0] > self.window_samples:
            window = window[:self.window_samples]
        
        return window  # (window_samples, n_imu_channels)
    
    def load_mat_window(self, event_id: str) -> Optional[np.ndarray]:
        """Load mat data for an event (simplified as zone sequence)."""
        if self.mat_dir is None:
            return None
        
        mat_path = self.mat_dir / f"{event_id}_mat.csv"
        
        if not mat_path.exists():
            logger.warning(f"Mat file not found: {mat_path}")
            return None
        
        # Load mat data and extract window
        mat_df = pd.read_csv(mat_path)
        
        # Simplified: return one-hot encoded current zone for each timestep
        # This is a placeholder - real implementation would depend on mat data format
        return None
    
    def extract_window(self, event_id: str) -> Optional[np.ndarray]:
        """
        Extract multi-channel window for an event.
        
        Returns:
            Window array of shape (n_channels, window_samples) or None
        """
        piezo_window = self.load_piezo_window(event_id)
        if piezo_window is None:
            return None
        
        # Transpose to (n_channels, n_samples)
        piezo_window = piezo_window.T
        
        channels = [piezo_window]
        
        if self.include_imu:
            imu_window = self.load_imu_window(event_id)
            if imu_window is not None:
                imu_window = imu_window.T
                channels.append(imu_window)
        
        if self.include_mat:
            mat_window = self.load_mat_window(event_id)
            if mat_window is not None:
                mat_window = mat_window.T
                channels.append(mat_window)
        
        # Concatenate channels
        window = np.concatenate(channels, axis=0)
        
        return window
    
    def extract_batch_windows(
        self,
        event_ids: List[str],
        labels: List[str]
    ) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Extract windows for a batch of events.
        
        Args:
            event_ids: List of event IDs
            labels: List of corresponding labels
            
        Returns:
            X: (n_samples, n_channels, n_samples)
            y: (n_samples,) encoded labels
            valid_ids: List of event IDs that were successfully extracted
        """
        windows = []
        valid_labels = []
        valid_ids = []
        
        for event_id, label in tqdm(zip(event_ids, labels), desc="Extracting windows"):
            window = self.extract_window(event_id)
            
            if window is not None:
                windows.append(window)
                valid_labels.append(label)
                valid_ids.append(event_id)
        
        if len(windows) == 0:
            logger.warning("No valid windows extracted")
            return np.array([]), np.array([]), []
        
        X = np.array(windows)
        y = np.array(valid_labels)
        
        logger.info(f"Extracted {len(windows)} windows out of {len(event_ids)} events")
        logger.info(f"Window shape: {X.shape}")
        
        return X, y, valid_ids


def prepare_neural_data(
    annotations_df: pd.DataFrame,
    piezo_dir: Path,
    imu_dir: Path,
    label_col: str = "movement_class",
    window_samples: int = 500,
    include_imu: bool = True
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, List[str]]:
    """
    Prepare data for neural network training.
    
    Args:
        annotations_df: Event annotations
        piezo_dir: Directory containing piezo waveforms
        imu_dir: Directory containing IMU data
        label_col: Column name for labels
        window_samples: Window length in samples
        include_imu: Include IMU channels
        
    Returns:
        X: (n_samples, n_channels, n_samples)
        y: (n_samples,) encoded labels
        y_original: (n_samples,) original string labels
        event_ids: List of event IDs
    """
    from sklearn.preprocessing import LabelEncoder
    
    extractor = SensorWindowExtractor(
        piezo_dir=piezo_dir,
        imu_dir=imu_dir,
        window_samples=window_samples,
        include_imu=include_imu
    )
    
    event_ids = annotations_df['event_id'].tolist()
    labels = annotations_df[label_col].tolist()
    
    X, y, valid_ids = extractor.extract_batch_windows(event_ids, labels)
    
    if len(X) == 0:
        return X, y, y, valid_ids
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    return X, y_encoded, y, valid_ids
