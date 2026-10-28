"""
Smart mat feature extraction.

Extracts zone activation, transition, and balance features from
smart mat data.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Union


class MatFeatureExtractor:
    """
    Extract features from smart mat zone events.
    """
    
    def __init__(self, sampling_frequency: float, config: Optional[Dict] = None):
        """
        Initialize the mat feature extractor.
        
        Args:
            sampling_frequency: Sampling frequency in Hz
            config: Feature configuration dictionary
        """
        self.sampling_frequency = sampling_frequency
        self.config = config or {}
        
        # Feature selection
        self.zone_config = self.config.get("zone_features", {})
        self.balance_config = self.config.get("balance_features", {})
        self.sequence_config = self.config.get("sequence_features", {})
    
    def extract_features(
        self,
        zone_events,
        timestamps: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Extract all features from mat zone events.
        
        Args:
            zone_events: List of zone event dictionaries or DataFrame
            timestamps: Array of sample timestamps
            
        Returns:
            Dictionary of feature names and values
        """
        features = {}
        
        # Convert DataFrame to list of dicts if needed
        if isinstance(zone_events, pd.DataFrame):
            if zone_events.empty:
                return self._get_default_features()
            zone_events = zone_events.to_dict('records')
        elif not zone_events:
            # Return default values if no events
            return self._get_default_features()
        
        # Zone features
        zone_features = self._extract_zone_features(zone_events)
        features.update(zone_features)
        
        # Balance features
        balance_features = self._extract_balance_features(zone_events)
        features.update(balance_features)
        
        # Sequence features
        sequence_features = self._extract_sequence_features(zone_events)
        features.update(sequence_features)
        
        return features
    
    def _get_default_features(self) -> Dict[str, float]:
        """Return default feature values when no events available."""
        return {
            "n_transitions": 0,
            "dwell_time_mean": 0.0,
            "dwell_time_std": 0.0,
            "left_balance": 0.5,
            "right_balance": 0.5,
            "stance_width": 0.0
        }
    
    def _extract_zone_features(self, zone_events: List[Dict]) -> Dict[str, float]:
        """Extract zone-based features."""
        features = {}
        
        if self.zone_config.get("n_transitions", True):
            n_transitions = sum(1 for e in zone_events if e.get("is_transition", False))
            features["n_transitions"] = n_transitions
        
        if self.zone_config.get("dwell_time_mean", True) or self.zone_config.get("dwell_time_std", True):
            dwell_times = [e.get("dwell_time", 0) for e in zone_events]
            
            if self.zone_config.get("dwell_time_mean", True):
                features["dwell_time_mean"] = np.mean(dwell_times) if dwell_times else 0.0
            
            if self.zone_config.get("dwell_time_std", True):
                features["dwell_time_std"] = np.std(dwell_times) if dwell_times else 0.0
        
        return features
    
    def _extract_balance_features(self, zone_events: List[Dict]) -> Dict[str, float]:
        """Extract balance features."""
        features = {}
        
        # Calculate time spent on each foot
        left_dwell = 0.0
        right_dwell = 0.0
        total_dwell = 0.0
        
        for event in zone_events:
            foot_side = event.get("foot_side", "unknown")
            dwell = event.get("dwell_time", 0)
            
            if foot_side == "left":
                left_dwell += dwell
            elif foot_side == "right":
                right_dwell += dwell
            
            total_dwell += dwell
        
        if total_dwell > 0:
            if self.balance_config.get("left_balance", True):
                features["left_balance"] = left_dwell / total_dwell
            
            if self.balance_config.get("right_balance", True):
                features["right_balance"] = right_dwell / total_dwell
        else:
            features["left_balance"] = 0.5
            features["right_balance"] = 0.5
        
        return features
    
    def _extract_sequence_features(self, zone_events: List[Dict]) -> Dict[str, float]:
        """Extract sequence-based features."""
        features = {}
        
        if self.sequence_config.get("stance_width", True):
            # Estimate stance width based on zone diversity
            unique_zones = set(e.get("zone_id", "") for e in zone_events)
            # Simple heuristic: more diverse zones = wider stance
            features["stance_width"] = len(unique_zones) / 10.0  # Normalized
        
        return features
