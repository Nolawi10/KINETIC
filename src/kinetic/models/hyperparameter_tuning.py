"""
Hyperparameter tuning for KINETIC models.

Uses Optuna for automated hyperparameter optimization to improve model accuracy.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import cross_val_score, GroupKFold
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier
from sklearn.metrics import f1_score, balanced_accuracy_score
import optuna
from typing import Dict, Any

from ..utils.logging import get_logger

logger = get_logger(__name__)


class HyperparameterTuner:
    """Hyperparameter tuning using Optuna."""
    
    def __init__(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        groups: np.ndarray,
        n_trials: int = 100,
        cv_folds: int = 5
    ):
        """
        Args:
            X_train: Training features
            y_train: Training labels
            groups: Group identifiers for cross-validation
            n_trials: Number of Optuna trials
            cv_folds: Number of cross-validation folds
        """
        self.X_train = X_train
        self.y_train = y_train
        self.groups = groups
        self.n_trials = n_trials
        self.cv_folds = cv_folds
        
    def objective_random_forest(self, trial: optuna.Trial) -> float:
        """Objective function for Random Forest."""
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 100, 500),
            'max_depth': trial.suggest_int('max_depth', 5, 30),
            'min_samples_split': trial.suggest_int('min_samples_split', 2, 10),
            'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 4),
            'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', None]),
            'class_weight': 'balanced',
            'random_state': 42,
            'n_jobs': -1
        }
        
        model = RandomForestClassifier(**params)
        
        # Group-aware cross-validation
        group_kfold = GroupKFold(n_splits=self.cv_folds)
        scores = cross_val_score(
            model, self.X_train, self.y_train,
            groups=self.groups,
            cv=group_kfold,
            scoring='f1_macro',
            n_jobs=-1
        )
        
        return scores.mean()
    
    def objective_hist_gb(self, trial: optuna.Trial) -> float:
        """Objective function for HistGradientBoosting."""
        params = {
            'max_iter': trial.suggest_int('max_iter', 100, 500),
            'max_depth': trial.suggest_int('max_depth', 5, 30),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
            'min_samples_leaf': trial.suggest_int('min_samples_leaf', 5, 30),
            'l2_regularization': trial.suggest_float('l2_regularization', 0.0, 1.0),
            'class_weight': 'balanced',
            'random_state': 42
        }
        
        model = HistGradientBoostingClassifier(**params)
        
        group_kfold = GroupKFold(n_splits=self.cv_folds)
        scores = cross_val_score(
            model, self.X_train, self.y_train,
            groups=self.groups,
            cv=group_kfold,
            scoring='f1_macro',
            n_jobs=-1
        )
        
        return scores.mean()
    
    def objective_extra_trees(self, trial: optuna.Trial) -> float:
        """Objective function for Extra Trees."""
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 100, 500),
            'max_depth': trial.suggest_int('max_depth', 5, 30),
            'min_samples_split': trial.suggest_int('min_samples_split', 2, 10),
            'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 4),
            'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', None]),
            'class_weight': 'balanced',
            'random_state': 42,
            'n_jobs': -1
        }
        
        model = ExtraTreesClassifier(**params)
        
        group_kfold = GroupKFold(n_splits=self.cv_folds)
        scores = cross_val_score(
            model, self.X_train, self.y_train,
            groups=self.groups,
            cv=group_kfold,
            scoring='f1_macro',
            n_jobs=-1
        )
        
        return scores.mean()
    
    def tune_random_forest(self) -> Dict[str, Any]:
        """Tune Random Forest hyperparameters."""
        logger.info("Starting Random Forest hyperparameter tuning...")
        
        study = optuna.create_study(direction='maximize')
        study.optimize(self.objective_random_forest, n_trials=self.n_trials)
        
        logger.info(f"Best trial: {study.best_trial.value}")
        logger.info(f"Best params: {study.best_params}")
        
        return {
            'best_params': study.best_params,
            'best_score': study.best_trial.value,
            'study': study
        }
    
    def tune_hist_gb(self) -> Dict[str, Any]:
        """Tune HistGradientBoosting hyperparameters."""
        logger.info("Starting HistGradientBoosting hyperparameter tuning...")
        
        study = optuna.create_study(direction='maximize')
        study.optimize(self.objective_hist_gb, n_trials=self.n_trials)
        
        logger.info(f"Best trial: {study.best_trial.value}")
        logger.info(f"Best params: {study.best_params}")
        
        return {
            'best_params': study.best_params,
            'best_score': study.best_trial.value,
            'study': study
        }
    
    def tune_extra_trees(self) -> Dict[str, Any]:
        """Tune Extra Trees hyperparameters."""
        logger.info("Starting Extra Trees hyperparameter tuning...")
        
        study = optuna.create_study(direction='maximize')
        study.optimize(self.objective_extra_trees, n_trials=self.n_trials)
        
        logger.info(f"Best trial: {study.best_trial.value}")
        logger.info(f"Best params: {study.best_params}")
        
        return {
            'best_params': study.best_params,
            'best_score': study.best_trial.value,
            'study': study
        }


def train_tuned_models(
    X_train: np.ndarray,
    y_train: np.ndarray,
    groups: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    n_trials: int = 50
) -> Dict[str, Any]:
    """
    Train models with tuned hyperparameters.
    
    Returns:
        Dictionary with model results
    """
    tuner = HyperparameterTuner(X_train, y_train, groups, n_trials=n_trials, cv_folds=3)
    
    results = {}
    
    # Tune Random Forest
    rf_result = tuner.tune_random_forest()
    rf_model = RandomForestClassifier(**rf_result['best_params'], random_state=42, n_jobs=-1)
    rf_model.fit(X_train, y_train)
    
    rf_pred = rf_model.predict(X_test)
    rf_f1 = f1_score(y_test, rf_pred, average='macro')
    rf_bal_acc = balanced_accuracy_score(y_test, rf_pred)
    
    results['random_forest_tuned'] = {
        'model': rf_model,
        'params': rf_result['best_params'],
        'cv_score': rf_result['best_score'],
        'test_f1': rf_f1,
        'test_balanced_accuracy': rf_bal_acc
    }
    
    logger.info(f"Random Forest (tuned) - Test F1: {rf_f1:.4f}, Balanced Acc: {rf_bal_acc:.4f}")
    
    # Tune HistGradientBoosting
    hgb_result = tuner.tune_hist_gb()
    hgb_model = HistGradientBoostingClassifier(**hgb_result['best_params'], random_state=42)
    hgb_model.fit(X_train, y_train)
    
    hgb_pred = hgb_model.predict(X_test)
    hgb_f1 = f1_score(y_test, hgb_pred, average='macro')
    hgb_bal_acc = balanced_accuracy_score(y_test, hgb_pred)
    
    results['hist_gb_tuned'] = {
        'model': hgb_model,
        'params': hgb_result['best_params'],
        'cv_score': hgb_result['best_score'],
        'test_f1': hgb_f1,
        'test_balanced_accuracy': hgb_bal_acc
    }
    
    logger.info(f"HistGradientBoosting (tuned) - Test F1: {hgb_f1:.4f}, Balanced Acc: {hgb_bal_acc:.4f}")
    
    # Tune Extra Trees
    et_result = tuner.tune_extra_trees()
    et_model = ExtraTreesClassifier(**et_result['best_params'], random_state=42, n_jobs=-1)
    et_model.fit(X_train, y_train)
    
    et_pred = et_model.predict(X_test)
    et_f1 = f1_score(y_test, et_pred, average='macro')
    et_bal_acc = balanced_accuracy_score(y_test, et_pred)
    
    results['extra_trees_tuned'] = {
        'model': et_model,
        'params': et_result['best_params'],
        'cv_score': et_result['best_score'],
        'test_f1': et_f1,
        'test_balanced_accuracy': et_bal_acc
    }
    
    logger.info(f"Extra Trees (tuned) - Test F1: {et_f1:.4f}, Balanced Acc: {et_bal_acc:.4f}")
    
    return results
