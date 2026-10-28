"""
Annotation generator for synthetic dataset.

Generates events.csv with synchronized event annotations.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from pathlib import Path


class AnnotationGenerator:
    """
    Generate event annotations for the synthetic dataset.
    """
    
    def __init__(self, config: Dict):
        """
        Initialize the annotation generator.
        
        Args:
            config: Configuration dictionary from simulation.yaml
        """
        self.config = config
        self.simulation_config = config.get("simulation", {})
        
        # Data provenance
        self.data_source = self.simulation_config.get("data_source", "synthetic")
        self.simulation_version = self.simulation_config.get("version", "0.1.0")
        
        # Movement classes and zones
        self.movement_classes = self.config.get("movement_classes", [])
        self.zones = self.config.get("piezo", {}).get("zones", [])
        
        # Class distributions
        self.class_distribution = self.config.get("class_distribution", {})
        self.zone_distribution = self.config.get("zone_distribution", {})
    
    def _sample_movement_class(self, rng: np.random.Generator) -> str:
        """
        Sample a movement class based on distribution.
        
        Args:
            rng: Random number generator
            
        Returns:
            Movement class label
        """
        classes = list(self.class_distribution.keys())
        probs = list(self.class_distribution.values())
        return rng.choice(classes, p=probs)
    
    def _sample_target_zone(self, rng: np.random.Generator) -> str:
        """
        Sample a target zone based on distribution.
        
        Args:
            rng: Random number generator
            
        Returns:
            Target zone label
        """
        zones = list(self.zone_distribution.keys())
        probs = list(self.zone_distribution.values())
        return rng.choice(zones, p=probs)
    
    def _determine_impact_detected(
        self,
        movement_class: str,
        target_zone: str,
        rng: np.random.Generator
    ) -> bool:
        """
        Determine whether impact was detected.
        
        Args:
            movement_class: Movement class
            target_zone: Target zone
            rng: Random number generator
            
        Returns:
            True if impact detected
        """
        # Non-impact movements rarely trigger sensors
        if movement_class in ["defensive_movement", "footwork_movement", "no_action"]:
            return rng.random() < 0.1
        
        # no_impact zone means miss
        if target_zone == "no_impact":
            return rng.random() < 0.2
        
        # Impact movements usually detected
        return rng.random() < 0.95
    
    def generate_event_annotations(
        self,
        sessions_df: pd.DataFrame,
        n_events_per_session: int,
        random_seed: int,
        rng: Optional[np.random.Generator] = None
    ) -> pd.DataFrame:
        """
        Generate events.csv annotation table.
        
        Args:
            sessions_df: DataFrame of sessions
            n_events_per_session: Number of events per session
            random_seed: Random seed for reproducibility
            rng: Random number generator
            
        Returns:
            DataFrame with event annotations
        """
        if rng is None:
            rng = np.random.default_rng(random_seed)
        
        events = []
        event_counter = 0
        
        for _, session in sessions_df.iterrows():
            participant_id = session["participant_id"]
            session_id = session["session_id"]
            
            session_time = 0.0
            
            for i in range(n_events_per_session):
                event_id = f"E{event_counter+1:06d}"
                event_counter += 1
                
                # Sample labels
                movement_class = self._sample_movement_class(rng)
                target_zone = self._sample_target_zone(rng)
                
                # Determine impact detection
                impact_detected = self._determine_impact_detected(
                    movement_class, target_zone, rng
                )
                
                # Timing
                inter_event_interval = rng.uniform(1.0, 3.0)
                start_timestamp = session_time
                peak_timestamp = start_timestamp + rng.uniform(0.1, 0.3)
                end_timestamp = start_timestamp + rng.uniform(0.4, 0.8)
                session_time += inter_event_interval
                
                # Label confidence
                label_confidence = rng.uniform(0.7, 1.0)
                
                # Sensor and vision event IDs (may be null if not detected)
                sensor_event_id = f"SE{event_id}" if impact_detected else ""
                vision_event_id = f"VE{event_id}" if rng.random() < 0.9 else ""
                
                events.append({
                    "event_id": event_id,
                    "participant_id": participant_id,
                    "session_id": session_id,
                    "start_timestamp": start_timestamp,
                    "peak_timestamp": peak_timestamp,
                    "end_timestamp": end_timestamp,
                    "movement_class": movement_class,
                    "target_zone": target_zone,
                    "impact_detected": impact_detected,
                    "sensor_event_id": sensor_event_id,
                    "vision_event_id": vision_event_id,
                    "label_confidence": label_confidence,
                    "data_source": self.data_source,
                    "is_synthetic": True
                })
        
        return pd.DataFrame(events)
    
    def save_annotations(
        self,
        annotations_df: pd.DataFrame,
        output_dir: str
    ) -> None:
        """
        Save annotations to CSV file.
        
        Args:
            annotations_df: Annotations DataFrame
            output_dir: Directory to save annotation file
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        annotations_df.to_csv(output_path / "events.csv", index=False)
