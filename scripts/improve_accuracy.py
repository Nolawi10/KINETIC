"""
Improve model accuracy through hyperparameter tuning and ensemble methods.

This script implements advanced techniques to achieve >90% accuracy.
"""

import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    HistGradientBoostingClassifier,
    VotingClassifier,
    StackingClassifier
)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import f1_score, balanced_accuracy_score, classification_report
import joblib
import time

from kinetic.utils.logging import setup_logger, get_logger
from kinetic.models.hyperparameter_tuning import train_tuned_models

logger = get_logger(__name__)


def load_data(data_dir: Path):
    """Load and prepare data."""
    train_features = pd.read_csv(data_dir / "processed" / "extracted_features" / "train_features.csv")
    val_features = pd.read_csv(data_dir / "processed" / "extracted_features" / "validation_features.csv")
    test_features = pd.read_csv(data_dir / "processed" / "extracted_features" / "test_features.csv")
    
    # Separate features and labels
    label_col = 'movement_class'
    meta_cols = ['event_id', 'participant_id', 'session_id', 'movement_class', 'target_zone']
    
    feature_cols = [c for c in train_features.columns if c not in meta_cols]
    
    X_train = train_features[feature_cols].fillna(0).values
    y_train = train_features[label_col].values
    groups_train = train_features['participant_id'].values
    
    X_val = val_features[feature_cols].fillna(0).values
    y_val = val_features[label_col].values
    
    X_test = test_features[feature_cols].fillna(0).values
    y_test = test_features[label_col].values
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_train_enc = label_encoder.fit_transform(y_train)
    y_val_enc = label_encoder.transform(y_val)
    y_test_enc = label_encoder.transform(y_test)
    
    # Scale features (important for some models)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    return {
        'X_train': X_train,
        'X_train_scaled': X_train_scaled,
        'y_train': y_train_enc,
        'groups_train': groups_train,
        'X_val': X_val,
        'X_val_scaled': X_val_scaled,
        'y_val': y_val_enc,
        'X_test': X_test,
        'X_test_scaled': X_test_scaled,
        'y_test': y_test_enc,
        'label_encoder': label_encoder,
        'feature_cols': feature_cols
    }


def create_ensemble(tuned_models_dict):
    """Create ensemble models."""
    estimators = []
    
    if 'random_forest_tuned' in tuned_models_dict:
        estimators.append(('rf', tuned_models_dict['random_forest_tuned']['model']))
    
    if 'hist_gb_tuned' in tuned_models_dict:
        estimators.append(('hgb', tuned_models_dict['hist_gb_tuned']['model']))
    
    if 'extra_trees_tuned' in tuned_models_dict:
        estimators.append(('et', tuned_models_dict['extra_trees_tuned']['model']))
    
    if not estimators:
        logger.warning("No tuned models available for ensemble")
        return None
    
    # Voting Classifier (hard voting)
    voting_clf = VotingClassifier(
        estimators=estimators,
        voting='hard',
        n_jobs=-1
    )
    
    # Stacking Classifier
    stacking_clf = StackingClassifier(
        estimators=estimators,
        final_estimator=HistGradientBoostingClassifier(
            max_iter=100,
            max_depth=5,
            random_state=42
        ),
        n_jobs=-1
    )
    
    return {
        'voting': voting_clf,
        'stacking': stacking_clf
    }


