"""
Train neural network models (1D-CNN and MLP).

This script trains neural network models on the synthetic data and compares them
with the baseline models.
"""

import argparse
import numpy as np
import pandas as pd
import torch
import yaml
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, f1_score, balanced_accuracy_score
import time
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from kinetic.utils.logging import setup_logger, get_logger
from kinetic.utils.config import load_config
from kinetic.preprocessing import prepare_neural_data
from kinetic.models import (
    train_1d_cnn,
    train_mlp,
    NeuralModelTrainer
)

logger = get_logger(__name__)


def load_splits(data_dir: Path) -> tuple:
    """Load train/validation/test splits."""
    train_df = pd.read_csv(data_dir / "splits" / "train.csv")
    val_df = pd.read_csv(data_dir / "splits" / "validation.csv")
    test_df = pd.read_csv(data_dir / "splits" / "test.csv")
    
    return train_df, val_df, test_df


def train_and_evaluate_cnn(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    data_dir: Path,
    config: dict,
    random_state: int = 42
) -> dict:
    """Train and evaluate 1D-CNN."""
    logger.info("=" * 60)
    logger.info("Training 1D-CNN")
    logger.info("=" * 60)
    
    piezo_dir = data_dir / "raw" / "piezo"
    imu_dir = data_dir / "raw" / "imu"
    
    # Prepare data
    logger.info("Preparing training data...")
    X_train, y_train, y_train_orig, train_ids = prepare_neural_data(
        train_df, piezo_dir, imu_dir,
        window_samples=config.get('window_samples', 500),
        include_imu=config.get('include_imu', True)
    )
    
    logger.info("Preparing validation data...")
    X_val, y_val, y_val_orig, val_ids = prepare_neural_data(
        val_df, piezo_dir, imu_dir,
        window_samples=config.get('window_samples', 500),
        include_imu=config.get('include_imu', True)
    )
    
    logger.info("Preparing test data...")
    X_test, y_test, y_test_orig, test_ids = prepare_neural_data(
        test_df, piezo_dir, imu_dir,
        window_samples=config.get('window_samples', 500),
        include_imu=config.get('include_imu', True)
    )
    
    if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
        logger.error("Failed to prepare data for 1D-CNN")
        return {
            'model': '1d_cnn',
            'macro_f1': np.nan,
            'balanced_accuracy': np.nan,
            'training_time': np.nan,
            'error': 'No valid data'
        }
    
    n_classes = len(np.unique(y_train))
    logger.info(f"Training samples: {len(X_train)}")
    logger.info(f"Validation samples: {len(X_val)}")
    logger.info(f"Test samples: {len(X_test)}")
    logger.info(f"Classes: {n_classes}")
    logger.info(f"Input shape: {X_train.shape}")
    
    # Train model
    start_time = time.time()
    
    cnn_config = {
        'conv_channels': config.get('conv_channels', [32, 64, 128]),
        'kernel_sizes': config.get('kernel_sizes', [5, 5, 3]),
        'dropout': config.get('dropout', 0.3),
        'learning_rate': config.get('learning_rate', 0.001),
        'batch_size': config.get('batch_size', 32),
        'max_epochs': config.get('max_epochs', 100),
        'patience': config.get('patience', 10)
    }
    
    model, history = train_1d_cnn(
        X_train, y_train,
        X_val, y_val,
        n_classes=n_classes,
        config=cnn_config,
        random_state=random_state
    )
    
    training_time = time.time() - start_time
    
    # Evaluate on test set
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    trainer = NeuralModelTrainer(model, device=device)
    
    y_pred = trainer.predict(X_test)
    
    macro_f1 = f1_score(y_test, y_pred, average='macro')
    balanced_acc = balanced_accuracy_score(y_test, y_pred)
    
    logger.info(f"1D-CNN Test Macro F1: {macro_f1:.4f}")
    logger.info(f"1D-CNN Test Balanced Accuracy: {balanced_acc:.4f}")
    logger.info(f"1D-CNN Training Time: {training_time:.2f}s")
    
    # Save model
    model_dir = Path("models")
    model_dir.mkdir(exist_ok=True)
    torch.save(model.state_dict(), model_dir / "1d_cnn.pth")
    logger.info(f"Model saved to {model_dir / '1d_cnn.pth'}")
    
    return {
        'model': '1d_cnn',
        'macro_f1': macro_f1,
        'balanced_accuracy': balanced_acc,
        'training_time': training_time
    }


