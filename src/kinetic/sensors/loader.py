"""
Sensor data loader for KINETIC.

Loads and validates piezo, IMU, and mat data from files.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Optional, Tuple


class SensorLoader:
    """
    Load sensor data from files with validation.
    """
    
    def __init__(self, base_dir: str = "kinetic_data"):
        """
        Initialize the sensor loader.
        
        Args:
            base_dir: Base directory for kinetic data
        """
        self.base_dir = Path(base_dir)
        self.raw_dir = self.base_dir / "raw"
        self.piezo_dir = self.raw_dir / "piezo"
        self.imu_dir = self.raw_dir / "imu"
        self.mat_dir = self.raw_dir / "mat"
        self.metadata_dir = self.base_dir / "metadata"
        self.annotations_dir = self.base_dir / "annotations"
    
    def load_piezo(self, event_id: str, format_type: str = "npz") -> Tuple[np.ndarray, np.ndarray, Dict]:
        """
        Load piezo waveform for an event.
        
        Args:
            event_id: Event identifier
            format_type: File format ("npz" or "csv")
            
        Returns:
            Tuple of (waveforms, timestamps, metadata)
        """
        filepath = self.piezo_dir / f"{event_id}.{format_type}"
        
        if not filepath.exists():
            raise FileNotFoundError(f"Piezo file not found: {filepath}")
        
        if format_type == "npz":
            data = np.load(filepath)
            waveforms = data["waveforms"]
            timestamps = data["timestamps"]
            metadata = {"event_id": data.get("event_id", event_id)}
        elif format_type == "csv":
            df = pd.read_csv(filepath)
            timestamps = df["timestamp"].values
            waveforms = df[[col for col in df.columns if col.startswith("channel_")]].values.T
            metadata = {"event_id": event_id}
        else:
            raise ValueError(f"Unsupported format: {format_type}")
        
        return waveforms, timestamps, metadata
    
    def load_imu(self, event_id: str, format_type: str = "npz") -> Tuple[np.ndarray, np.ndarray, Dict]:
        """
        Load IMU data for an event.
        
        Args:
            event_id: Event identifier
            format_type: File format ("npz" or "csv")
            
        Returns:
            Tuple of (imu_data, timestamps, metadata)
        """
        filepath = self.imu_dir / f"{event_id}.{format_type}"
        
        if not filepath.exists():
            raise FileNotFoundError(f"IMU file not found: {filepath}")
        
        if format_type == "npz":
            data = np.load(filepath)
            imu_data = data["imu_data"]
            timestamps = data["timestamps"]
            metadata = {"event_id": data.get("event_id", event_id)}
        elif format_type == "csv":
            df = pd.read_csv(filepath)
            imu_data = df[["accel_x", "accel_y", "accel_z", "gyro_x", "gyro_y", "gyro_z"]].values
            timestamps = df["timestamp"].values
            metadata = {"event_id": event_id}
        else:
            raise ValueError(f"Unsupported format: {format_type}")
        
        return imu_data, timestamps, metadata
    
    def load_mat(self, event_id: str, format_type: str = "csv") -> Tuple[pd.DataFrame, np.ndarray, Dict]:
        """
        Load mat zone events for an event.
        
        Args:
            event_id: Event identifier
            format_type: File format ("csv")
            
        Returns:
            Tuple of (zone_events_df, timestamps, metadata)
        """
        filepath = self.mat_dir / f"{event_id}.{format_type}"
        
        if not filepath.exists():
            raise FileNotFoundError(f"Mat file not found: {filepath}")
        
        if format_type == "csv":
            df = pd.read_csv(filepath)
            # Generate timestamps based on sampling frequency
            # For simplicity, use a default
            timestamps = np.linspace(0, 2.0, 100)  # Placeholder
            metadata = {"event_id": event_id}
        else:
            raise ValueError(f"Unsupported format: {format_type}")
        
        return df, timestamps, metadata
    
    def load_metadata(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Load all metadata tables.
        
        Returns:
            Tuple of (participants_df, sessions_df, label_definitions_df)
        """
        participants_df = pd.read_csv(self.metadata_dir / "participants.csv")
        sessions_df = pd.read_csv(self.metadata_dir / "sessions.csv")
        label_definitions_df = pd.read_csv(self.metadata_dir / "label_definitions.csv")
        
        return participants_df, sessions_df, label_definitions_df
    
    def load_annotations(self) -> pd.DataFrame:
        """
        Load event annotations.
        
        Returns:
            Annotations DataFrame
        """
        annotations_df = pd.read_csv(self.annotations_dir / "events.csv")
        return annotations_df
    
    def check_data_integrity(self, annotations_df: pd.DataFrame) -> Dict[str, int]:
        """
        Check data integrity by verifying files exist.
        
        Args:
            annotations_df: Annotations DataFrame
            
        Returns:
            Dictionary with integrity check results
        """
        results = {
            "total_events": len(annotations_df),
            "piezo_files_found": 0,
            "imu_files_found": 0,
            "mat_files_found": 0,
            "piezo_files_missing": 0,
            "imu_files_missing": 0,
            "mat_files_missing": 0
        }
        
        for _, row in annotations_df.iterrows():
            event_id = row["event_id"]
            
            # Check piezo
            if (self.piezo_dir / f"{event_id}.npz").exists():
                results["piezo_files_found"] += 1
            else:
                results["piezo_files_missing"] += 1
            
            # Check IMU
            if (self.imu_dir / f"{event_id}.npz").exists():
                results["imu_files_found"] += 1
            else:
                results["imu_files_missing"] += 1
            
            # Check mat
            if (self.mat_dir / f"{event_id}.csv").exists():
                results["mat_files_found"] += 1
            else:
                results["mat_files_missing"] += 1
        
        return results
