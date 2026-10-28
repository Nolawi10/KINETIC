"""
Robustness testing for models.

Tests model performance under various noise and perturbation conditions.
"""

import numpy as np
from typing import Dict, Optional
from sklearn.metrics import accuracy_score, f1_score


class RobustnessTester:
    """
    Test model robustness to noise, missing data, and perturbations.
    """
    
    def __init__(self, model, label_encoder):
        """
        Initialize robustness tester.
        
        Args:
            model: Trained model with predict method
            label_encoder: Label encoder for class names
        """
        self.model = model
        self.label_encoder = label_encoder
    
    def test_gaussian_noise(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        noise_levels: list = [0.01, 0.05, 0.1, 0.2]
    ) -> Dict:
        """
        Test robustness to Gaussian noise.
        
        Args:
            X_test: Test features
            y_test: Test labels
            noise_levels: List of noise standard deviations
            
        Returns:
            Dictionary of noise level -> accuracy
        """
        results = {}
        baseline_pred = self.model.predict(X_test)
        baseline_acc = accuracy_score(y_test, baseline_pred)
        results["baseline"] = baseline_acc
        
        for noise_level in noise_levels:
            np.random.seed(42)
            X_noisy = X_test + np.random.normal(0, noise_level, X_test.shape)
            pred = self.model.predict(X_noisy)
            acc = accuracy_score(y_test, pred)
            results[f"noise_{noise_level}"] = acc
        
        return results
    
    def test_missing_channels(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        feature_groups: Dict[str, list]
    ) -> Dict:
        """
        Test robustness to missing sensor modalities.
        
        Args:
            X_test: Test features
            y_test: Test labels
            feature_groups: Dictionary of modality -> feature indices
            
        Returns:
            Dictionary of missing modality -> accuracy
        """
        results = {}
        baseline_pred = self.model.predict(X_test)
        baseline_acc = accuracy_score(y_test, baseline_pred)
        results["baseline"] = baseline_acc
        
        for modality, indices in feature_groups.items():
            X_missing = X_test.copy()
            X_missing[:, indices] = 0  # Zero out features
            pred = self.model.predict(X_missing)
            acc = accuracy_score(y_test, pred)
            results[f"missing_{modality}"] = acc
        
        return results
    
    def test_scaling(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        scales: list = [0.5, 0.8, 1.2, 1.5]
    ) -> Dict:
        """
        Test robustness to feature scaling.
        
        Args:
            X_test: Test features
            y_test: Test labels
            scales: List of scaling factors
            
        Returns:
            Dictionary of scale -> accuracy
        """
        results = {}
        baseline_pred = self.model.predict(X_test)
        baseline_acc = accuracy_score(y_test, baseline_pred)
        results["baseline"] = baseline_acc
        
        for scale in scales:
            X_scaled = X_test * scale
            pred = self.model.predict(X_scaled)
            acc = accuracy_score(y_test, pred)
            results[f"scale_{scale}"] = acc
        
        return results
    
    def generate_robustness_report(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        feature_groups: Optional[Dict[str, list]] = None
    ) -> Dict:
        """
        Generate comprehensive robustness report.
        
        Args:
            X_test: Test features
            y_test: Test labels
            feature_groups: Feature groups for missing modality test
            
        Returns:
            Dictionary with all robustness results
        """
        report = {}
        
        # Gaussian noise test
        report["gaussian_noise"] = self.test_gaussian_noise(X_test, y_test)
        
        # Scaling test
        report["scaling"] = self.test_scaling(X_test, y_test)
        
        # Missing channels test (if feature groups provided)
        if feature_groups:
            report["missing_channels"] = self.test_missing_channels(
                X_test, y_test, feature_groups
            )
        
        return report