def train_and_evaluate_mlp(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    data_dir: Path,
    config: dict,
    random_state: int = 42
) -> dict:
    """Train and evaluate MLP on engineered features."""
    logger.info("=" * 60)
    logger.info("Training MLP on Engineered Features")
    logger.info("=" * 60)
    
    # Load engineered features
    features_dir = data_dir / "processed" / "extracted_features"
    
    train_features = pd.read_csv(features_dir / "train_features.csv")
    val_features = pd.read_csv(features_dir / "validation_features.csv")
    test_features = pd.read_csv(features_dir / "test_features.csv")
    
    # Separate features and labels
    label_col = 'movement_class'
    meta_cols = ['event_id', 'participant_id', 'session_id', 'movement_class', 'target_zone']
    
    feature_cols = [c for c in train_features.columns if c not in meta_cols]
    
    X_train = train_features[feature_cols].fillna(0).values
    y_train = train_features[label_col].values
    
    X_val = val_features[feature_cols].fillna(0).values
    y_val = val_features[label_col].values
    
    X_test = test_features[feature_cols].fillna(0).values
    y_test = test_features[label_col].values
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_train_enc = label_encoder.fit_transform(y_train)
    y_val_enc = label_encoder.transform(y_val)
    y_test_enc = label_encoder.transform(y_test)
    
    n_classes = len(label_encoder.classes_)
    logger.info(f"Training samples: {len(X_train)}")
    logger.info(f"Validation samples: {len(X_val)}")
    logger.info(f"Test samples: {len(X_test)}")
    logger.info(f"Classes: {n_classes}")
    logger.info(f"Features: {len(feature_cols)}")
    
    # Train model
    start_time = time.time()
    
    mlp_config = {
        'hidden_layers': config.get('hidden_layers', [128, 64]),
        'dropout': config.get('dropout', 0.3),
        'learning_rate': config.get('learning_rate', 0.001),
        'batch_size': config.get('batch_size', 32),
        'max_epochs': config.get('max_epochs', 100),
        'patience': config.get('patience', 10)
    }
    
    model, history = train_mlp(
        X_train, y_train_enc,
        X_val, y_val_enc,
        n_classes=n_classes,
        config=mlp_config,
        random_state=random_state
    )
    
    training_time = time.time() - start_time
    
    # Evaluate on test set
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    trainer = NeuralModelTrainer(model, device=device)
    
    y_pred = trainer.predict(X_test)
    
    macro_f1 = f1_score(y_test_enc, y_pred, average='macro')
    balanced_acc = balanced_accuracy_score(y_test_enc, y_pred)
    
    logger.info(f"MLP Test Macro F1: {macro_f1:.4f}")
    logger.info(f"MLP Test Balanced Accuracy: {balanced_acc:.4f}")
    logger.info(f"MLP Training Time: {training_time:.2f}s")
    
    # Save model
    model_dir = Path("models")
    model_dir.mkdir(exist_ok=True)
    torch.save(model.state_dict(), model_dir / "mlp.pth")
    logger.info(f"Model saved to {model_dir / 'mlp.pth'}")
    
    return {
        'model': 'mlp',
        'macro_f1': macro_f1,
        'balanced_accuracy': balanced_acc,
        'training_time': training_time
    }


def main():
    parser = argparse.ArgumentParser(description="Train neural network models")
    parser.add_argument("--config", type=str, default="configs/experiments.yaml",
                        help="Path to config file")
    parser.add_argument("--data_dir", type=str, default="kinetic_data",
                        help="Data directory")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed")
    parser.add_argument("--cnn", action="store_true",
                        help="Train 1D-CNN")
    parser.add_argument("--mlp", action="store_true",
                        help="Train MLP")
    
    args = parser.parse_args()
    
    setup_logger()
    
    # Load config
    config = load_config(args.config)
    logger.info(f"Configuration loaded from {args.config}")
    
    # Set random seed
    from kinetic.utils.random import set_seed
    set_seed(args.seed)
    logger.info(f"Random seed: {args.seed}")
    
    data_dir = Path(args.data_dir)
    
    # Load splits
    train_df, val_df, test_df = load_splits(data_dir)
    
    results = []
    
    # Train models
    if args.cnn:
        cnn_config = config.get('neural_models', {}).get('cnn', {})
        try:
            cnn_result = train_and_evaluate_cnn(
                train_df, val_df, test_df, data_dir, cnn_config, args.seed
            )
            results.append(cnn_result)
        except Exception as e:
            logger.error(f"Failed to train CNN: {e}")
    
    if args.mlp:
        mlp_config = config.get('neural_models', {}).get('mlp', {})
        try:
            mlp_result = train_and_evaluate_mlp(
                train_df, val_df, test_df, data_dir, mlp_config, args.seed
            )
            results.append(mlp_result)
        except Exception as e:
            logger.error(f"Failed to train MLP: {e}")
    
    # If no specific model selected, train both
    if not args.cnn and not args.mlp:
        cnn_config = config.get('neural_models', {}).get('cnn', {})
        mlp_config = config.get('neural_models', {}).get('mlp', {})
        
        try:
            cnn_result = train_and_evaluate_cnn(
                train_df, val_df, test_df, data_dir, cnn_config, args.seed
            )
            results.append(cnn_result)
        except Exception as e:
            logger.error(f"Failed to train CNN: {e}")
        
        try:
            mlp_result = train_and_evaluate_mlp(
                train_df, val_df, test_df, data_dir, mlp_config, args.seed
            )
            results.append(mlp_result)
        except Exception as e:
            logger.error(f"Failed to train MLP: {e}")
    
    # Save results
    if results:
        results_df = pd.DataFrame(results)
        results_path = Path("results/metrics/neural_model_comparison.csv")
        results_path.parent.mkdir(parents=True, exist_ok=True)
        results_df.to_csv(results_path, index=False)
        logger.info(f"Neural model comparison saved to {results_path}")
        
        logger.info("\n" + "=" * 60)
        logger.info("Neural Model Comparison Summary")
        logger.info("=" * 60)
        for result in results:
            logger.info(f"{result['model']}:")
            logger.info(f"  Macro F1: {result['macro_f1']:.4f}")
            logger.info(f"  Balanced Accuracy: {result['balanced_accuracy']:.4f}")
            logger.info(f"  Training Time: {result['training_time']:.2f}s")
        logger.info("=" * 60)
    
    logger.info("Neural model training complete")


if __name__ == "__main__":
    main()