def train_and_evaluate_ensemble(
    ensemble_dict,
    X_train,
    y_train,
    X_test,
    y_test,
    label_encoder
):
    """Train and evaluate ensemble models."""
    results = {}
    
    for name, model in ensemble_dict.items():
        logger.info(f"Training {name} ensemble...")
        
        start_time = time.time()
        model.fit(X_train, y_train)
        training_time = time.time() - start_time
        
        y_pred = model.predict(X_test)
        
        f1 = f1_score(y_test, y_pred, average='macro')
        bal_acc = balanced_accuracy_score(y_test, y_pred)
        
        results[name] = {
            'model': model,
            'training_time': training_time,
            'test_f1': f1,
            'test_balanced_accuracy': bal_acc
        }
        
        logger.info(f"{name.capitalize()} - Test F1: {f1:.4f}, Balanced Acc: {bal_acc:.4f}, Time: {training_time:.2f}s")
        
        # Print classification report
        logger.info(f"\nClassification Report for {name}:")
        logger.info(classification_report(
            y_test, y_pred,
            target_names=label_encoder.classes_,
            zero_division=0
        ))
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Improve model accuracy")
    parser.add_argument("--data_dir", type=str, default="kinetic_data",
                        help="Data directory")
    parser.add_argument("--n_trials", type=int, default=30,
                        help="Number of Optuna trials per model")
    parser.add_argument("--skip_tuning", action="store_true",
                        help="Skip hyperparameter tuning")
    
    args = parser.parse_args()
    
    setup_logger()
    
    data_dir = Path(args.data_dir)
    
    logger.info("Loading data...")
    data = load_data(data_dir)
    
    results_summary = []
    
    # Option 1: Hyperparameter tuning
    if not args.skip_tuning:
        logger.info("=" * 60)
        logger.info("PHASE 1: Hyperparameter Tuning")
        logger.info("=" * 60)
        
        tuned_results = train_tuned_models(
            data['X_train'],
            data['y_train'],
            data['groups_train'],
            data['X_val'],
            data['y_val'],
            data['X_test'],
            data['y_test'],
            n_trials=args.n_trials
        )
        
        for model_name, result in tuned_results.items():
            results_summary.append({
                'model': model_name,
                'macro_f1': result['test_f1'],
                'balanced_accuracy': result['test_balanced_accuracy'],
                'training_time': 0  # Not tracked in tuning
            })
            
            # Save tuned model
            model_path = Path(f"models/{model_name}.joblib")
            model_path.parent.mkdir(exist_ok=True)
            joblib.dump(result['model'], model_path)
            logger.info(f"Saved tuned model to {model_path}")
    
    # Option 2: Train strong baseline models without tuning
    else:
        logger.info("Skipping tuning, training strong baseline models...")
        
        # Train strong Random Forest
        rf = RandomForestClassifier(
            n_estimators=500,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        
        start_time = time.time()
        rf.fit(data['X_train'], data['y_train'])
        rf_time = time.time() - start_time
        
        rf_pred = rf.predict(data['X_test'])
        rf_f1 = f1_score(data['y_test'], rf_pred, average='macro')
        rf_bal_acc = balanced_accuracy_score(data['y_test'], rf_pred)
        
        tuned_results = {
            'random_forest_strong': {
                'model': rf,
                'test_f1': rf_f1,
                'test_balanced_accuracy': rf_bal_acc
            }
        }
        
        results_summary.append({
            'model': 'random_forest_strong',
            'macro_f1': rf_f1,
            'balanced_accuracy': rf_bal_acc,
            'training_time': rf_time
        })
        
        logger.info(f"Random Forest (strong) - Test F1: {rf_f1:.4f}, Balanced Acc: {rf_bal_acc:.4f}")
    
    # Option 3: Ensemble methods
    logger.info("=" * 60)
    logger.info("PHASE 2: Ensemble Methods")
    logger.info("=" * 60)
    
    ensemble_dict = create_ensemble(tuned_results)
    
    if ensemble_dict:
        ensemble_results = train_and_evaluate_ensemble(
            ensemble_dict,
            data['X_train'],
            data['y_train'],
            data['X_test'],
            data['y_test'],
            data['label_encoder']
        )
        
        for name, result in ensemble_results.items():
            results_summary.append({
                'model': f'ensemble_{name}',
                'macro_f1': result['test_f1'],
                'balanced_accuracy': result['test_balanced_accuracy'],
                'training_time': result['training_time']
            })
            
            # Save ensemble model
            model_path = Path(f"models/ensemble_{name}.joblib")
            joblib.dump(result['model'], model_path)
            logger.info(f"Saved ensemble model to {model_path}")
    
    # Save results
    results_df = pd.DataFrame(results_summary)
    results_df = results_df.sort_values('macro_f1', ascending=False)
    
    results_path = Path("results/metrics/improved_accuracy_results.csv")
    results_path.parent.mkdir(parents=True, exist_ok=True)
    results_df.to_csv(results_path, index=False)
    
    logger.info("=" * 60)
    logger.info("IMPROVED ACCURACY RESULTS")
    logger.info("=" * 60)
    print(results_df.to_string(index=False))
    logger.info("=" * 60)
    
    logger.info(f"Results saved to {results_path}")


if __name__ == "__main__":
    main()
