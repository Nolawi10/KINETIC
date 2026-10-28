"""
Metadata generator for synthetic dataset.

Generates participants.csv, sessions.csv, and label_definitions.csv tables.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime, timedelta


class MetadataGenerator:
    """
    Generate metadata tables for the synthetic dataset.
    """
    
    def __init__(self, config: Dict):
        """
        Initialize the metadata generator.
        
        Args:
            config: Configuration dictionary from simulation.yaml
        """
        self.config = config
        self.simulation_config = config.get("simulation", {})
        
        # Data provenance
        self.data_source = self.simulation_config.get("data_source", "synthetic")
        self.simulation_version = self.simulation_config.get("version", "0.1.0")
        
        # Participant profiles
        self.participant_profiles = self.config.get("participant_profiles", [])
        self.profile_distribution = self.config.get("profile_distribution", {})
        
        # Movement classes and zones
        self.movement_classes = self.config.get("movement_classes", [])
        self.zones = self.config.get("piezo", {}).get("zones", [])
    
    def generate_participants(
        self,
        n_participants: int,
        rng: Optional[np.random.Generator] = None
    ) -> pd.DataFrame:
        """
        Generate participants.csv metadata table.
        
        Args:
            n_participants: Number of participants to generate
            rng: Random number generator
            
        Returns:
            DataFrame with participant metadata
        """
        if rng is None:
            rng = np.random.default_rng()
        
        participants = []
        profile_names = list(self.profile_distribution.keys())
        profile_probs = list(self.profile_distribution.values())
        
        for i in range(n_participants):
            participant_id = f"P{i+1:03d}"
            
            # Select profile
            profile = rng.choice(profile_names, p=profile_probs)
            profile_config = next(
                (p for p in self.participant_profiles if p["name"] == profile),
                self.participant_profiles[0] if self.participant_profiles else {}
            )
            
            participants.append({
                "participant_id": participant_id,
                "data_source": self.data_source,
                "simulation_profile": profile,
                "experience_group": profile_config.get("experience_group", "unknown"),
                "age_group": rng.choice(["18-25", "26-35", "36-45", "46+"]),
                "height_cm": rng.uniform(160, 190),
                "weight_kg": rng.uniform(60, 90)
            })
        
        return pd.DataFrame(participants)
    
    def generate_sessions(
        self,
        participants_df: pd.DataFrame,
        n_sessions_per_participant: int,
        random_seed: int,
        rng: Optional[np.random.Generator] = None
    ) -> pd.DataFrame:
        """
        Generate sessions.csv metadata table.
        
        Args:
            participants_df: DataFrame of participants
            n_sessions_per_participant: Number of sessions per participant
            random_seed: Random seed for reproducibility
            rng: Random number generator
            
        Returns:
            DataFrame with session metadata
        """
        if rng is None:
            rng = np.random.default_rng(random_seed)
        
        sessions = []
        base_timestamp = datetime(2024, 1, 1, 10, 0, 0)
        
        for _, participant in participants_df.iterrows():
            participant_id = participant["participant_id"]
            
            for i in range(n_sessions_per_participant):
                session_id = f"{participant_id}_S{i+1:03d}"
                
                # Add time between sessions
                session_timestamp = base_timestamp + timedelta(
                    days=i * 7,
                    hours=int(rng.integers(0, 8))
                )
                
                sessions.append({
                    "session_id": session_id,
                    "participant_id": participant_id,
                    "data_source": self.data_source,
                    "simulation_version": self.simulation_version,
                    "random_seed": random_seed + i,
                    "session_timestamp": session_timestamp.isoformat(),
                    "sensor_configuration": "5-zone_piezo_mpu6050",
                    "camera_configuration": "front_view_1080p_30fps",
                    "environment_conditions": "indoor_lighting"
                })
        
        return pd.DataFrame(sessions)
    
    def generate_label_definitions(self) -> pd.DataFrame:
        """
        Generate label_definitions.csv metadata table.
        
        Returns:
            DataFrame with label definitions
        """
        labels = []
        
        # Movement classes
        for movement in self.movement_classes:
            labels.append({
                "label_name": movement,
                "label_category": "movement_class",
                "description": f"Movement type: {movement}",
                "annotation_rules": "Label based on observed technique",
                "field_type": "target"
            })
        
        # Target zones
        for zone in self.zones:
            labels.append({
                "label_name": zone,
                "label_category": "target_zone",
                "description": f"Target zone on mannequin: {zone}",
                "annotation_rules": "Zone where impact occurred",
                "field_type": "target"
            })
        
        # Add no_impact zone
        labels.append({
            "label_name": "no_impact",
            "label_category": "target_zone",
            "description": "No impact detected",
            "annotation_rules": "Background or miss",
            "field_type": "target"
        })
        
        # Detection status
        detection_statuses = ["detected", "missed", "false_positive", "uncertain"]
        for status in detection_statuses:
            labels.append({
                "label_name": status,
                "label_category": "detection_status",
                "description": f"Event detection status: {status}",
                "annotation_rules": "System detection confidence",
                "field_type": "metadata"
            })
        
        return pd.DataFrame(labels)
    
    def save_metadata(
        self,
        participants_df: pd.DataFrame,
        sessions_df: pd.DataFrame,
        label_definitions_df: pd.DataFrame,
        output_dir: str
    ) -> None:
        """
        Save all metadata tables to CSV files.
        
        Args:
            participants_df: Participants DataFrame
            sessions_df: Sessions DataFrame
            label_definitions_df: Label definitions DataFrame
            output_dir: Directory to save metadata files
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        participants_df.to_csv(output_path / "participants.csv", index=False)
        sessions_df.to_csv(output_path / "sessions.csv", index=False)
        label_definitions_df.to_csv(output_path / "label_definitions.csv", index=False)
