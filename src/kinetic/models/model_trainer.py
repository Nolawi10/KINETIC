"""
 model trainer for KINETIC.

Handles training, evaluation, and comparison of multiple models.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import cross_val_score
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score,
    precision_recall_fscore_support, confusion_matrix
)
from sklearn.preprocessing import LabelEncoder
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import joblib
import warnings

from .model_factory import ModelFactory


class ModelTrainer:
    """
    Train and evaluate machine learning models.
    """
    
    def __init__(self, config: Dict):
        """
        Initialize the model trainer.
        
        Args:
            config: Configuration dictionary from experiments.yaml
        """
        self.config = config
        self.model_factory = ModelFactory()
        
        # Feature configuration
        self.feature_config = config.get("features", {})
        self.exclude_columns = self.feature_config.get("exclude_columns", [])
        
        # Training configuration
        self.training_config = config.get("training", {})
        self.random_state = self.training_config.get("random_state", 42)
        
        # Metrics configuration
        self.metrics_config = config.get("metrics", {})
        
        # Output configuration
        self.output_config = config.get("output", {})
        self.models_dir = Path(self.output_config.get("models_dir", "models"))
        self.predictions_dir = Path(self.output_config.get("predictions_dir", "results/predictions"))
        self.metrics_dir = Path(self.output_config.get("metrics_dir", "results/metrics"))
        
        # Create output directories
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.predictions_dir.mkdir(parents=True, exist_ok=True)
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
    
    def prepare_data(
        self,
        features_df: pd.DataFrame,
        target_column: str = "movement_class"
    ) -> Tuple[np.ndarray, np.ndarray, LabelEncoder, List[str]]:
        """
        Prepare features and target for training.
        
        Args:
            features_df: Features DataFrame
            target_column: Name of target column
            
        Returns:
            Tuple of (X, y, label_encoder, feature_names)
        """
        # Separate features and target
        X = features_df.drop(columns=self.exclude_columns + [target_column])
        y = features_df[target_column]
        
        # Get feature names
        feature_names = X.columns.tolist()
        
        # Handle NaN values - fill with 0
        X = X.fillna(0)
        
        # Convert to numpy arrays
        X = X.values
        
        # Encode labels
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y)
        
        return X, y_encoded, label_encoder, feature_names
    
    def train_model(
        self,
        model_name: str,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None
    ) -> Tuple[Any, Dict]:
        """
        Train a single model.
        
        Args:
            model_name: Name of the model to train
            X_train: Training features
            y_train: Training labels
            X_val: Validation features (optional)
            y_val: Validation labels (optional)
            
        Returns:
            Tuple of (trained_model, training_metadata)
        """
        # Get number of classes
        n_classes = len(np.unique(y_train))
        
        # Create model
        model = self.model_factory.create_model(model_name, self.config, n_classes)
        
        # Train model
        import time
        start_time = time.time()
        
        model.fit(X_train, y_train)
        
        training_time = time.time() - start_time
        
        # Validation score if validation data provided
        val_score = None
        if X_val is not None and y_val is not None:
            val_score = model.score(X_val, y_val)
        
        # Metadata
        metadata = {
            "model_name": model_name,
            "training_time": training_time,
            "validation_score": val_score,
            "n_classes": n_classes,
            "n_samples": len(y_train)
        }
        
        return model, metadata
    
    def evaluate_model(
        self,
        model: Any,
        X_test: np.ndarray,
        y_test: np.ndarray,
        label_encoder: LabelEncoder
    ) -> Dict[str, Any]:
        """
        Evaluate a trained model.
        
        Args:
            model: Trained model
            X_test: Test features
            y_test: Test labels
            label_encoder: Label encoder for class names
            
        Returns:
            Dictionary of evaluation metrics
        """
        # Predict
        y_pred = model.predict(X_test)
        
        # Get probabilities if available
        try:
            y_proba = model.predict_proba(X_test)
        except:
            y_proba = None
        
        # Calculate metrics
        metrics = {}
        
        if self.metrics_config.get("accuracy", True):
            metrics["accuracy"] = accuracy_score(y_test, y_pred)
        
        if self.metrics_config.get("balanced_accuracy", True):
            metrics["balanced_accuracy"] = balanced_accuracy_score(y_test, y_pred)
        
        # Macro metrics
        precision, recall, f1, support = precision_recall_fscore_support(
            y_test, y_pred, average='macro', zero_division=0
        )
        
        if self.metrics_config.get("macro_precision", True):
            metrics["macro_precision"] = precision
        if self.metrics_config.get("macro_recall", True):
            metrics["macro_recall"] = recall
        if self.metrics_config.get("macro_f1", True):
            metrics["macro_f1"] = f1
        
        # Weighted F1
        if self.metrics_config.get("weighted_f1", True):
            _, _, weighted_f1, _ = precision_recall_fscore_support(
                y_test, y_pred, average='weighted', zero_division=0
            )
            metrics["weighted_f1"] = weighted_f1
        
        # Per-class metrics
        if self.metrics_config.get("per_class_precision", True) or \
           self.metrics_config.get("per_class_recall", True) or \
           self.metrics_config.get("per_class_f1", True):
            per_class_precision, per_class_recall, per_class_f1, _ = \
                precision_recall_fscore_support(y_test, y_pred, average=None, zero_division=0)
            
            class_names = label_encoder.classes_
            
            if self.metrics_config.get("per_class_precision", True):
                for i, class_name in enumerate(class_names):
                    metrics[f"precision_{class_name}"] = per_class_precision[i]
            
            if self.metrics_config.get("per_class_recall", True):
                for i, class_name in enumerate(class_names):
                    metrics[f"recall_{class_name}"] = per_class_recall[i]
            
            if self.metrics_config.get("per_class_f1", True):
                for i, class_name in enumerate(class_names):
                    metrics[f"f1_{class_name}"] = per_class_f1[i]
        
        # Confusion matrix
        if self.metrics_config.get("confusion_matrix", True):
            metrics["confusion_matrix"] = confusion_matrix(y_test, y_pred)
        
        return metrics
    
    def train_and_evaluate_models(
        self,
        train_features_df: pd.DataFrame,
        val_features_df: pd.DataFrame,
        test_features_df: pd.DataFrame,
        target_column: str = "movement_class",
        model_names: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Train and evaluate multiple models.
        
        Args:
            train_features_df: Training features DataFrame
            val_features_df: Validation features DataFrame
            test_features_df: Test features DataFrame
            target_column: Name of target column
            model_names: List of model names to train (None for all enabled)
            
        Returns:
            DataFrame with model comparison results
        """
        # Prepare data
        X_train, y_train, label_encoder, feature_names = self.prepare_data(
            train_features_df, target_column
        )
        X_val, y_val, _, _ = self.prepare_data(val_features_df, target_column)
        X_test, y_test, _, _ = self.prepare_data(test_features_df, target_column)
        
        # Determine which models to train
        if model_names is None:
            model_names = self.model_factory.get_available_models()
        
        # Filter by enabled models
        enabled_models = []
        for model_name in model_names:
            model_config = self.config.get("models", {}).get(model_name, {})
            if model_config.get("enabled", True):
                enabled_models.append(model_name)
        
        results = []
        
        for model_name in enabled_models:
            print(f"\nTraining {model_name}...")
            
            try:
                # Train model
                model, train_metadata = self.train_model(
                    model_name, X_train, y_train, X_val, y_val
                )
                
                # Evaluate model
                test_metrics = self.evaluate_model(model, X_test, y_test, label_encoder)
                
                # Combine results
                result = {
                    "model_name": model_name,
                    **train_metadata,
                    **test_metrics
                }
                results.append(result)
                
                # Save model
                if self.output_config.get("save_models", True):
                    model_path = self.models_dir / f"{model_name}.joblib"
                    joblib.dump(model, model_path)
                    print(f"  Model saved to {model_path}")
                
                # Save predictions
                if self.output_config.get("save_predictions", True):
                    y_pred = model.predict(X_test)
                    predictions_df = pd.DataFrame({
                        "true_label": label_encoder.inverse_transform(y_test),
                        "predicted_label": label_encoder.inverse_transform(y_pred),
                        "model_name": model_name
                    })
                    pred_path = self.predictions_dir / f"{model_name}_predictions.csv"
                    predictions_df.to_csv(pred_path, index=False)
                
                print(f"  Macro F1: {test_metrics.get('macro_f1', 0):.4f}")
                print(f"  Balanced Accuracy: {test_metrics.get('balanced_accuracy', 0):.4f}")
                
            except Exception as e:
                warnings.warn(f"Failed to train {model_name}: {e}")
                results.append({
                    "model_name": model_name,
                    "error": str(e)
                })
        
        # Create results DataFrame
        results_df = pd.DataFrame(results)
        
        # Save results
        results_path = self.metrics_dir / "model_comparison.csv"
        results_df.to_csv(results_path, index=False)
        print(f"\nModel comparison saved to {results_path}")
        
        return results_df
