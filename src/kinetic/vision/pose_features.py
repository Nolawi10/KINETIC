"""
Pose feature extraction for KINETIC.

Extracts features from pose landmarks for movement classification.
"""

import numpy as np
from typing import Dict, List, Optional


class PoseFeatureExtractor:
    """
    Extract features from pose landmarks.
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize pose feature extractor.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        
        # MediaPipe pose landmark indices
        # https://google.github.io/mediapipe/solutions/pose.html
        self.landmark_indices = {
            'nose': 0,
            'left_eye': 1,
            'right_eye': 2,
            'left_ear': 3,
            'right_ear': 4,
            'left_shoulder': 5,
            'right_shoulder': 6,
            'left_elbow': 7,
            'right_elbow': 8,
            'left_wrist': 9,
            'right_wrist': 10,
            'left_hip': 11,
            'right_hip': 12,
            'left_knee': 13,
            'right_knee': 14,
            'left_ankle': 15,
            'right_ankle': 16,
        }
    
    def extract_features(self, pose_data: Dict) -> Dict[str, float]:
        """
        Extract features from pose data.
        
        Args:
            pose_data: Pose data from pose estimator
            
        Returns:
            Dictionary of feature names and values
        """
        landmarks = pose_data['landmarks']
        keypoints = np.array([[l['x'], l['y'], l['z']] for l in landmarks])
        
        features = {}
        
        # Joint angles
        features.update(self._extract_joint_angles(keypoints))
        
        # Limb lengths
        features.update(self._extract_limb_lengths(keypoints))
        
        # Body orientation
        features.update(self._extract_body_orientation(keypoints))
        
        # Movement velocity (if temporal data available)
        # features.update(self._extract_velocity(keypoints))
        
        return features
    
    def _extract_joint_angles(self, keypoints: np.ndarray) -> Dict[str, float]:
        """Extract joint angles from keypoints."""
        angles = {}
        
        # Left elbow angle
        left_shoulder = keypoints[self.landmark_indices['left_shoulder']]
        left_elbow = keypoints[self.landmark_indices['left_elbow']]
        left_wrist = keypoints[self.landmark_indices['left_wrist']]
        angles['left_elbow_angle'] = self._calculate_angle(left_shoulder, left_elbow, left_wrist)
        
        # Right elbow angle
        right_shoulder = keypoints[self.landmark_indices['right_shoulder']]
        right_elbow = keypoints[self.landmark_indices['right_elbow']]
        right_wrist = keypoints[self.landmark_indices['right_wrist']]
        angles['right_elbow_angle'] = self._calculate_angle(right_shoulder, right_elbow, right_wrist)
        
        # Left knee angle
        left_hip = keypoints[self.landmark_indices['left_hip']]
        left_knee = keypoints[self.landmark_indices['left_knee']]
        left_ankle = keypoints[self.landmark_indices['left_ankle']]
        angles['left_knee_angle'] = self._calculate_angle(left_hip, left_knee, left_ankle)
        
        # Right knee angle
        right_hip = keypoints[self.landmark_indices['right_hip']]
        right_knee = keypoints[self.landmark_indices['right_knee']]
        right_ankle = keypoints[self.landmark_indices['right_ankle']]
        angles['right_knee_angle'] = self._calculate_angle(right_hip, right_knee, right_ankle)
        
        return angles
    
    def _extract_limb_lengths(self, keypoints: np.ndarray) -> Dict[str, float]:
        """Extract limb lengths from keypoints."""
        lengths = {}
        
        # Left arm length
        left_shoulder = keypoints[self.landmark_indices['left_shoulder']]
        left_wrist = keypoints[self.landmark_indices['left_wrist']]
        lengths['left_arm_length'] = np.linalg.norm(left_wrist - left_shoulder)
        
        # Right arm length
        right_shoulder = keypoints[self.landmark_indices['right_shoulder']]
        right_wrist = keypoints[self.landmark_indices['right_wrist']]
        lengths['right_arm_length'] = np.linalg.norm(right_wrist - right_shoulder)
        
        # Left leg length
        left_hip = keypoints[self.landmark_indices['left_hip']]
        left_ankle = keypoints[self.landmark_indices['left_ankle']]
        lengths['left_leg_length'] = np.linalg.norm(left_ankle - left_hip)
        
        # Right leg length
        right_hip = keypoints[self.landmark_indices['right_hip']]
        right_ankle = keypoints[self.landmark_indices['right_ankle']]
        lengths['right_leg_length'] = np.linalg.norm(right_ankle - right_hip)
        
        return lengths
    
    def _extract_body_orientation(self, keypoints: np.ndarray) -> Dict[str, float]:
        """Extract body orientation features."""
        orientation = {}
        
        # Shoulder width
        left_shoulder = keypoints[self.landmark_indices['left_shoulder']]
        right_shoulder = keypoints[self.landmark_indices['right_shoulder']]
        orientation['shoulder_width'] = np.linalg.norm(right_shoulder - left_shoulder)
        
        # Hip width
        left_hip = keypoints[self.landmark_indices['left_hip']]
        right_hip = keypoints[self.landmark_indices['right_hip']]
        orientation['hip_width'] = np.linalg.norm(right_hip - left_hip)
        
        # Torso height
        torso_center = (left_shoulder + right_shoulder + left_hip + right_hip) / 4
        orientation['torso_height'] = torso_center[1]  # Y coordinate
        
        return orientation
    
    def _calculate_angle(self, a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
        """
        Calculate angle at point b formed by points a-b-c.
        
        Args:
            a: First point
            b: Vertex point
            c: Third point
            
        Returns:
            Angle in radians
        """
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
        
        angle = np.arccos(cosine_angle)
        return angle
