"""
Synthetic smart mat simulator.

Generates zone activation events for footwork tracking simulation.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class MatZoneEvent:
    """Single zone activation event."""
    timestamp: float
    zone_id: str
    foot_side: str
    pressure_level: float
    dwell_time: float
    is_transition: bool


class MatSimulator:
    """
    Synthetic smart mat simulator.
    
    Generates zone activation sequences representing foot placement
    and movement across instrumented mat zones.
    """
    
    # Default zone configuration
    DEFAULT_ZONES = [
        "zone_A1",  # front-left
        "zone_A2",  # front-center
        "zone_A3",  # front-right
        "zone_B1",  # mid-left
        "zone_B2",  # mid-center
        "zone_B3",  # mid-right
        "zone_C1",  # back-left
        "zone_C2",  # back-center
        "zone_C3",  # back-right
    ]
    
    def __init__(self, config: Dict):
        """
        Initialize the mat simulator.
        
        Args:
            config: Configuration dictionary from simulation.yaml
        """
        self.config = config
        self.mat_config = config.get("mat", {})
        
        # Sampling parameters
        self.sampling_frequency = self.mat_config.get("sampling_frequency", 50)
        self.window_duration = self.mat_config.get("window_duration", 2.0)
        
        # Zone configuration
        self.zones = self.mat_config.get("zones", self.DEFAULT_ZONES)
        
        # Movement parameters
        self.movement_parameters = self.mat_config.get("movement_parameters", {})
        
        # Noise and uncertainty
        self.zone_detection_error_rate = self.mat_config.get("zone_detection_error_rate", 0.05)
        self.pressure_noise_std = self.mat_config.get("pressure_noise_std", 0.1)
        self.missing_zone_rate = self.mat_config.get("missing_zone_rate", 0.02)
    
    def _get_movement_params(self, movement_class: str) -> Dict:
        """
        Get movement-specific parameters.
        
        Args:
            movement_class: Type of movement
            
        Returns:
            Dictionary of movement parameters
        """
        return self.movement_parameters.get(movement_class, {
            "likely_zones": ["zone_B2"],
            "transition_probability": 0.3,
            "dwell_time_mean": 0.5
        })
    
    def _select_zone(
        self,
        likely_zones: List[str],
        rng: np.random.Generator
    ) -> str:
        """
        Select a zone based on likely zones for the movement.
        
        Args:
            likely_zones: List of likely zones
            rng: Random number generator
            
        Returns:
            Selected zone ID
        """
        # Higher probability for likely zones
        if rng.random() < 0.7:
            return rng.choice(likely_zones)
        else:
            # Random zone from all zones
            return rng.choice(self.zones)
    
    def _apply_zone_error(
        self,
        zone_id: str,
        rng: np.random.Generator
    ) -> str:
        """
        Apply zone detection error.
        
        Args:
            zone_id: True zone ID
            rng: Random number generator
            
        Returns:
            Possibly incorrect zone ID
        """
        if rng.random() < self.zone_detection_error_rate:
            # Return random different zone
            other_zones = [z for z in self.zones if z != zone_id]
            if other_zones:
                return rng.choice(other_zones)
        return zone_id
    
    def _generate_zone_sequence(
        self,
        movement_class: str,
        window_duration: float,
        rng: np.random.Generator
    ) -> List[MatZoneEvent]:
        """
        Generate a sequence of zone activations for a movement.
        
        Args:
            movement_class: Type of movement
            window_duration: Duration of the event window
            rng: Random number generator
            
        Returns:
            List of zone events
        """
        params = self._get_movement_params(movement_class)
        likely_zones = params.get("likely_zones", ["zone_B2"])
        transition_prob = params.get("transition_probability", 0.3)
        dwell_time_mean = params.get("dwell_time_mean", 0.5)
        
        events = []
        current_time = 0.0
        current_zone = self._select_zone(likely_zones, rng)
        
        while current_time < window_duration:
            # Generate dwell time
            dwell_time = rng.exponential(dwell_time_mean)
            dwell_time = min(dwell_time, window_duration - current_time)
            
            # Pressure level (normalized)
            pressure_level = rng.uniform(0.3, 1.0)
            pressure_level += rng.normal(0, self.pressure_noise_std)
            pressure_level = np.clip(pressure_level, 0, 1)
            
            # Foot side
            foot_side = rng.choice(["left", "right", "unknown"])
            
            # Apply zone detection error
            detected_zone = self._apply_zone_error(current_zone, rng)
            
            # Check for missing detection
            if rng.random() >= self.missing_zone_rate:
                event = MatZoneEvent(
                    timestamp=current_time,
                    zone_id=detected_zone,
                    foot_side=foot_side,
                    pressure_level=pressure_level,
                    dwell_time=dwell_time,
                    is_transition=(len(events) > 0)
                )
                events.append(event)
            
            current_time += dwell_time
            
            # Decide whether to transition
            if current_time < window_duration and rng.random() < transition_prob:
                current_zone = self._select_zone(likely_zones, rng)
        
        return events
    
    def generate_event(
        self,
        movement_class: str,
        rng: Optional[np.random.Generator] = None
    ) -> Tuple[List[Dict], np.ndarray, Dict]:
        """
        Generate mat zone events for a single movement.
        
        Args:
            movement_class: Type of movement
            rng: Random number generator
            
        Returns:
            Tuple of (events, timestamps, metadata)
            - events: List of zone event dictionaries
            - timestamps: Array of sample timestamps
            - metadata: Dictionary with event parameters
        """
        if rng is None:
            rng = np.random.default_rng()
        
        # Generate zone sequence
        zone_events = self._generate_zone_sequence(
            movement_class,
            self.window_duration,
            rng
        )
        
        # Convert to dictionaries
        events = [
            {
                "timestamp": event.timestamp,
                "zone_id": event.zone_id,
                "foot_side": event.foot_side,
                "pressure_level": event.pressure_level,
                "dwell_time": event.dwell_time,
                "is_transition": event.is_transition
            }
            for event in zone_events
        ]
        
        # Generate regular timestamps for sampling
        n_samples = int(self.sampling_frequency * self.window_duration)
        timestamps = np.linspace(0, self.window_duration, n_samples)
        
        # Metadata
        metadata = {
            "movement_class": movement_class,
            "n_zone_events": len(events),
            "n_transitions": sum(1 for e in events if e["is_transition"]),
            "sampling_frequency": self.sampling_frequency,
            "window_duration": self.window_duration
        }
        
        return events, timestamps, metadata
    
    def generate_batch(
        self,
        events: List[Dict],
        rng: Optional[np.random.Generator] = None
    ) -> List[Tuple[List[Dict], np.ndarray, Dict]]:
        """
        Generate multiple events.
        
        Args:
            events: List of event dictionaries with 'movement_class' key
            rng: Random number generator
            
        Returns:
            List of (events, timestamps, metadata) tuples
        """
        if rng is None:
            rng = np.random.default_rng()
        
        results = []
        for event in events:
            movement_class = event.get("movement_class", "no_action")
            zone_events, t, metadata = self.generate_event(movement_class, rng)
            metadata.update(event)
            results.append((zone_events, t, metadata))
        
        return results
