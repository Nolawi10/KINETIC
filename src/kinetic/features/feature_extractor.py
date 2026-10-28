"""
Unified feature extractor for KINETIC.

Combines piezo, IMU, and mat feature extractors into a single interface.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Optional, Tuple
from tqdm import tqdm

from .piezo_features import PiezoFeatureExtractor
from .imu_features import IMUFeatureExtractor
from .mat_features import MatFeatureExtractor
from ..sensors import SensorLoader


class FeatureExtractor:
    """
    Unified feature extractor for all sensor modalities.
    """
    
    def __init__(self, config: Dict):
        """
        Initialize the unified feature extractor.
        
        Args:
            config: Configuration dictionary from features.yaml
        """
        self.config = config
        
        # Initialize individual extractors
        self.piezo_config = config.get("piezo", {})
        self.imu_config = config.get("imu", {})
        self.mat_config = config.get("mat", {})
        
        # Sampling frequencies (from config or defaults)
        self.piezo_sampling_freq = config.get("windowing", {}).get("piezo_window_duration", 0.3)
        self.piezo_sampling_freq = 2000  # Default from simulation config
        self.imu_sampling_freq = 200  # Default from simulation config
        self.mat_sampling_freq = 50  # Default from simulation config
        
        # Initialize extractors
        self.piezo_extractor = PiezoFeatureExtractor(self.piezo_sampling_freq, self.piezo_config)
        self.imu_extractor = IMUFeatureExtractor(self.imu_sampling_freq, self.imu_config)
        self.mat_extractor = MatFeatureExtractor(self.mat_sampling_freq, self.mat_config)
        
        # Sensor loader
        self.sensor_loader = SensorLoader()
    
    def extract_event_features(
        self,
        event_id: str,
        load_piezo: bool = True,
        load_imu: bool = True,
        load_mat: bool = True
    ) -> Dict[str, float]:
        """
        Extract features for a single event.
        
        Args:
            event_id: Event identifier
            load_piezo: Whether to load and extract piezo features
            load_imu: Whether to load and extract IMU features
            load_mat: Whether to load and extract mat features
            
        Returns:
            Dictionary of feature names and values
        """
        features = {}
        
        # Extract piezo features
        if load_piezo:
            try:
                waveforms, timestamps, _ = self.sensor_loader.load_piezo(event_id)
                piezo_features = self.piezo_extractor.extract_features(waveforms, timestamps)
                # Prefix with "piezo_"
                for key, value in piezo_features.items():
                    features[f"piezo_{key}"] = value
            except FileNotFoundError:
                # Piezo data not available
                pass
        
        # Extract IMU features
        if load_imu:
            try:
                imu_data, timestamps, _ = self.sensor_loader.load_imu(event_id)
                imu_features = self.imu_extractor.extract_features(imu_data, timestamps)
                # Prefix with "imu_"
                for key, value in imu_features.items():
                    features[f"imu_{key}"] = value
            except FileNotFoundError:
                # IMU data not available
                pass
        
        # Extract mat features
        if load_mat:
            try:
                zone_events, timestamps, _ = self.sensor_loader.load_mat(event_id)
                mat_features = self.mat_extractor.extract_features(zone_events, timestamps)
                # Prefix with "mat_"
                for key, value in mat_features.items():
                    features[f"mat_{key}"] = value
            except FileNotFoundError:
                # Mat data not available
                pass
        
        return features
    
    def extract_batch_features(
        self,
        annotations_df: pd.DataFrame,
        load_piezo: bool = True,
        load_imu: bool = True,
        load_mat: bool = True
    ) -> pd.DataFrame:
        """
        Extract features for a batch of events.
        
        Args:
            annotations_df: Annotations DataFrame with event IDs
            load_piezo: Whether to load and extract piezo features
            load_imu: Whether to load and extract IMU features
            load_mat: Whether to load and extract mat features
            
        Returns:
            DataFrame with features for all events
        """
        all_features = []
        
        for _, row in tqdm(annotations_df.iterrows(), total=len(annotations_df), desc="Extracting features"):
            event_id = row["event_id"]
            
            # Extract features
            features = self.extract_event_features(event_id, load_piezo, load_imu, load_mat)
            
            # Add metadata
            features["event_id"] = event_id
            features["participant_id"] = row["participant_id"]
            features["session_id"] = row["session_id"]
            features["movement_class"] = row["movement_class"]
            features["target_zone"] = row["target_zone"]
            
            all_features.append(features)
        
        return pd.DataFrame(all_features)
    
    def save_features(
        self,
        features_df: pd.DataFrame,
        output_path: str
    ) -> None:
        """
        Save features to CSV file.
        
        Args:
            features_df: Features DataFrame
            output_path: Path to save features
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        features_df.to_csv(output_file, index=False)
