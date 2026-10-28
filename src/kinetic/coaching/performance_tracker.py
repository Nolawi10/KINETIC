"""
Performance tracking for KINETIC coaching.

Tracks athlete performance metrics over time.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime


class PerformanceTracker:
    """
    Track athlete performance metrics.
    """
    
    def __init__(self):
        """Initialize performance tracker."""
        self.session_history = []
        self.current_session = {
            "timestamp": None,
            "events": [],
            "metrics": {}
        }
    
    def start_session(self, participant_id: str):
        """
        Start a new training session.
        
        Args:
            participant_id: Participant identifier
        """
        self.current_session = {
            "timestamp": datetime.now(),
            "participant_id": participant_id,
            "events": [],
            "metrics": {}
        }
    
    def record_event(
        self,
        event_id: str,
        movement_class: str,
        target_zone: str,
        predicted_class: str,
        confidence: float,
        is_correct: bool
    ):
        """
        Record an event in the current session.
        
        Args:
            event_id: Event identifier
            movement_class: True movement class
            target_zone: Target zone
            predicted_class: Predicted movement class
            confidence: Prediction confidence
            is_correct: Whether prediction was correct
        """
        self.current_session["events"].append({
            "event_id": event_id,
            "movement_class": movement_class,
            "target_zone": target_zone,
            "predicted_class": predicted_class,
            "confidence": confidence,
            "is_correct": is_correct
        })
    
    def end_session(self):
        """End the current session and calculate metrics."""
        events = self.current_session["events"]
        
        if not events:
            return
        
        # Calculate session metrics
        n_events = len(events)
        n_correct = sum(e["is_correct"] for e in events)
        accuracy = n_correct / n_events if n_events > 0 else 0
        
        # Per-class accuracy
        class_counts = {}
        class_correct = {}
        
        for event in events:
            movement = event["movement_class"]
            class_counts[movement] = class_counts.get(movement, 0) + 1
            if event["is_correct"]:
                class_correct[movement] = class_correct.get(movement, 0) + 1
        
        per_class_accuracy = {}
        for movement in class_counts:
            per_class_accuracy[movement] = class_correct.get(movement, 0) / class_counts[movement]
        
        # Average confidence
        avg_confidence = np.mean([e["confidence"] for e in events])
        
        self.current_session["metrics"] = {
            "n_events": n_events,
            "accuracy": accuracy,
            "per_class_accuracy": per_class_accuracy,
            "avg_confidence": avg_confidence
        }
        
        # Add to history
        self.session_history.append(self.current_session.copy())
    
    def get_performance_summary(self) -> Dict:
        """
        Get overall performance summary.
        
        Returns:
            Dictionary with performance metrics
        """
        if not self.session_history:
            return {}
        
        total_events = sum(s["metrics"]["n_events"] for s in self.session_history)
        total_correct = sum(
            s["metrics"]["accuracy"] * s["metrics"]["n_events"]
            for s in self.session_history
        )
        overall_accuracy = total_correct / total_events if total_events > 0 else 0
        
        # Average per-class accuracy
        all_class_accuracies = {}
        for session in self.session_history:
            for movement, acc in session["metrics"]["per_class_accuracy"].items():
                if movement not in all_class_accuracies:
                    all_class_accuracies[movement] = []
                all_class_accuracies[movement].append(acc)
        
        avg_per_class = {
            movement: np.mean(accs)
            for movement, accs in all_class_accuracies.items()
        }
        
        return {
            "total_sessions": len(self.session_history),
            "total_events": total_events,
            "overall_accuracy": overall_accuracy,
            "avg_per_class_accuracy": avg_per_class
        }
    
    def get_weak_areas(self, threshold: float = 0.5) -> List[str]:
        """
        Identify weak areas (movements with low accuracy).
        
        Args:
            threshold: Accuracy threshold for weak area detection
            
        Returns:
            List of movement classes below threshold
        """
        summary = self.get_performance_summary()
        weak_areas = []
        
        for movement, acc in summary.get("avg_per_class_accuracy", {}).items():
            if acc < threshold:
                weak_areas.append(movement)
        
        return weak_areas
    
    def get_strong_areas(self, threshold: float = 0.8) -> List[str]:
        """
        Identify strong areas (movements with high accuracy).
        
        Args:
            threshold: Accuracy threshold for strong area detection
            
        Returns:
            List of movement classes above threshold
        """
        summary = self.get_performance_summary()
        strong_areas = []
        
        for movement, acc in summary.get("avg_per_class_accuracy", {}).items():
            if acc >= threshold:
                strong_areas.append(movement)
        
        return strong_areas
