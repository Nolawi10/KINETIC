"""
Model factory for creating ML models.

Provides a unified interface for creating different model types
with consistent configuration.
"""

import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from typing import Dict, Any, Optional
import warnings

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    warnings.warn("XGBoost not available")

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    warnings.warn("LightGBM not available")


class ModelFactory:
    """
    Factory for creating machine learning models.
    """
    
    @staticmethod
    def create_model(model_name: str, config: Dict[str, Any], n_classes: int) -> Any:
        """
        Create a model instance.
        
        Args:
            model_name: Name of the model to create
            config: Model configuration dictionary
            n_classes: Number of target classes
            
        Returns:
            Model instance
        """
        model_config = config.get("models", {}).get(model_name, {})
        
        if not model_config.get("enabled", True):
            raise ValueError(f"Model {model_name} is not enabled")
        
        if model_name == "dummy":
            return ModelFactory._create_dummy(model_config)
        
        elif model_name == "logistic_regression":
            return ModelFactory._create_logistic_regression(model_config)
        
        elif model_name == "knn":
            return ModelFactory._create_knn(model_config)
        
        elif model_name == "svm":
            return ModelFactory._create_svm(model_config)
        
        elif model_name == "decision_tree":
            return ModelFactory._create_decision_tree(model_config)
        
        elif model_name == "random_forest":
            return ModelFactory._create_random_forest(model_config)
        
        elif model_name == "extra_trees":
            return ModelFactory._create_extra_trees(model_config)
        
        elif model_name == "xgboost":
            return ModelFactory._create_xgboost(model_config, n_classes)
        
        elif model_name == "lightgbm":
            return ModelFactory._create_lightgbm(model_config, n_classes)
        
        elif model_name == "hist_gradient_boosting":
            return ModelFactory._create_hist_gradient_boosting(model_config)
        
        else:
            raise ValueError(f"Unknown model: {model_name}")
    
    @staticmethod
    def _create_dummy(config: Dict) -> DummyClassifier:
        """Create DummyClassifier."""
        return DummyClassifier(
            strategy=config.get("strategy", "stratified"),
            random_state=config.get("random_state", 42)
        )
    
    @staticmethod
    def _create_logistic_regression(config: Dict) -> LogisticRegression:
        """Create LogisticRegression."""
        return LogisticRegression(
            C=config.get("C", 1.0),
            max_iter=config.get("max_iter", 1000),
            class_weight=config.get("class_weight", "balanced"),
            random_state=config.get("random_state", 42),
            n_jobs=-1
        )
    
    @staticmethod
    def _create_knn(config: Dict) -> KNeighborsClassifier:
        """Create KNeighborsClassifier."""
        return KNeighborsClassifier(
            n_neighbors=config.get("n_neighbors", 5),
            weights=config.get("weights", "uniform"),
            n_jobs=-1
        )
    
    @staticmethod
    def _create_svm(config: Dict) -> SVC:
        """Create SVC."""
        return SVC(
            C=config.get("C", 1.0),
            kernel=config.get("kernel", "rbf"),
            class_weight=config.get("class_weight", "balanced"),
            probability=True,
            random_state=config.get("random_state", 42)
        )
    
    @staticmethod
    def _create_decision_tree(config: Dict) -> DecisionTreeClassifier:
        """Create DecisionTreeClassifier."""
        max_depth = config.get("max_depth")
        if max_depth is None or max_depth == "None":
            max_depth = None
        
        return DecisionTreeClassifier(
            max_depth=max_depth,
            class_weight=config.get("class_weight", "balanced"),
            random_state=config.get("random_state", 42)
        )
    
    @staticmethod
    def _create_random_forest(config: Dict) -> RandomForestClassifier:
        """Create RandomForestClassifier."""
        max_depth = config.get("max_depth")
        if max_depth is None or max_depth == "None":
            max_depth = None
        
        return RandomForestClassifier(
            n_estimators=config.get("n_estimators", 300),
            max_depth=max_depth,
            class_weight=config.get("class_weight", "balanced"),
            random_state=config.get("random_state", 42),
            n_jobs=config.get("n_jobs", -1)
        )
    
    @staticmethod
    def _create_extra_trees(config: Dict) -> ExtraTreesClassifier:
        """Create ExtraTreesClassifier."""
        max_depth = config.get("max_depth")
        if max_depth is None or max_depth == "None":
            max_depth = None
        
        return ExtraTreesClassifier(
            n_estimators=config.get("n_estimators", 300),
            max_depth=max_depth,
            class_weight=config.get("class_weight", "balanced"),
            random_state=config.get("random_state", 42),
            n_jobs=config.get("n_jobs", -1)
        )
    
    @staticmethod
    def _create_xgboost(config: Dict, n_classes: int) -> Any:
        """Create XGBoost classifier."""
        if not XGBOOST_AVAILABLE:
            raise ImportError("XGBoost is not installed")
        
        return xgb.XGBClassifier(
            n_estimators=config.get("n_estimators", 300),
            max_depth=config.get("max_depth", 4),
            learning_rate=config.get("learning_rate", 0.05),
            subsample=config.get("subsample", 0.8),
            colsample_bytree=config.get("colsample_bytree", 0.8),
            objective=config.get("objective", "multi:softprob"),
            eval_metric=config.get("eval_metric", "mlogloss"),
            tree_method=config.get("tree_method", "hist"),
            random_state=config.get("random_state", 42),
            n_jobs=config.get("n_jobs", -1)
        )
    
    @staticmethod
    def _create_lightgbm(config: Dict, n_classes: int) -> Any:
        """Create LightGBM classifier."""
        if not LIGHTGBM_AVAILABLE:
            raise ImportError("LightGBM is not installed")
        
        return lgb.LGBMClassifier(
            n_estimators=config.get("n_estimators", 300),
            max_depth=config.get("max_depth", 4),
            learning_rate=config.get("learning_rate", 0.05),
            subsample=config.get("subsample", 0.8),
            colsample_bytree=config.get("colsample_bytree", 0.8),
            objective=config.get("objective", "multiclass"),
            random_state=config.get("random_state", 42),
            n_jobs=config.get("n_jobs", -1),
            verbose=-1
        )
    
    @staticmethod
    def _create_hist_gradient_boosting(config: Dict) -> HistGradientBoostingClassifier:
        """Create HistGradientBoostingClassifier."""
        max_depth = config.get("max_depth")
        if max_depth is None or max_depth == "None":
            max_depth = None
        
        return HistGradientBoostingClassifier(
            max_iter=config.get("max_iter", 300),
            max_depth=max_depth,
            class_weight=config.get("class_weight", "balanced"),
            random_state=config.get("random_state", 42)
        )
    
    @staticmethod
    def create_mlp(config: Dict, input_dim: int, n_classes: int):
        """Create MLP classifier (PyTorch)."""
        if not PYTORCH_AVAILABLE:
            raise ImportError("PyTorch is not installed")
        
        from .neural_models import MLPClassifier
        
        hidden_dims = config.get("hidden_dims", [128, 64])
        dropout = config.get("dropout", 0.3)
        
        return MLPClassifier(
            input_dim=input_dim,
            hidden_dims=hidden_dims,
            n_classes=n_classes,
            dropout=dropout
        )
    
    @staticmethod
    def get_available_models() -> list:
        """Get list of available model names."""
        models = [
            "dummy",
            "logistic_regression",
            "knn",
            "svm",
            "decision_tree",
            "random_forest",
            "extra_trees",
            "hist_gradient_boosting"
        ]
        
        if XGBOOST_AVAILABLE:
            models.append("xgboost")
        
        if LIGHTGBM_AVAILABLE:
            models.append("lightgbm")
        
        return models
