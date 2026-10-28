"""
Sensor-vision fusion for KINETIC.

Implements fusion strategies for combining sensor and pose data.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.base import BaseEstimator, ClassifierMixin


class SensorVisionFusion:
    """
    Fuse sensor and vision predictions.
    """
    
    def __init__(self, config: Dict):
        """
        Initialize fusion module.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.fusion_config = config.get("fusion", {})
        self.fusion_strategy = self.fusion_config.get("strategy", "decision_level")
    
    def fuse_predictions(
        self,
        sensor_predictions: np.ndarray,
        sensor_confidences: Optional[np.ndarray] = None,
        vision_predictions: Optional[np.ndarray] = None,
        vision_confidences: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Fuse sensor and vision predictions.
        
        Args:
            sensor_predictions: Sensor model predictions
            sensor_confidences: Sensor model confidences
            vision_predictions: Vision model predictions
            vision_confidences: Vision model confidences
            
        Returns:
            Fused predictions
        """
        if vision_predictions is None:
            # Sensor-only
            return sensor_predictions
        
        if self.fusion_strategy == "decision_level":
            return self._decision_level_fusion(
                sensor_predictions, vision_predictions
            )
        elif self.fusion_strategy == "confidence_weighted":
            return self._confidence_weighted_fusion(
                sensor_predictions, sensor_confidences,
                vision_predictions, vision_confidences
            )
        elif self.fusion_strategy == "rule_based":
            return self._rule_based_fusion(
                sensor_predictions, vision_predictions
            )
        else:
            raise ValueError(f"Unknown fusion strategy: {self.fusion_strategy}")
    
    def _decision_level_fusion(
        self,
        sensor_predictions: np.ndarray,
        vision_predictions: np.ndarray
    ) -> np.ndarray:
        """
        Decision-level fusion (majority vote).
        
        Args:
            sensor_predictions: Sensor predictions
            vision_predictions: Vision predictions
            
        Returns:
            Fused predictions
        """
        # Simple majority vote
        fused = []
        for s_pred, v_pred in zip(sensor_predictions, vision_predictions):
            if s_pred == v_pred:
                fused.append(s_pred)
            else:
                # If disagree, use sensor (assume sensor is more reliable)
                fused.append(s_pred)
        
        return np.array(fused)
    
    def _confidence_weighted_fusion(
        self,
        sensor_predictions: np.ndarray,
        sensor_confidences: Optional[np.ndarray],
        vision_predictions: np.ndarray,
        vision_confidences: Optional[np.ndarray]
    ) -> np.ndarray:
        """
        Confidence-weighted fusion.
        
        Args:
            sensor_predictions: Sensor predictions
            sensor_confidences: Sensor confidences
            vision_predictions: Vision predictions
            vision_confidences: Vision confidences
            
        Returns:
            Fused predictions
        """
        if sensor_confidences is None:
            sensor_confidences = np.ones(len(sensor_predictions)) * 0.5
        if vision_confidences is None:
            vision_confidences = np.ones(len(vision_predictions)) * 0.5
        
        fused = []
        for s_pred, s_conf, v_pred, v_conf in zip(
            sensor_predictions, sensor_confidences,
            vision_predictions, vision_confidences
        ):
            if s_conf > v_conf:
                fused.append(s_pred)
            else:
                fused.append(v_pred)
        
        return np.array(fused)
    
    def _rule_based_fusion(
        self,
        sensor_predictions: np.ndarray,
        vision_predictions: np.ndarray
    ) -> np.ndarray:
        """
        Rule-based fusion.
        
        Args:
            sensor_predictions: Sensor predictions
            vision_predictions: Vision predictions
            
        Returns:
            Fused predictions
        """
        # Rule: Use vision for certain movements, sensor for others
        # This is a simplified example
        fused = []
        
        for s_pred, v_pred in zip(sensor_predictions, vision_predictions):
            # For kicks, trust vision more
            if v_pred in [3]:  # Assuming index 3 is roundhouse_kick
                fused.append(v_pred)
            else:
                fused.append(s_pred)
        
        return np.array(fused)


class LearnedFusionClassifier(BaseEstimator, ClassifierMixin):
    """
    Learned fusion using a meta-classifier.
    """
    
    def __init__(
        self,
        sensor_model: BaseEstimator,
        vision_model: Optional[BaseEstimator] = None,
        meta_classifier: Optional[BaseEstimator] = None
    ):
        """
        Initialize learned fusion classifier.
        
        Args:
            sensor_model: Sensor model
            vision_model: Vision model (optional)
            meta_classifier: Meta-classifier for fusion
        """
        self.sensor_model = sensor_model
        self.vision_model = vision_model
        self.meta_classifier = meta_classifier or RandomForestClassifier(
            n_estimators=100, random_state=42
        )
        self.fitted = False
    
    def fit(
        self,
        X_sensor: np.ndarray,
        y: np.ndarray,
        X_vision: Optional[np.ndarray] = None
    ):
        """
        Fit the fusion classifier.
        
        Args:
            X_sensor: Sensor features
            y: Labels
            X_vision: Vision features (optional)
        """
        # Fit base models
        self.sensor_model.fit(X_sensor, y)
        
        if self.vision_model is not None and X_vision is not None:
            self.vision_model.fit(X_vision, y)
        
        # Get predictions from base models
        sensor_proba = self.sensor_model.predict_proba(X_sensor)
        
        if self.vision_model is not None and X_vision is not None:
            vision_proba = self.vision_model.predict_proba(X_vision)
            meta_features = np.hstack([sensor_proba, vision_proba])
        else:
            meta_features = sensor_proba
        
        # Fit meta-classifier
        self.meta_classifier.fit(meta_features, y)
        self.fitted = True
        
        return self
    
    def predict(
        self,
        X_sensor: np.ndarray,
        X_vision: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Predict using fusion.
        
        Args:
            X_sensor: Sensor features
            X_vision: Vision features (optional)
            
        Returns:
            Predictions
        """
        if not self.fitted:
            raise ValueError("Classifier not fitted")
        
        # Get predictions from base models
        sensor_proba = self.sensor_model.predict_proba(X_sensor)
        
        if self.vision_model is not None and X_vision is not None:
            vision_proba = self.vision_model.predict_proba(X_vision)
            meta_features = np.hstack([sensor_proba, vision_proba])
        else:
            meta_features = sensor_proba
        
        return self.meta_classifier.predict(meta_features)
    
    def predict_proba(
        self,
        X_sensor: np.ndarray,
        X_vision: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Predict probabilities using fusion.
        
        Args:
            X_sensor: Sensor features
            X_vision: Vision features (optional)
            
        Returns:
            Predicted probabilities
        """
        if not self.fitted:
            raise ValueError("Classifier not fitted")
        
        # Get predictions from base models
        sensor_proba = self.sensor_model.predict_proba(X_sensor)
        
        if self.vision_model is not None and X_vision is not None:
            vision_proba = self.vision_model.predict_proba(X_vision)
            meta_features = np.hstack([sensor_proba, vision_proba])
        else:
            meta_features = sensor_proba
        
        return self.meta_classifier.predict_proba(meta_features)
