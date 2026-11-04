"""
Coaching engine for KINETIC.

Integrates performance tracking, real-time feedback, and adaptive drill selection.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime

from .drill_selector import DrillSelector
from .performance_tracker import PerformanceTracker


class CoachingEngine:
    """
    Adaptive coaching engine that evaluates athlete performance
    and generates personalized drill recommendations and feedback.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the coaching engine.

        Args:
            config: Optional configuration dictionary.
        """
        self.config = config or {}
        self.drill_selector = DrillSelector(self.config.get("drill_selector"))
        self.performance_tracker = PerformanceTracker()
        self.active_participant: Optional[str] = None
        self.session_active: bool = False

    def start_session(self, participant_id: str) -> None:
        """Start a coaching session for a participant."""
        self.active_participant = participant_id
        self.session_active = True
        self.performance_tracker.start_session(participant_id)

    def process_event(
        self,
        event_id: str,
        movement_class: str,
        target_zone: str,
        predicted_class: str,
        confidence: float,
        is_correct: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Process a movement/impact event and produce coaching feedback.

        Args:
            event_id: Unique event identifier.
            movement_class: True or expected movement class.
            target_zone: Targeted strike zone.
            predicted_class: Classifier prediction.
            confidence: Model confidence (0.0 to 1.0).
            is_correct: Optional correctness boolean; computed if omitted.

        Returns:
            Dictionary with immediate feedback and recommendations.
        """
        if is_correct is None:
            is_correct = (movement_class == predicted_class)

        if self.session_active:
            self.performance_tracker.record_event(
                event_id=event_id,
                movement_class=movement_class,
                target_zone=target_zone,
                predicted_class=predicted_class,
                confidence=confidence,
                is_correct=is_correct
            )

        feedback = self._generate_feedback(movement_class, predicted_class, confidence, is_correct)
        return feedback

    def _generate_feedback(
        self,
        movement_class: str,
        predicted_class: str,
        confidence: float,
        is_correct: bool
    ) -> Dict[str, Any]:
        """Generate tactical feedback based on event results."""
        if is_correct:
            if confidence > 0.85:
                note = f"Excellent execution on {movement_class.replace('_', ' ')}."
            else:
                note = f"Good {movement_class.replace('_', ' ')}. Maintain snap and guard recovery."
        else:
            note = f"Detected {predicted_class.replace('_', ' ')} instead of {movement_class.replace('_', ' ')}. Check stance balance and rotational speed."

        return {
            "success": is_correct,
            "confidence": round(confidence, 3),
            "movement": movement_class,
            "feedback": note,
            "timestamp": datetime.now().isoformat()
        }

    def recommend_next_drill(self, difficulty: str = "intermediate") -> Dict[str, Any]:
        """
        Recommend the next drill based on current performance tracking.
        """
        history = getattr(self.performance_tracker, "current_session", {})
        events = history.get("events", [])
        weak_areas: List[str] = []
        strong_areas: List[str] = []

        if events:
            class_correct: Dict[str, int] = {}
            class_total: Dict[str, int] = {}
            for e in events:
                m = e["movement_class"]
                class_total[m] = class_total.get(m, 0) + 1
                if e["is_correct"]:
                    class_correct[m] = class_correct.get(m, 0) + 1

            for m, total in class_total.items():
                acc = class_correct.get(m, 0) / total
                if acc < 0.6:
                    weak_areas.append(m)
                elif acc >= 0.8:
                    strong_areas.append(m)

        return self.drill_selector.select_drill(
            weak_areas=weak_areas,
            strong_areas=strong_areas,
            current_difficulty=difficulty
        )

    def end_session(self) -> Dict[str, Any]:
        """End the current session and return aggregated summary."""
        self.session_active = False
        self.performance_tracker.end_session()
        summary = getattr(self.performance_tracker, "current_session", {}).get("metrics", {})
        return summary
