"""
Drill selector for KINETIC coaching.

Selects appropriate drills based on athlete performance.
"""

import numpy as np
from typing import Dict, List, Optional


class DrillSelector:
    """
    Select training drills based on performance metrics.
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize drill selector.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        
        # Drill definitions
        self.drills = {
            "jab_accuracy": {
                "name": "Jab Accuracy Drill",
                "focus": "jab",
                "description": "Practice straight jabs to head and chest zones",
                "difficulty": "beginner",
                "n_repetitions": 20
            },
            "cross_power": {
                "name": "Cross Power Drill",
                "focus": "cross",
                "description": "Practice powerful cross punches",
                "difficulty": "intermediate",
                "n_repetitions": 15
            },
            "hook_technique": {
                "name": "Hook Technique Drill",
                "focus": "hook",
                "description": "Practice proper hook form and rotation",
                "difficulty": "intermediate",
                "n_repetitions": 15
            },
            "roundhouse_kick": {
                "name": "Roundhouse Kick Drill",
                "focus": "roundhouse_kick",
                "description": "Practice roundhouse kicks to body and head",
                "difficulty": "advanced",
                "n_repetitions": 10
            },
            "defensive_movement": {
                "name": "Defensive Movement Drill",
                "focus": "defensive_movement",
                "description": "Practice slips, blocks, and footwork",
                "difficulty": "beginner",
                "n_repetitions": 30
            },
            "footwork_agility": {
                "name": "Footwork Agility Drill",
                "focus": "footwork_movement",
                "description": "Practice stance, movement, and balance",
                "difficulty": "beginner",
                "n_repetitions": 40
            },
            "combination_work": {
                "name": "Combination Drill",
                "focus": "combination",
                "description": "Practice punch combinations",
                "difficulty": "intermediate",
                "n_repetitions": 20
            }
        }
    
    def select_drill(
        self,
        weak_areas: List[str],
        strong_areas: List[str],
        current_difficulty: str = "intermediate"
    ) -> Dict:
        """
        Select a drill based on performance.
        
        Args:
            weak_areas: List of weak movement classes
            strong_areas: List of strong movement classes
            current_difficulty: Current difficulty level
            
        Returns:
            Selected drill dictionary
        """
        # Prioritize weak areas
        if weak_areas:
            # Find drill matching weakest area
            for weak_area in weak_areas:
                for drill_id, drill in self.drills.items():
                    if drill["focus"] == weak_area:
                        return {
                            "drill_id": drill_id,
                            "reasoning": f"Focus on weak area: {weak_area}",
                            **drill
                        }
        
        # If no weak areas or no matching drill, select based on difficulty
        difficulty_drills = [
            (drill_id, drill)
            for drill_id, drill in self.drills.items()
            if drill["difficulty"] == current_difficulty
        ]
        
        if difficulty_drills:
            drill_id, drill = difficulty_drills[np.random.randint(len(difficulty_drills))]
            return {
                "drill_id": drill_id,
                "reasoning": f"Practice at {current_difficulty} level",
                **drill
            }
        
        # Fallback to beginner drill
        return {
            "drill_id": "jab_accuracy",
            "reasoning": "Default beginner drill",
            **self.drills["jab_accuracy"]
        }
    
    def get_drill_sequence(
        self,
        weak_areas: List[str],
        strong_areas: List[str],
        n_drills: int = 3
    ) -> List[Dict]:
        """
        Get a sequence of drills for a training session.
        
        Args:
            weak_areas: List of weak movement classes
            strong_areas: List of strong movement classes
            n_drills: Number of drills in sequence
            
        Returns:
            List of drill dictionaries
        """
        sequence = []
        used_drills = set()
        
        for i in range(n_drills):
            drill = self.select_drill(weak_areas, strong_areas)
            
            # Avoid repeating drills
            if drill["drill_id"] in used_drills:
                # Pick random unused drill
                unused_drills = [
                    drill_id for drill_id in self.drills.keys()
                    if drill_id not in used_drills
                ]
                if unused_drills:
                    drill_id = unused_drills[np.random.randint(len(unused_drills))]
                    drill = {
                        "drill_id": drill_id,
                        "reasoning": "Variety in training",
                        **self.drills[drill_id]
                    }
            
            sequence.append(drill)
            used_drills.add(drill["drill_id"])
        
        return sequence
    
    def adjust_difficulty(
        self,
        current_accuracy: float,
        current_difficulty: str
    ) -> str:
        """
        Adjust difficulty based on performance.
        
        Args:
            current_accuracy: Current accuracy level
            current_difficulty: Current difficulty level
            
        Returns:
            New difficulty level
        """
        difficulty_levels = ["beginner", "intermediate", "advanced"]
        current_idx = difficulty_levels.index(current_difficulty)
        
        if current_accuracy > 0.85:
            # Increase difficulty
            new_idx = min(current_idx + 1, len(difficulty_levels) - 1)
        elif current_accuracy < 0.6:
            # Decrease difficulty
            new_idx = max(current_idx - 1, 0)
        else:
            # Keep same difficulty
            new_idx = current_idx
        
        return difficulty_levels[new_idx]
